const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateSummary(lectureId, transcription) {
  try {
    // Combine all transcription segments into a single text
    const fullText = transcription
      .map(segment => segment.text)
      .join(' ');

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of lecture content. Focus on the main points and key concepts.'
        },
        {
          role: 'user',
          content: `Please summarize the following lecture content:\n\n${fullText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const summary = completion.choices[0].message.content;

    // Save summary to database
    const { error } = await supabase
      .from('lecture_analysis')
      .upsert({
        lecture_id: lectureId,
        summary,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

async function extractKeyPoints(lectureId, summary) {
  try {
    // Extract key points using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts key points from lecture summaries. Format the output as a JSON array of strings.'
        },
        {
          role: 'user',
          content: `Please extract the key points from this lecture summary:\n\n${summary}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const keyPoints = JSON.parse(completion.choices[0].message.content).keyPoints;

    // Save key points to database
    const { error } = await supabase
      .from('lecture_analysis')
      .upsert({
        lecture_id: lectureId,
        key_points: keyPoints,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return keyPoints;
  } catch (error) {
    console.error('Error extracting key points:', error);
    throw error;
  }
}

async function saveLectureAnalysis(lectureId, { summary, keyPoints }) {
  try {
    const { error } = await supabase
      .from('lecture_analysis')
      .upsert({
        lecture_id: lectureId,
        summary,
        key_points: keyPoints,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Update lecture status to completed
    await supabase
      .from('lectures')
      .update({ status: 'completed' })
      .eq('id', lectureId);

    return { success: true };
  } catch (error) {
    console.error('Error saving lecture analysis:', error);
    return { success: false, error: 'Failed to save lecture analysis' };
  }
}

module.exports = {
  generateSummary,
  extractKeyPoints,
  saveLectureAnalysis
}; 