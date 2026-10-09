import { useState, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg'
];

export default function LectureUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload an audio file (WAV, MP3, M4A, or OGG).');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB.');
      return;
    }
    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for the lecture.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      // Get the current user's session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        throw new Error('Authentication required');
      }

      // Create form data
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('title', title);
      formData.append('description', description);

      // Upload the file
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lectures/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload lecture');
      }

      // Redirect to the lecture page
      router.push(`/lectures/${data.lectureId}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Lecture Recording</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter lecture title"
            disabled={isUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter lecture description"
            rows={3}
            disabled={isUploading}
          />
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Selected file:</p>
              <p className="font-medium">{file.name}</p>
              <button
                onClick={() => setFile(null)}
                className="text-red-500 text-sm hover:text-red-600"
                disabled={isUploading}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-600">
                Drag and drop your audio file here, or
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600"
                disabled={isUploading}
              >
                browse to upload
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileInput}
                disabled={isUploading}
              />
            </div>
          )}
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded">
              <div
                className="h-full bg-blue-500 rounded transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Processing lecture... This may take a few minutes.
            </p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            !file || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Lecture'}
        </button>
      </div>
    </div>
  );
} 