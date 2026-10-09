// ========== Core Dependencies ========== //
require('dotenv').config(); // Load environment variables from .env file
const express = require('express'); // Web framework for Node.js
const cors = require('cors'); // Enable CORS for cross-origin requests
const multer = require('multer'); // Middleware for handling file uploads
const bodyParser = require('body-parser'); // Middleware to parse JSON requests
const { execFile } = require('child_process'); // Run FFmpeg without going through a shell
const { Storage } = require('@google-cloud/storage'); // Google Cloud Storage client
const speech = require('@google-cloud/speech'); // Google Cloud Speech-to-Text client
const { Translate } = require('@google-cloud/translate').v2; // Google Cloud Translation API
const WebSocket = require('ws'); // WebSockets for real-time streaming
const OpenAI = require('openai'); // OpenAI client for AI-generated responses
const path = require('path'); // Work with file paths

// ========== Configuration Setup ========== //
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_PROJECT_ID; // Google Cloud project ID
// Credentials are NOT stored in the repo. Set GOOGLE_APPLICATION_CREDENTIALS to the path of a
// service-account key file kept outside version control; the Google clients pick it up automatically.
const BUCKET_NAME = process.env.GOOGLE_BUCKET_NAME || 'polygo_storage'; // Cloud Storage bucket name

// ========== AI Service Configuration ========== //
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai', // Can be 'deepseek' or 'openai'
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo'
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  }
};

// ========== Initialize Google Cloud Clients ========== //
const storage = new Storage({ projectId: GOOGLE_CLOUD_PROJECT_ID });
const speechClient = new speech.SpeechClient({ projectId: GOOGLE_CLOUD_PROJECT_ID });
const translateClient = new Translate({ projectId: GOOGLE_CLOUD_PROJECT_ID });

// AI Client (Choose OpenAI or DeepSeek)
const aiClient = new OpenAI(AI_CONFIG.provider === 'deepseek' ? {
  baseURL: AI_CONFIG.deepseek.baseURL,
  apiKey: AI_CONFIG.deepseek.apiKey
} : {
  apiKey: AI_CONFIG.openai.apiKey
});

// ========== Express Application Setup ========== //
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' })); // Only allow our own frontend
app.use(bodyParser.json({ limit: '50mb' })); // Increase JSON body size limit

// ========== File Upload Configuration ========== //
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // Limit file size to 50MB
});

// ========== Audio Conversion Utility (FFmpeg) ========== //
const convertToWav = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Arguments are passed as an array (no shell), so file names can never be interpreted as commands
    execFile('ffmpeg', ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', outputPath], (error, stdout, stderr) => {
      error ? reject(new Error(`FFmpeg error: ${stderr}`)) : resolve(outputPath);
    });
  });
};

// ========== AI Explanation Endpoint ========== //
app.post('/explain', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Valid query is required' });
    }

    // Generate concise explanation
    const prompt = `Explain "${query}" in simple terms suitable for a student. Keep it under 150 words.`;

    // Get AI response
    const completion = await aiClient.chat.completions.create({
      model: AI_CONFIG[AI_CONFIG.provider].model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const explanation = completion.choices[0].message.content;
    res.json({ explanation });

  } catch (error) {
    console.error('AI Service Error:', error);
    res.status(error.status || 500).json({ error: 'Failed to generate explanation', details: error.message });
  }
});

// ========== Lecture Analysis Endpoints (used by the dashboard) ========== //
// The AI provider key stays on the server: the browser only ever calls these routes.
const MAX_TRANSCRIPT_CHARS = 30000;

const askAI = async (system, user, { maxTokens = 1000 } = {}) => {
  const completion = await aiClient.chat.completions.create({
    model: AI_CONFIG[AI_CONFIG.provider].model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.3,
    max_tokens: maxTokens
  });
  return completion.choices[0].message.content;
};

// Models sometimes wrap JSON in markdown fences, so strip them before parsing
const parseJsonReply = (text) => JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());

app.post('/ai/key-points', async (req, res) => {
  try {
    const { transcription } = req.body;
    if (typeof transcription !== 'string' || !transcription.trim() || transcription.length > MAX_TRANSCRIPT_CHARS) {
      return res.status(400).json({ error: `transcription must be a non-empty string under ${MAX_TRANSCRIPT_CHARS} characters` });
    }
    const reply = await askAI(
      'You are an expert at analyzing lecture transcripts and extracting key points. For each key point, provide the text and its importance score (1-10).',
      `Please analyze this lecture transcript and extract the key points. Format your response as a JSON array of objects with "text" and "confidence" properties:\n\n${transcription}`
    );
    res.json({ keyPoints: parseJsonReply(reply) });
  } catch (error) {
    console.error('Key point extraction error:', error);
    res.status(500).json({ error: 'Failed to extract key points' });
  }
});

app.post('/ai/summary', async (req, res) => {
  try {
    const { keyPoints } = req.body;
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
      return res.status(400).json({ error: 'keyPoints must be a non-empty array' });
    }
    const summary = await askAI(
      'You are an expert at summarizing lecture content based on key points. Create a concise but comprehensive summary.',
      `Please create a summary based on these key points:\n\n${JSON.stringify(keyPoints, null, 2)}`,
      { maxTokens: 500 }
    );
    res.json({ summary });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.post('/ai/relations', async (req, res) => {
  try {
    const { keyPoints } = req.body;
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
      return res.status(400).json({ error: 'keyPoints must be a non-empty array' });
    }
    const reply = await askAI(
      'Analyze the relationships between key points and identify main topics. Return a JSON object with "topics" array and "relationships" array containing connections between key points.',
      `Analyze these key points and their relationships:\n\n${JSON.stringify(keyPoints, null, 2)}`
    );
    res.json(parseJsonReply(reply));
  } catch (error) {
    console.error('Relationship analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze key point relations' });
  }
});

// ========== Speech-to-Text Endpoint ========== //
app.post('/speech-to-text', upload.single('audioFile'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No audio file uploaded' });

    const tempOutputPath = `uploads/${Date.now()}_converted.wav`;
    await convertToWav(file.path, tempOutputPath);

    // Upload audio file to Google Cloud Storage
    const bucket = storage.bucket(BUCKET_NAME);
    const gcsFileName = `uploads/${Date.now()}_converted.wav`;
    await bucket.upload(tempOutputPath, { destination: gcsFileName });

    // Convert speech to text
    const [operation] = await speechClient.longRunningRecognize({
      audio: { uri: `gs://${BUCKET_NAME}/${gcsFileName}` },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000, 
        languageCode: 'en-US',
        enableAutomaticPunctuation: true
      }
    });

    const [response] = await operation.promise();
    const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
    res.json({ transcription });

  } catch (error) {
    console.error('Speech-to-Text Error:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

// ========== Translation Endpoint ========== //
app.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) return res.status(400).json({ error: 'Invalid request' });

    const [translation] = await translateClient.translate(text, targetLanguage);
    res.json({ translation });

  } catch (error) {
    console.error('Translation Error:', error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
});

// ========== WebSocket Server Setup ========== //
const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  let recognizeStream = null;

  ws.on('message', (audioData) => {
    if (!recognizeStream) {
      recognizeStream = speechClient.streamingRecognize({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
        interimResults: true,
      });

      recognizeStream.on('data', (data) => {
        const transcript = data.results[0]?.alternatives[0]?.transcript;
        if (transcript && data.results[0].isFinal) {
          ws.send(JSON.stringify({ transcript }));
        }
      });
    }

    recognizeStream?.write(audioData);
  });

  ws.on('close', () => {
    recognizeStream?.destroy();
  });
});








//cd C:\Users\Administrator\PolyGO\translation-saas-backend
//npm install
//npm start

//cd C:\Users\Administrator\PolyGO\translation-saas-frontend
//npm install
//npm start
