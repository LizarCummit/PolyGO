'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders, checkAuth } from '../utils/auth';

interface Lecture {
  id: string;
  title: string;
  description: string;
  duration: number;
  created_at: string;
  lecture_analysis: {
    summary: string;
  };
}

export default function LecturesPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lectures');
      }

      const data = await response.json();
      setLectures(data);
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Lectures</h1>
        <Link
          href="/lectures/upload"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Upload New Lecture
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {lectures.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No lectures yet
          </h3>
          <p className="text-gray-500 mb-6">
            Upload your first lecture to get started
          </p>
          <Link
            href="/lectures/upload"
            className="inline-flex items-center text-blue-500 hover:text-blue-600"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Upload Lecture
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lectures.map((lecture) => (
            <Link
              key={lecture.id}
              href={`/lectures/${lecture.id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {lecture.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {lecture.description || 'No description'}
              </p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{formatDate(lecture.created_at)}</span>
                <span>{formatDuration(lecture.duration)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 