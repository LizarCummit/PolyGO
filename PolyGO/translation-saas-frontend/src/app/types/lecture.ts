export interface Lecture {
  id: string;
  title: string;
  date: Date;
  duration: number;
  transcription: string;
  keyPoints: string[];
  summary: string;
  status: 'recording' | 'processing' | 'completed';
  audioUrl?: string;
  language: string;
}

export interface LectureSession {
  startTime: Date;
  endTime?: Date;
  chunks: AudioData[];
  transcriptionProgress: number;
}

export interface KeyPoint {
  text: string;
  timestamp: number;
  confidence: number;
}

export interface AudioData {
  blob: Blob;
  timestamp: number;
} 