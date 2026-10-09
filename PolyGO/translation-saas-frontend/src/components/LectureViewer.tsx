import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ResearchTab from './ResearchTab';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Word {
  word: string;
  startTime: number;
  endTime: number;
  speakerTag: number;
}

interface Segment {
  text: string;
  start_time: number;
  end_time: number;
  speaker_label: string;
}

interface Analysis {
  summary: string;
  key_points: {
    topic: string;
    points: string[];
    concepts: string[];
  }[];
  themes: string[];
  important_terms: {
    term: string;
    definition: string;
    context: string;
  }[];
  study_guide: string;
}

interface LectureData {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  duration: number;
  lecture_segments: Segment[];
  lecture_analysis: Analysis;
}

interface Props {
  lectureId: string;
}

export default function LectureViewer({ lectureId }: Props) {
  const [lecture, setLecture] = useState<LectureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'keyPoints' | 'studyGuide' | 'research'>('transcript');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchLectureData();
  }, [lectureId]);

  const fetchLectureData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures/${lectureId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lecture data');
      }

      const data = await response.json();
      setLecture(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSegmentClick = (startTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-gray-600">Lecture not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{lecture.title}</h1>
        {lecture.description && (
          <p className="text-gray-600">{lecture.description}</p>
        )}
      </div>

      <div className="mb-6">
        <audio
          ref={audioRef}
          src={lecture.audio_url}
          controls
          className="w-full"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['transcript', 'summary', 'keyPoints', 'studyGuide', 'research'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-4">
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              {lecture.lecture_segments.map((segment, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentTime >= segment.start_time && currentTime <= segment.end_time
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSegmentClick(segment.start_time)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatTime(segment.start_time)}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 mb-1 block">
                        {segment.speaker_label}
                      </span>
                      <p className="text-gray-900">{segment.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'summary' && lecture.lecture_analysis && (
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-4">Lecture Summary</h3>
              <p className="whitespace-pre-line">{lecture.lecture_analysis.summary}</p>
              
              {lecture.lecture_analysis.themes.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold mb-2">Main Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {lecture.lecture_analysis.themes.map((theme, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'keyPoints' && lecture.lecture_analysis && (
            <div className="space-y-6">
              {lecture.lecture_analysis.key_points.map((topic, index) => (
                <div key={index} className="bg-white rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-3">{topic.topic}</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {topic.points.map((point, pointIndex) => (
                      <li key={pointIndex} className="text-gray-700">{point}</li>
                    ))}
                  </ul>
                  {topic.concepts.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Related Concepts</h4>
                      <div className="flex flex-wrap gap-2">
                        {topic.concepts.map((concept, conceptIndex) => (
                          <span
                            key={conceptIndex}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {lecture.lecture_analysis.important_terms.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Important Terms</h3>
                  <div className="space-y-4">
                    {lecture.lecture_analysis.important_terms.map((term, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900">{term.term}</h4>
                        <p className="text-sm text-gray-600 mt-1">{term.definition}</p>
                        <p className="text-sm text-gray-500 mt-2 italic">
                          Context: {term.context}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'studyGuide' && lecture.lecture_analysis && (
            <div className="prose max-w-none">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Study Guide</h3>
                <div className="whitespace-pre-line text-gray-700">
                  {lecture.lecture_analysis.study_guide}
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-md font-semibold mb-4">Quick Reference</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lecture.lecture_analysis.important_terms.map((term, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                    >
                      <h5 className="font-medium text-blue-600">{term.term}</h5>
                      <p className="text-sm text-gray-600 mt-1">{term.definition}</p>
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Context: {term.context}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'research' && (
            <ResearchTab lectureId={lectureId} />
          )}
        </div>
      </div>
    </div>
  );
} 