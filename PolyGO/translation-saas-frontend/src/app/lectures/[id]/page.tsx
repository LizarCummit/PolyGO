'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders, checkAuth } from '../../utils/auth';

interface Lecture {
  id: string;
  title: string;
  description: string;
  duration: number;
  created_at: string;
  lecture_analysis: {
    summary: string;
    key_points: string[];
  };
  transcription: {
    text: string;
    segments: {
      text: string;
      start: number;
      end: number;
    }[];
  };
}

type PageProps = {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function LecturePage({ params }: PageProps) {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchLecture();
  }, [params.id]);

  const fetchLecture = async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures/${params.id}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lecture');
      }

      const data = await response.json();
      setLecture(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Lecture not found
          </h3>
          <p className="text-gray-500">
            The lecture you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {lecture.title}
        </h1>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <span>{formatDate(lecture.created_at)}</span>
          <span>{formatDuration(lecture.duration)}</span>
        </div>
      </div>

      {lecture.description && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Description
          </h2>
          <p className="text-gray-600">{lecture.description}</p>
        </div>
      )}

      {lecture.lecture_analysis?.summary && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Summary
          </h2>
          <p className="text-gray-600">{lecture.lecture_analysis.summary}</p>
        </div>
      )}

      {lecture.lecture_analysis?.key_points && lecture.lecture_analysis.key_points.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Key Points
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            {lecture.lecture_analysis.key_points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {lecture.transcription?.text && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Transcription
          </h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-gray-600 whitespace-pre-wrap">
              {lecture.transcription.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 