'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { User, Session } from '@supabase/supabase-js';

interface VideoPlayerProps {
  mediaId: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

interface Media {
  id: string;
  title: string;
  url: string;
  type: string;
  duration: number;
  progress?: number;
  completed?: boolean;
}

export default function VideoPlayer({
  mediaId,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [watchTime, setWatchTime] = useState<number>(0);
  const [lastPosition, setLastPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const { user, session } = useAuth();

  const trackProgress = useCallback(async (completed = false) => {
    if (!user || !session?.access_token) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/${mediaId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          watch_time: watchTime,
          last_position: currentTime,
          completed,
        }),
      });
    } catch (error) {
      console.error('Error tracking video progress:', error);
    }
  }, [user, session, mediaId, watchTime, currentTime]);

  useEffect(() => {
    const fetchMedia = async () => {
      if (!session?.access_token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/media/${mediaId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch media');
        }

        const data = await response.json();
        setMedia(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchMedia();
  }, [mediaId, session]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const currentTime = Math.floor(video.currentTime);
      setCurrentTime(currentTime);
      setWatchTime(currentTime);
      setLastPosition(currentTime);
      
      if (currentTime >= duration) {
        setIsCompleted(true);
      }
    }
  }, [duration, setCurrentTime, setWatchTime, setLastPosition, setIsCompleted]);

  const handleVideoEnd = useCallback(async () => {
    if (user && session?.access_token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/media/${mediaId}/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error marking video as complete:', error);
      }
    }
  }, [user, session, mediaId]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(event.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  }, [setCurrentTime]);

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, [setVolume, setIsMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, [setPlaybackRate]);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, setShowControls, controlsTimeout]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = Math.floor(video.currentTime);
      setCurrentTime(currentTime);
      setWatchTime(currentTime);
      setLastPosition(currentTime);

      // Update progress every 5 seconds
      if (Math.floor(currentTime) % 5 === 0) {
        onProgress?.(currentTime);
        trackProgress();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsCompleted(true);
      onComplete?.();
      trackProgress(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onProgress, onComplete, trackProgress, setCurrentTime, setWatchTime, setLastPosition, setIsPlaying, setIsCompleted, setDuration, handleTimeUpdate, handleVideoEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate]);

  return (
    <div
      className="relative group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={media?.url}
        className="w-full rounded-lg"
        onClick={togglePlay}
      />

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300"
              >
                {isPlaying ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300"
                >
                  {isMuted ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />

                <div className="relative group">
                  <button className="text-white hover:text-gray-300">
                    {playbackRate}x
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-black/80 rounded-lg p-2">
                    {[0.5, 1, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`block w-full px-4 py-2 text-sm text-white hover:bg-gray-700 rounded ${
                          playbackRate === rate ? 'bg-gray-700' : ''
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 