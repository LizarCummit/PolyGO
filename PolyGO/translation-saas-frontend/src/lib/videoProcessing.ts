import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Default as MovieMasher } from '@moviemasher/moviemasher.js';

export interface VideoProcessingOptions {
  startTime?: number;
  endTime?: number;
  quality?: 'low' | 'medium' | 'high';
  format?: 'mp4' | 'webm';
  maxSizeMB?: number;
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    fontSize?: number;
    color?: string;
  };
  textOverlay?: {
    text: string;
    startTime: number;
    endTime: number;
    position: 'top' | 'bottom' | 'center';
    fontSize?: number;
    color?: string;
  };
}

export interface ProcessingProgress {
  stage: 'loading' | 'trimming' | 'compressing' | 'converting' | 'complete';
  progress: number;
}

export class VideoProcessor {
  private ffmpeg: FFmpeg;
  private movieMasher: any;
  private isLoaded = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
    this.movieMasher = new MovieMasher();
  }

  async load() {
    if (this.isLoaded) return;

    await this.ffmpeg.load({
      coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
    });

    this.isLoaded = true;
  }

  async processVideo(
    file: Blob,
    options: VideoProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Blob> {
    await this.load();

    const inputFileName = 'input.webm';
    const outputFileName = `output.${options.format || 'webm'}`;

    // Write input file
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Build FFmpeg command
    let command = ['-i', inputFileName];

    // Add trimming if specified
    if (options.startTime !== undefined || options.endTime !== undefined) {
      command.push('-ss', options.startTime?.toString() || '0');
      if (options.endTime !== undefined) {
        command.push('-t', (options.endTime - (options.startTime || 0)).toString());
      }
    }

    // Add quality settings
    const qualitySettings = {
      low: ['-crf', '28', '-preset', 'veryfast'],
      medium: ['-crf', '23', '-preset', 'medium'],
      high: ['-crf', '18', '-preset', 'slow'],
    };
    command.push(...(qualitySettings[options.quality || 'medium']));

    // Add format settings
    if (options.format === 'mp4') {
      command.push('-c:v', 'libx264', '-c:a', 'aac');
    } else {
      command.push('-c:v', 'libvpx-vp9', '-c:a', 'libopus');
    }

    command.push(outputFileName);

    // Run FFmpeg command
    await this.ffmpeg.exec(command);

    // Read output file
    const data = await this.ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: `video/${options.format || 'webm'}` });
  }

  async generateThumbnail(
    file: Blob,
    timeInSeconds: number = 0
  ): Promise<Blob> {
    await this.load();

    const inputFileName = 'input.webm';
    const outputFileName = 'thumbnail.jpg';

    // Write input file
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Generate thumbnail
    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-ss', timeInSeconds.toString(),
      '-vframes', '1',
      '-q:v', '2',
      outputFileName
    ]);

    // Read output file
    const data = await this.ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: 'image/jpeg' });
  }

  async getVideoInfo(file: Blob): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
  }> {
    await this.load();

    const inputFileName = 'input.webm';
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Get video information
    const result = await this.ffmpeg.exec(['-i', inputFileName]);
    const info = result.toString();

    // Parse video information
    const durationMatch = info.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
    const resolutionMatch = info.match(/(\d+)x(\d+)/);

    const duration = durationMatch
      ? parseInt(durationMatch[1]) * 3600 +
        parseInt(durationMatch[2]) * 60 +
        parseInt(durationMatch[3])
      : 0;

    const width = resolutionMatch ? parseInt(resolutionMatch[1]) : 0;
    const height = resolutionMatch ? parseInt(resolutionMatch[2]) : 0;

    return {
      duration,
      width,
      height,
      size: file.size,
    };
  }

  async addWatermark(
    file: Blob,
    watermark: VideoProcessingOptions['watermark']
  ): Promise<Blob> {
    await this.load();

    const inputFileName = 'input.webm';
    const outputFileName = 'watermarked.webm';

    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    const position = {
      'top-left': '10:10',
      'top-right': 'w-tw-10:10',
      'bottom-left': '10:h-th-10',
      'bottom-right': 'w-tw-10:h-th-10',
    }[watermark?.position || 'bottom-right'];

    const fontSize = watermark?.fontSize || 24;
    const color = watermark?.color || 'white';

    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-vf', `drawtext=text='${watermark?.text}':x=${position.split(':')[0]}:y=${position.split(':')[1]}:fontsize=${fontSize}:fontcolor=${color}`,
      '-c:a', 'copy',
      outputFileName
    ]);

    const data = await this.ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: 'video/webm' });
  }

  async extractAudio(file: Blob, format: 'mp3' | 'aac' = 'mp3'): Promise<Blob> {
    await this.load();

    const inputFileName = 'input.webm';
    const outputFileName = `audio.${format}`;

    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-vn',
      '-acodec', format === 'mp3' ? 'libmp3lame' : 'aac',
      '-ab', '192k',
      outputFileName
    ]);

    const data = await this.ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: `audio/${format}` });
  }

  async addTextOverlay(
    file: Blob,
    overlay: VideoProcessingOptions['textOverlay']
  ): Promise<Blob> {
    await this.load();

    const inputFileName = 'input.webm';
    const outputFileName = 'overlay.webm';

    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    const position = {
      'top': '(w-tw)/2:10',
      'bottom': '(w-tw)/2:h-th-10',
      'center': '(w-tw)/2:(h-th)/2',
    }[overlay?.position || 'bottom'];

    const fontSize = overlay?.fontSize || 24;
    const color = overlay?.color || 'white';

    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-vf', `drawtext=text='${overlay?.text}':x=${position.split(':')[0]}:y=${position.split(':')[1]}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t,${overlay?.startTime},${overlay?.endTime})'`,
      '-c:a', 'copy',
      outputFileName
    ]);

    const data = await this.ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: 'video/webm' });
  }
} 