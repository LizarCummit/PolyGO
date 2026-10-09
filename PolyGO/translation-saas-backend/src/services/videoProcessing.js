const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

const qualitySettings = {
  low: { crf: 28, preset: 'veryfast' },
  medium: { crf: 23, preset: 'medium' },
  high: { crf: 18, preset: 'slow' },
};

async function processVideo(inputPath, options) {
  const outputPath = path.join(
    path.dirname(inputPath),
    `processed-${path.basename(inputPath)}`
  );

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    // Add quality settings
    const quality = qualitySettings[options.quality || 'medium'];
    command = command
      .videoCodec(options.format === 'mp4' ? 'libx264' : 'libvpx-vp9')
      .audioCodec(options.format === 'mp4' ? 'aac' : 'libopus')
      .addOptions([
        `-crf ${quality.crf}`,
        `-preset ${quality.preset}`,
      ]);

    // Add watermark if specified
    if (options.watermark) {
      const position = {
        'top-left': '10:10',
        'top-right': 'w-tw-10:10',
        'bottom-left': '10:h-th-10',
        'bottom-right': 'w-tw-10:h-th-10',
      }[options.watermark.position];

      command = command.addOptions([
        `-vf drawtext=text='${options.watermark.text}':x=${position.split(':')[0]}:y=${position.split(':')[1]}:fontsize=${options.watermark.fontSize || 24}:fontcolor=${options.watermark.color || 'white'}`,
      ]);
    }

    // Add text overlay if specified
    if (options.textOverlay) {
      const position = {
        'top': '(w-tw)/2:10',
        'bottom': '(w-tw)/2:h-th-10',
        'center': '(w-tw)/2:(h-th)/2',
      }[options.textOverlay.position];

      command = command.addOptions([
        `-vf drawtext=text='${options.textOverlay.text}':x=${position.split(':')[0]}:y=${position.split(':')[1]}:fontsize=${options.textOverlay.fontSize || 24}:fontcolor=${options.textOverlay.color || 'white'}:enable='between(t,${options.textOverlay.startTime},${options.textOverlay.endTime})'`,
      ]);
    }

    command
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

async function extractAudio(inputPath, format = 'mp3') {
  const outputPath = path.join(
    path.dirname(inputPath),
    `audio-${path.basename(inputPath, path.extname(inputPath))}.${format}`
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .noVideo()
      .audioCodec(format === 'mp3' ? 'libmp3lame' : 'aac')
      .audioBitrate('192k')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = {
  processVideo,
  extractAudio,
}; 