'use client';

import { useState, useCallback, useRef } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { uploadRecording, deleteRecording, updateRecordingMetadata } from '@/lib/storage';
import VideoEditor from './VideoEditor';

interface ScreenRecorderProps {
  lectureId: string;
  onRecordingComplete: (url: string) => void;
}

interface RecordingMetadata {
  title: string;
  description: string;
}

export default function ScreenRecorder({ lectureId, onRecordingComplete }: ScreenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [metadata, setMetadata] = useState<RecordingMetadata>({ title: '', description: '' });
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    video: {
      displaySurface: 'monitor',
    },
    audio: true,
    onStop: async (blobUrl: string, blob: Blob) => {
      setRecordingBlob(blob);
      setShowPreview(true);
    },
  });

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
      setIsRecording(true);
      setError(null);
      setShowPreview(false);
      setRecordingBlob(null);
      setRecordingUrl(null);
      setShowEditor(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Screen recording permission was denied. Please allow screen recording to continue.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
      }
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setIsRecording(false);
  }, [stopRecording]);

  const handleProcessedVideo = useCallback(async (processedBlob: Blob) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const url = await uploadRecording(lectureId, processedBlob, (progress) => {
        setUploadProgress(progress);
      });

      setRecordingUrl(url);
      onRecordingComplete(url);
      setShowPreview(false);
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload recording');
    } finally {
      setIsUploading(false);
    }
  }, [lectureId, onRecordingComplete]);

  const handleRetry = useCallback(() => {
    setError(null);
    if (recordingBlob) {
      setShowEditor(true);
    }
  }, [recordingBlob]);

  const handleDelete = useCallback(async () => {
    if (!recordingUrl) return;

    try {
      await deleteRecording(recordingUrl);
      setRecordingUrl(null);
      setRecordingBlob(null);
      setShowPreview(false);
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recording');
    }
  }, [recordingUrl]);

  const handleSaveMetadata = useCallback(async () => {
    if (!recordingUrl) return;

    try {
      await updateRecordingMetadata(lectureId, metadata.title, metadata.description);
      setShowPreview(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording metadata');
    }
  }, [lectureId, metadata, recordingUrl]);

  const handleShare = useCallback(() => {
    if (!recordingUrl) return;
    navigator.clipboard.writeText(recordingUrl);
    alert('Recording URL copied to clipboard!');
  }, [recordingUrl]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`px-4 py-2 rounded-lg font-medium ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          disabled={isUploading}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Recording in progress...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          <p>{error}</p>
          {recordingBlob && (
            <button
              onClick={handleRetry}
              className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-sm"
            >
              Retry Upload
            </button>
          )}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">Uploading... {Math.round(uploadProgress)}%</p>
        </div>
      )}

      {showPreview && recordingBlob && !showEditor && (
        <div className="space-y-4">
          <div className="relative">
            <video
              ref={videoRef}
              src={URL.createObjectURL(recordingBlob)}
              controls
              className="w-full rounded-lg shadow-lg"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter recording title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter recording description"
                rows={3}
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowEditor(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={isUploading}
              >
                Edit Video
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditor && recordingBlob && (
        <VideoEditor
          videoBlob={recordingBlob}
          onProcessed={handleProcessedVideo}
          onCancel={() => setShowEditor(false)}
        />
      )}

      {recordingUrl && !showPreview && !showEditor && (
        <div className="space-y-4">
          <video
            src={recordingUrl}
            controls
            className="w-full rounded-lg shadow-lg"
          />
          <div className="flex space-x-4">
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Share Recording
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Delete Recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 