import { createClient } from '@supabase/supabase-js';
import { Lecture, AudioData, KeyPoint } from '../types/lecture';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class LectureService {
  static async createLecture(title: string, audioData: AudioData[], language: string): Promise<Lecture> {
    // Create a combined audio blob
    const audioBlobs = audioData.map(chunk => chunk.blob);
    const combinedBlob = new Blob(audioBlobs, { type: 'audio/webm' });
    
    // Upload audio file to Supabase Storage
    const fileName = `lectures/${Date.now()}-${title.replace(/\s+/g, '-')}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lecture-recordings')
      .upload(fileName, combinedBlob);

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Create lecture record in database
    const { data: lectureData, error: dbError } = await supabase
      .from('lectures')
      .insert([{
        title,
        date: new Date().toISOString(),
        duration: audioData.length, // Duration in seconds (approximate)
        status: 'processing',
        audio_url: uploadData?.path,
        language: language // Add language information
      }])
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to create lecture record: ${dbError.message}`);
    }

    return {
      id: lectureData.id,
      title: lectureData.title,
      date: new Date(lectureData.date),
      duration: lectureData.duration,
      transcription: '',
      keyPoints: [],
      summary: '',
      status: 'processing',
      audioUrl: lectureData.audio_url,
      language: lectureData.language
    };
  }

  static async getLecture(id: string): Promise<Lecture> {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch lecture: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      date: new Date(data.date),
      duration: data.duration,
      transcription: data.transcription || '',
      keyPoints: data.key_points || [],
      summary: data.summary || '',
      status: data.status,
      audioUrl: data.audio_url
    };
  }

  static async updateTranscription(id: string, transcription: string): Promise<void> {
    const { error } = await supabase
      .from('lectures')
      .update({ transcription, status: 'completed' })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update transcription: ${error.message}`);
    }
  }

  static async updateKeyPoints(id: string, keyPoints: KeyPoint[]): Promise<void> {
    const { error } = await supabase
      .from('lectures')
      .update({ key_points: keyPoints })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update key points: ${error.message}`);
    }
  }

  static async listLectures(): Promise<Lecture[]> {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch lectures: ${error.message}`);
    }

    return data.map(lecture => ({
      id: lecture.id,
      title: lecture.title,
      date: new Date(lecture.date),
      duration: lecture.duration,
      transcription: lecture.transcription || '',
      keyPoints: lecture.key_points || [],
      summary: lecture.summary || '',
      status: lecture.status,
      audioUrl: lecture.audio_url
    }));
  }

  static async deleteLecture(id: string): Promise<void> {
    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete lecture: ${error.message}`);
    }
  }
} 