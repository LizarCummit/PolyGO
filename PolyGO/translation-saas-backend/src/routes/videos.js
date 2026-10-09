const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { authenticateUser } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { processVideo, addWatermark, addTextOverlay, extractAudio } = require('../services/videoProcessing');

// Get video categories
router.get('/categories', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('video_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create video category
router.post('/categories', authenticateUser, async (req, res) => {
  try {
    const { name, description } = req.body;
    const { data, error } = await supabase
      .from('video_categories')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Get video tags
router.get('/tags', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('video_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create video tag
router.post('/tags', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabase
      .from('video_tags')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update video metadata
router.put('/:id/metadata', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category_id, tags } = req.body;

    // Update video metadata
    const { error: updateError } = await supabase
      .from('media_content')
      .update({
        title,
        description,
        category_id,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Update tags if provided
    if (tags) {
      // Delete existing tag relations
      const { error: deleteError } = await supabase
        .from('video_tag_relations')
        .delete()
        .eq('video_id', id);

      if (deleteError) throw deleteError;

      // Insert new tag relations
      if (tags.length > 0) {
        const { error: insertError } = await supabase
          .from('video_tag_relations')
          .insert(
            tags.map((tag_id) => ({
              video_id: id,
              tag_id,
            }))
          );

        if (insertError) throw insertError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating video metadata:', error);
    res.status(500).json({ error: 'Failed to update video metadata' });
  }
});

// Track video progress
router.post('/:id/progress', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { watch_time, last_position, completed } = req.body;
    const user_id = req.user.id;

    const { data, error } = await supabase
      .from('video_analytics')
      .upsert(
        {
          video_id: id,
          user_id,
          watch_time,
          last_position,
          completed,
        },
        { onConflict: 'video_id,user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error tracking video progress:', error);
    res.status(500).json({ error: 'Failed to track video progress' });
  }
});

// Create video share
router.post('/:id/share', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { password, expires_at, max_views } = req.body;
    const user_id = req.user.id;

    let password_hash = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('video_shares')
      .insert({
        video_id: id,
        created_by: user_id,
        password_hash,
        expires_at,
        max_views,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error creating video share:', error);
    res.status(500).json({ error: 'Failed to create video share' });
  }
});

// Get video share
router.get('/share/:share_id', async (req, res) => {
  try {
    const { share_id } = req.params;
    const { password } = req.query;

    // Get share details
    const { data: share, error: shareError } = await supabase
      .from('video_shares')
      .select('*, media_content(*)')
      .eq('id', share_id)
      .single();

    if (shareError) throw shareError;

    // Check if share is expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share has expired' });
    }

    // Check if max views reached
    if (share.max_views && share.current_views >= share.max_views) {
      return res.status(410).json({ error: 'Maximum views reached' });
    }

    // Check password if required
    if (share.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Password required' });
      }

      const validPassword = await bcrypt.compare(password, share.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Increment view count
    const { error: updateError } = await supabase
      .from('video_shares')
      .update({ current_views: share.current_views + 1 })
      .eq('id', share_id);

    if (updateError) throw updateError;

    res.json(share);
  } catch (error) {
    console.error('Error accessing video share:', error);
    res.status(500).json({ error: 'Failed to access video share' });
  }
});

// Search videos
router.get('/search', authenticateUser, async (req, res) => {
  try {
    const { query, category_id, tags } = req.query;
    let queryBuilder = supabase
      .from('media_content')
      .select(`
        *,
        video_categories (*),
        video_tag_relations (
          video_tags (*)
        )
      `)
      .eq('type', 'video');

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (category_id) {
      queryBuilder = queryBuilder.eq('category_id', category_id);
    }

    if (tags) {
      const tagIds = tags.split(',');
      queryBuilder = queryBuilder.in('video_tag_relations.tag_id', tagIds);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: 'Failed to search videos' });
  }
});

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/videos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, WebM, and QuickTime videos are allowed.'));
    }
  }
});

// Process video
router.post('/process', authenticateUser, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { quality, format, watermark, textOverlay } = req.body;
    const options = {
      quality: quality || 'medium',
      format: format || 'webm',
      watermark: watermark ? JSON.parse(watermark) : undefined,
      textOverlay: textOverlay ? JSON.parse(textOverlay) : undefined,
    };

    const processedVideoPath = await processVideo(req.file.path, options);
    res.json({ success: true, videoPath: processedVideoPath });
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

// Extract audio
router.post('/extract-audio', authenticateUser, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { format } = req.body;
    const audioPath = await extractAudio(req.file.path, format || 'mp3');
    res.json({ success: true, audioPath });
  } catch (error) {
    console.error('Error extracting audio:', error);
    res.status(500).json({ error: 'Failed to extract audio' });
  }
});

// Clean up uploaded files
router.delete('/:filename', authenticateUser, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../uploads/videos', req.params.filename);
    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router; 