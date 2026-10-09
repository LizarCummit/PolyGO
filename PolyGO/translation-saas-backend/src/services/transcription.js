const { Storage } = require('@google-cloud/storage');
const { OpenAI } = require('openai');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_MIME_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg'
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

async function validateAudioFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Check file type
  const allowedTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push('Invalid file type. Only audio and video files are allowed.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function processAudio(file, filename) {
  try {
    // Upload file to Google Cloud Storage
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype
      }
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Error uploading to GCS:', error);
        reject({ success: false, error: 'Failed to upload file' });
      });

      blobStream.on('finish', async () => {
        // Make the file public
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve({ success: true, url: publicUrl });
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return { success: false, error: 'Failed to process audio file' };
  }
}

async function transcribeAudio(audioUrl, language = 'en') {
  try {
    // Download the audio file
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json'
    });

    return {
      success: true,
      transcription: transcription.segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        words: segment.words || []
      }))
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return { success: false, error: 'Failed to transcribe audio' };
  }
}

async function saveLectureData(lectureId, data) {
  try {
    const { error } = await supabase
      .from('lectures')
      .update({
        title: data.title,
        description: data.description,
        audio_url: data.audioUrl,
        duration: data.duration,
        language: data.language,
        transcription: data.transcription,
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', lectureId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error saving lecture data:', error);
    return { success: false, error: 'Failed to save lecture data' };
  }
}

module.exports = {
  validateAudioFile,
  processAudio,
  transcribeAudio,
  saveLectureData
}; 