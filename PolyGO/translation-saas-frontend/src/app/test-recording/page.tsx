'use client';

import { useState } from 'react';
import ScreenRecorder from '../components/ScreenRecorder';

export default function TestRecordingPage() {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const handleRecordingComplete = (url: string) => {
    setRecordingUrl(url);
    console.log('Recording completed:', url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Test Screen Recording</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Click "Start Recording" to begin screen capture</li>
            <li>Select the screen or window you want to record</li>
            <li>Record your screen for a few seconds</li>
            <li>Click "Stop Recording" when done</li>
            <li>Preview your recording and add metadata</li>
            <li>Click "Upload Recording" to save</li>
            <li>Use the Share and Delete buttons to manage your recording</li>
          </ol>
        </div>

        <ScreenRecorder
          lectureId="test-lecture-id"
          onRecordingComplete={handleRecordingComplete}
        />
        
        {recordingUrl && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Recording URL:</h2>
            <p className="text-sm text-gray-600 break-all">{recordingUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
} 