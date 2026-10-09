'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders, checkAuth } from '../../utils/auth';
import { useDropzone } from 'react-dropzone';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_FILE_TYPES = {
  'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
  'video/*': ['.mp4', '.webm', '.mov']
};

export default function UploadPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError('File size exceeds 100MB limit');
        return;
      }
      setFile(file);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/api/lectures/upload`);

      // Add headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      };

      // Handle response
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          router.push(`/lectures/${data.id}`);
        } else {
          throw new Error(xhr.responseText || 'Failed to upload lecture');
        }
      };

      xhr.onerror = () => {
        throw new Error('Network error occurred');
      };

      xhr.send(formData);
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Lecture</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Selected file: {file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag and drop a file here, or click to select'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: MP3, WAV, M4A, OGG, MP4, WEBM, MOV (max 100MB)
              </p>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || !file}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${isUploading || !file
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
            }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Lecture'}
        </button>
      </form>
    </div>
  );
} 