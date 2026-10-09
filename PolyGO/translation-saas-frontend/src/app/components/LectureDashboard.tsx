import { useState, useEffect } from 'react';
import { Lecture, AudioData, KeyPoint } from '../types/lecture';
import { LectureService } from '../services/lectureService';
import { KeyPointsService } from '../services/keyPointsService';
import LectureRecorder from './LectureRecorder';

export default function LectureDashboard() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState('');

  useEffect(() => {
    loadLectures();
  }, []);

  const loadLectures = async () => {
    try {
      const fetchedLectures = await LectureService.listLectures();
      setLectures(fetchedLectures);
    } catch (err) {
      setError('Failed to load lectures');
      console.error(err);
    }
  };

  const handleRecordingComplete = async (audioData: AudioData[], language: string) => {
    if (!lectureTitle.trim()) {
      setError('Please enter a lecture title');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create lecture record and upload audio with language information
      const lecture = await LectureService.createLecture(lectureTitle, audioData, language);
      
      // Process the audio for transcription with language information
      const response = await fetch('http://localhost:4000/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioUrl: lecture.audioUrl,
          language: language 
        })
      });
      
      const { transcription } = await response.json();
      
      // Update lecture with transcription
      await LectureService.updateTranscription(lecture.id, transcription);
      
      // Extract and analyze key points
      const keyPoints = await KeyPointsService.extractKeyPoints(transcription);
      await LectureService.updateKeyPoints(lecture.id, keyPoints);
      
      // Generate summary
      const summary = await KeyPointsService.generateSummary(keyPoints);
      
      // Analyze relationships between key points
      const analysis = await KeyPointsService.analyzeKeyPointsRelations(keyPoints);
      
      // Refresh lectures list
      await loadLectures();
      
      setLectureTitle('');
    } catch (err) {
      setError('Failed to process lecture recording');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLectureSelect = async (lecture: Lecture) => {
    setSelectedLecture(lecture);
  };

  const handleDeleteLecture = async (id: string) => {
    try {
      await LectureService.deleteLecture(id);
      await loadLectures();
      if (selectedLecture?.id === id) {
        setSelectedLecture(null);
      }
    } catch (err) {
      setError('Failed to delete lecture');
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Lecture Recorder</h1>
        <div className="mb-4">
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="Enter lecture title"
            className="w-full p-2 border rounded"
          />
        </div>
        <LectureRecorder onRecordingComplete={handleRecordingComplete} />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lectures List */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Recorded Lectures</h2>
          {lectures.length === 0 ? (
            <p className="text-gray-500">No lectures recorded yet</p>
          ) : (
            <div className="space-y-2">
              {lectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className={`p-3 rounded cursor-pointer ${
                    selectedLecture?.id === lecture.id
                      ? 'bg-blue-100'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => handleLectureSelect(lecture)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{lecture.title}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(lecture.date).toLocaleDateString()} - {Math.floor(lecture.duration / 60)}:{(lecture.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLecture(lecture.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Lecture Details */}
        {selectedLecture && (
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">{selectedLecture.title}</h2>
            
            {/* Transcription */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Transcription</h3>
              <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                {selectedLecture.transcription || 'Processing transcription...'}
              </div>
            </div>

            {/* Key Points */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Key Points</h3>
              <div className="space-y-2">
                {selectedLecture.keyPoints.map((point, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="bg-gray-50 p-3 rounded">
                {selectedLecture.summary || 'Generating summary...'}
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-lg">Processing lecture...</p>
          </div>
        </div>
      )}
    </div>
  );
} 