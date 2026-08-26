// Video metadata & thumbnail extraction utility
const thumbnailCache = new Map<string, { thumbnail: string; duration: number; width: number; height: number }>();

export interface VideoMetadata {
  thumbnail: string;
  duration: number;
  width: number;
  height: number;
  resolutionLabel: string;
  formattedDuration: string;
}

export function formatVideoDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const sec = Math.floor(seconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

export function getResolutionLabel(width: number, height: number): string {
  if (!width || !height) return 'HD';
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  if (maxDim >= 3840 || minDim >= 2160) return '4K UHD';
  if (maxDim >= 2560 || minDim >= 1440) return '2K QHD';
  if (maxDim >= 1920 || minDim >= 1080) return '1080p FHD';
  if (maxDim >= 1280 || minDim >= 720) return '720p HD';
  if (minDim >= 480) return '480p';
  return 'SD';
}

export async function extractVideoMetadataAndThumbnail(
  fileId: string,
  blob: Blob,
  seekTimeSeconds = 1.0
): Promise<VideoMetadata> {
  const cached = thumbnailCache.get(fileId);
  if (cached) {
    return {
      thumbnail: cached.thumbnail,
      duration: cached.duration,
      width: cached.width,
      height: cached.height,
      resolutionLabel: getResolutionLabel(cached.width, cached.height),
      formattedDuration: formatVideoDuration(cached.duration),
    };
  }

  return new Promise((resolve) => {
    let videoUrl = '';
    try {
      videoUrl = URL.createObjectURL(blob);
    } catch {
      resolve({
        thumbnail: '',
        duration: 0,
        width: 0,
        height: 0,
        resolutionLabel: 'HD',
        formattedDuration: '00:00',
      });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };

    // Timeout safety fallback (5 seconds)
    timeoutId = setTimeout(() => {
      cleanup();
      resolve({
        thumbnail: '',
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        resolutionLabel: getResolutionLabel(video.videoWidth, video.videoHeight),
        formattedDuration: formatVideoDuration(video.duration || 0),
      });
    }, 5000);

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const targetSeek = duration > 0 ? Math.min(seekTimeSeconds, Math.max(0.1, duration * 0.15)) : 0.5;
      video.currentTime = targetSeek;
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        const canvas = document.createElement('canvas');
        // Render at max 640px width for fast crisp thumbnail
        const scale = Math.min(1, 640 / width);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

          const result: VideoMetadata = {
            thumbnail: dataUrl,
            duration: video.duration || 0,
            width,
            height,
            resolutionLabel: getResolutionLabel(width, height),
            formattedDuration: formatVideoDuration(video.duration || 0),
          };

          thumbnailCache.set(fileId, {
            thumbnail: dataUrl,
            duration: video.duration || 0,
            width,
            height,
          });

          cleanup();
          resolve(result);
          return;
        }
      } catch (err) {
        console.warn('Failed to capture video canvas frame', err);
      }

      cleanup();
      resolve({
        thumbnail: '',
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        resolutionLabel: getResolutionLabel(video.videoWidth, video.videoHeight),
        formattedDuration: formatVideoDuration(video.duration || 0),
      });
    };

    video.onerror = () => {
      cleanup();
      resolve({
        thumbnail: '',
        duration: 0,
        width: 0,
        height: 0,
        resolutionLabel: 'HD',
        formattedDuration: '00:00',
      });
    };
  });
}
