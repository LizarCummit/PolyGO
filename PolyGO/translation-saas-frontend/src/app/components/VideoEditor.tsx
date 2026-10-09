'use client';

import React, { useState, useRef } from 'react';
import { VideoProcessingOptions } from '@/lib/videoProcessing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios, { AxiosRequestConfig } from 'axios';
import { getAuthHeaders } from '../utils/auth';

interface VideoEditorProps {
  onProcessed?: (blob: Blob) => void;
}

type WatermarkState = NonNullable<VideoProcessingOptions['watermark']>;
type TextOverlayState = NonNullable<VideoProcessingOptions['textOverlay']>;

export function VideoEditor({ onProcessed }: VideoEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState<VideoProcessingOptions>({
    quality: 'medium',
    format: 'webm',
  });
  const [watermark, setWatermark] = useState<WatermarkState>({
    text: '',
    position: 'bottom-right',
    fontSize: 24,
    color: 'white',
  });
  const [textOverlay, setTextOverlay] = useState<TextOverlayState>({
    text: '',
    startTime: 0,
    endTime: 5,
    position: 'bottom',
    fontSize: 24,
    color: 'white',
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('quality', options.quality || 'medium');
      formData.append('format', options.format || 'webm');
      if (watermark?.text) {
        formData.append('watermark', JSON.stringify(watermark));
      }
      if (textOverlay?.text) {
        formData.append('textOverlay', JSON.stringify(textOverlay));
      }

      const headers = await getAuthHeaders();
      const config: AxiosRequestConfig = {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/videos/process`,
        formData,
        config
      );

      if (response.data.success) {
        // Download the processed video
        const videoResponse = await axios.get(response.data.videoPath, {
          responseType: 'blob',
          headers,
        });

        onProcessed?.(videoResponse.data);
        toast.success('Video processed successfully!');

        // Clean up the processed file
        await axios.delete(response.data.videoPath, { headers });
      }
    } catch (error) {
      console.error('Error processing video:', error);
      toast.error('Failed to process video');
    } finally {
      setProcessing(false);
    }
  };

  const handleExtractAudio = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('format', 'mp3');

      const headers = await getAuthHeaders();
      const config: AxiosRequestConfig = {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/videos/extract-audio`,
        formData,
        config
      );

      if (response.data.success) {
        // Download the audio file
        const audioResponse = await axios.get(response.data.audioPath, {
          responseType: 'blob',
          headers,
        });

        // Create download link
        const url = URL.createObjectURL(audioResponse.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audio.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Clean up the audio file
        await axios.delete(response.data.audioPath, { headers });

        toast.success('Audio extracted successfully!');
      }
    } catch (error) {
      console.error('Error extracting audio:', error);
      toast.error('Failed to extract audio');
    } finally {
      setProcessing(false);
    }
  };

  const handleWatermarkTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWatermark(prev => ({ ...prev, text: e.target.value }));
  };

  const handleWatermarkPositionChange = (value: string) => {
    setWatermark(prev => ({
      ...prev,
      position: value as WatermarkState['position'],
    }));
  };

  const handleTextOverlayTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextOverlay(prev => ({ ...prev, text: e.target.value }));
  };

  const handleTextOverlayPositionChange = (value: string) => {
    setTextOverlay(prev => ({
      ...prev,
      position: value as TextOverlayState['position'],
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Upload Video</label>
            <Input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={processing}
            />
          </div>

          {file && (
            <video
              ref={videoRef}
              controls
              className="w-full max-h-[400px] rounded-lg"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quality</label>
              <Select
                value={options.quality}
                onValueChange={(value: string) => setOptions({ ...options, quality: value as VideoProcessingOptions['quality'] })}
                disabled={processing}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <Select
                value={options.format}
                onValueChange={(value: string) => setOptions({ ...options, format: value as VideoProcessingOptions['format'] })}
                disabled={processing}
              >
                <option value="webm">WebM</option>
                <option value="mp4">MP4</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Watermark</label>
            <div className="space-y-2">
              <Input
                placeholder="Watermark text"
                value={watermark.text}
                onChange={handleWatermarkTextChange}
                disabled={processing}
              />
              <Select
                value={watermark.position}
                onValueChange={handleWatermarkPositionChange}
                disabled={processing}
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Text Overlay</label>
            <div className="space-y-2">
              <Input
                placeholder="Overlay text"
                value={textOverlay.text}
                onChange={handleTextOverlayTextChange}
                disabled={processing}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1">Start Time (s)</label>
                  <Input
                    type="number"
                    value={textOverlay.startTime}
                    onChange={(e) => setTextOverlay(prev => ({ ...prev, startTime: Number(e.target.value) }))}
                    disabled={processing}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">End Time (s)</label>
                  <Input
                    type="number"
                    value={textOverlay.endTime}
                    onChange={(e) => setTextOverlay(prev => ({ ...prev, endTime: Number(e.target.value) }))}
                    disabled={processing}
                  />
                </div>
              </div>
              <Select
                value={textOverlay.position}
                onValueChange={handleTextOverlayPositionChange}
                disabled={processing}
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
              </Select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleProcess}
              disabled={!file || processing}
              className="flex-1"
            >
              {processing ? 'Processing...' : 'Process Video'}
            </Button>
            <Button
              onClick={handleExtractAudio}
              disabled={!file || processing}
              variant="outline"
            >
              Extract Audio
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 