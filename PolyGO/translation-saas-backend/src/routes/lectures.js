const express = require('express');
const router = express.Router();
const multer = require('multer');
const { validateAudioFile, processAudio, transcribeAudio, saveLectureData } = require('../services/transcription');
const { generateSummary, extractKeyPoints, saveLectureAnalysis } = require('../services/ai-analysis');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for memory storage with file filtering
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio and video files are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter
});

// Middleware to verify user authentication
async function authenticateUser(req, res, next) {
  // Check if we're in development mode and if the user has a special header
  const isDevelopmentMode = process.env.NODE_ENV === 'development';
  const hasDevBypass = req.headers['x-dev-bypass'] === 'true';
  
  // If in development mode and has the bypass header, allow access
  if (isDevelopmentMode && hasDevBypass) {
    // Set a mock user for development
    req.user = {
      id: 'dev-user-id',
      email: 'dev@example.com',
      user_metadata: {
        full_name: 'Development User'
      }
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Upload and process lecture
router.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate request body
    if (!req.body.title || req.body.title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Validate the uploaded file
    const validation = await validateAudioFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname);
    const filename = `${req.user.id}/${timestamp}${fileExtension}`;

    // Process and upload the audio file
    const processResult = await processAudio(req.file, filename);
    if (!processResult.success) {
      return res.status(500).json({ error: processResult.error });
    }

    // Save initial lecture data
    const lectureData = {
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      audioUrl: processResult.url,
      duration: 0, // Will be updated after transcription
      language: req.body.language || 'en', // Get language from request
      status: 'processing'
    };

    // Save initial lecture record
    const { data: lecture, error: saveError } = await supabase
      .from('lectures')
      .insert([{ ...lectureData, user_id: req.user.id }])
      .select()
      .single();

    if (saveError) {
      console.error('Error saving lecture:', saveError);
      return res.status(500).json({ error: 'Failed to save lecture data' });
    }

    // Start transcription with language
    const transcriptionResult = await transcribeAudio(processResult.url, lectureData.language);
    if (!transcriptionResult.success) {
      // Update lecture status to failed
      await supabase
        .from('lectures')
        .update({ status: 'failed', error: transcriptionResult.error })
        .eq('id', lecture.id);

      return res.status(500).json({ error: transcriptionResult.error });
    }

    // Calculate duration from transcription
    const lastWord = transcriptionResult.transcription[transcriptionResult.transcription.length - 1]?.words.slice(-1)[0];
    lectureData.duration = Math.ceil(lastWord?.endTime || 0);

    // Save lecture data with transcription
    const saveResult = await saveLectureData(lecture.id, {
      ...lectureData,
      transcription: transcriptionResult.transcription,
      status: 'transcribed'
    });

    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error });
    }

    // Start AI analysis in the background
    generateSummary(lecture.id, transcriptionResult.transcription)
      .then(summary => extractKeyPoints(lecture.id, summary))
      .then(keyPoints => saveLectureAnalysis(lecture.id, { summary, keyPoints }))
      .catch(error => {
        console.error('Error in AI analysis:', error);
        // Update lecture status to indicate partial success
        supabase
          .from('lectures')
          .update({ status: 'partially_processed', error: 'AI analysis failed' })
          .eq('id', lecture.id);
      });

    // Return success response with lecture ID
    res.status(200).json({
      id: lecture.id,
      message: 'Lecture uploaded successfully',
      status: 'processing'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Get lecture details
router.get('/:lectureId', authenticateUser, async (req, res) => {
  try {
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select(`
        *,
        lecture_segments (*),
        lecture_analysis (*)
      `)
      .eq('id', req.params.lectureId)
      .eq('user_id', req.user.id)
      .single();

    if (lectureError) throw lectureError;
    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    res.json(lecture);
  } catch (error) {
    console.error('Error fetching lecture:', error);
    res.status(500).json({ error: 'Failed to fetch lecture details' });
  }
});

// Get all lectures for user
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: lectures, error } = await supabase
      .from('lectures')
      .select(`
        id,
        title,
        description,
        duration,
        created_at,
        lecture_analysis (summary)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(lectures);
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ error: 'Failed to fetch lectures' });
  }
});

module.exports = router; 