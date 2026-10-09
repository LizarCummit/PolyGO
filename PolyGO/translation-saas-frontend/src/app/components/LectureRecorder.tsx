import { useState, useRef, useEffect } from 'react';
import { LectureSession, AudioData } from '../types/lecture';
import LanguageSelectionModal from './LanguageSelectionModal';

interface LectureRecorderProps {
  onRecordingComplete: (audioData: AudioData[], language: string) => void;
}

export default function LectureRecorder({ onRecordingComplete }: LectureRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<AudioData[]>([]);
  const sessionRef = useRef<LectureSession | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio level monitoring
  useEffect(() => {
    if (streamRef.current && isRecording && !isPaused) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(streamRef.current);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
      };

      const intervalId = setInterval(checkAudioLevel, 100);
      return () => clearInterval(intervalId);
    }
  }, [isRecording, isPaused]);

  // Timer for duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const handleLanguageSelect = async (language: string) => {
    setSelectedLanguage(language);
    setShowLanguageModal(false);
    await startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push({
            blob: event.data,
            timestamp: Date.now()
          });
        }
      };

      sessionRef.current = {
        startTime: new Date(),
        chunks: [],
        transcriptionProgress: 0
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && streamRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());
      
      if (sessionRef.current) {
        sessionRef.current.endTime = new Date();
      }
      
      onRecordingComplete(chunksRef.current, selectedLanguage);
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Lecture Recorder</h2>
        <div className="text-lg font-mono">{formatDuration(duration)}</div>
      </div>
      
      <div className="flex items-center space-x-4 mb-4">
        {!isRecording && (
          <button
            onClick={() => setShowLanguageModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Start Recording
          </button>
        )}
        
        {isRecording && !isPaused && (
          <button
            onClick={pauseRecording}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Pause
          </button>
        )}
        
        {isRecording && isPaused && (
          <button
            onClick={resumeRecording}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Resume
          </button>
        )}
        
        {isRecording && (
          <button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Stop
          </button>
        )}
      </div>

      {isRecording && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded">
            <div 
              className="h-full bg-blue-500 rounded transition-all duration-200"
              style={{ width: `${Math.min(audioLevel, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isPaused ? 'Recording paused' : 'Recording in progress...'}
          </p>
        </div>
      )}

      <LanguageSelectionModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onLanguageSelect={handleLanguageSelect}
      />
    </div>
  );
} 