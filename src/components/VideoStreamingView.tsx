import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  PictureInPicture2, 
  SkipForward, 
  SkipBack, 
  Star, 
  Download, 
  ExternalLink, 
  Trash2, 
  Upload, 
  Film, 
  Sparkles, 
  Clock, 
  Layers, 
  Flame, 
  X,
  ListVideo,
  CheckSquare,
  Square,
  Archive
} from 'lucide-react';
import { VFile } from '../types';
import { formatBytes, formatDate } from '../utils/fileUtils';
import { 
  extractVideoMetadataAndThumbnail, 
  formatVideoDuration, 
  VideoMetadata 
} from '../utils/videoUtils';

interface VideoStreamingViewProps {
  videos: VFile[];
  selectedIds?: Set<string>;
  onSelectAll?: (select: boolean) => void;
  onBatchZip?: (items: VFile[]) => void;
  onBatchDelete?: (items: VFile[]) => void;
  onUploadVideos: (files: FileList | File[]) => void;
  onDeleteVideo: (video: VFile) => void;
  onToggleFavorite: (video: VFile) => void;
  onDownloadVideo: (video: VFile) => void;
  onOpenInTab: (video: VFile) => void;
}

export const VideoStreamingView: React.FC<VideoStreamingViewProps> = ({
  videos,
  selectedIds = new Set(),
  onSelectAll,
  onBatchZip,
  onBatchDelete,
  onUploadVideos,
  onDeleteVideo,
  onToggleFavorite,
  onDownloadVideo,
  onOpenInTab,
}) => {
  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'starred' | 'short' | 'hd'>('all');
  
  // Theater Player State
  const [activePlayingVideo, setActivePlayingVideo] = useState<VFile | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Metadata cache (thumbnails, durations, resolutions)
  const [metadataMap, setMetadataMap] = useState<Record<string, VideoMetadata>>({});
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [cardPreviewUrls, setCardPreviewUrls] = useState<Record<string, string>>({});
  const [activeMediaUrl, setActiveMediaUrl] = useState<string>('');

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Filter videos based on category filter
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (v.trashed) return false;
      const meta = metadataMap[v.id];

      if (activeFilter === 'starred' && !v.favorite) {
        return false;
      }
      if (activeFilter === 'short' && meta && meta.duration > 120) {
        return false;
      }
      if (activeFilter === 'hd' && meta && (meta.resolutionLabel.includes('SD') || meta.resolutionLabel.includes('480p'))) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (activeFilter === 'recent') {
        return b.updatedAt - a.updatedAt;
      }
      return b.createdAt - a.createdAt;
    });
  }, [videos, activeFilter, metadataMap]);

  // Extract thumbnails for all videos as they arrive
  useEffect(() => {
    let isCancelled = false;

    const extractThumbnails = async () => {
      for (const video of videos) {
        if (video.trashed || metadataMap[video.id]) continue;
        if (video.blob) {
          try {
            const meta = await extractVideoMetadataAndThumbnail(video.id, video.blob, 1.5);
            if (!isCancelled) {
              setMetadataMap((prev) => ({ ...prev, [video.id]: meta }));
            }
          } catch (e) {
            console.warn('Could not extract thumbnail for video:', video.name, e);
          }
        }
      }
    };

    extractThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [videos]);

  // Update object URL for active video player
  useEffect(() => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    if (activePlayingVideo && activePlayingVideo.blob) {
      const url = URL.createObjectURL(activePlayingVideo.blob);
      activeBlobUrlRef.current = url;
      setActiveMediaUrl(url);
      setIsPlaying(true);
      setCurrentTime(0);
    } else {
      setActiveMediaUrl('');
    }

    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [activePlayingVideo]);

  // Handle Video Element Events
  const handleTimeUpdate = () => {
    if (videoElementRef.current) {
      setCurrentTime(videoElementRef.current.currentTime);
      setDuration(videoElementRef.current.duration || 0);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoplayNext && filteredVideos.length > 1 && activePlayingVideo) {
      const currentIndex = filteredVideos.findIndex((v) => v.id === activePlayingVideo.id);
      const nextIndex = (currentIndex + 1) % filteredVideos.length;
      setActivePlayingVideo(filteredVideos[nextIndex]);
    }
  };

  const togglePlay = () => {
    if (videoElementRef.current) {
      if (videoElementRef.current.paused) {
        videoElementRef.current.play();
        setIsPlaying(true);
      } else {
        videoElementRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoElementRef.current) {
      const newMute = !isMuted;
      videoElementRef.current.muted = newMute;
      setIsMuted(newMute);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoElementRef.current) {
      videoElementRef.current.volume = val;
      videoElementRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * duration;
    if (videoElementRef.current && !isNaN(targetTime)) {
      videoElementRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleSeekLeave = () => {
    setHoverTime(null);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (videoElementRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await videoElementRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('PiP error:', err);
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoElementRef.current) {
      videoElementRef.current.playbackRate = rate;
    }
  };

  const playNextVideo = () => {
    if (!activePlayingVideo || filteredVideos.length <= 1) return;
    const currentIndex = filteredVideos.findIndex((v) => v.id === activePlayingVideo.id);
    const nextIndex = (currentIndex + 1) % filteredVideos.length;
    setActivePlayingVideo(filteredVideos[nextIndex]);
  };

  const playPrevVideo = () => {
    if (!activePlayingVideo || filteredVideos.length <= 1) return;
    const currentIndex = filteredVideos.findIndex((v) => v.id === activePlayingVideo.id);
    const prevIndex = (currentIndex - 1 + filteredVideos.length) % filteredVideos.length;
    setActivePlayingVideo(filteredVideos[prevIndex]);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2800);
  };

  // Keyboard shortcut controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePlayingVideo) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        if (videoElementRef.current) {
          videoElementRef.current.currentTime = Math.min(duration, currentTime + 5);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        if (videoElementRef.current) {
          videoElementRef.current.currentTime = Math.max(0, currentTime - 5);
        }
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          setActivePlayingVideo(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePlayingVideo, isPlaying, duration, currentTime]);

  const isAllSelected = filteredVideos.length > 0 && selectedIds.size >= filteredVideos.length;
  const selectedItems = useMemo(() => videos.filter(v => selectedIds.has(v.id)), [videos, selectedIds]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto bg-neutral-950 text-neutral-100 font-sans">
      {/* Hidden File Input */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadVideos(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* 1. COMPACT FILTER BAR */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Videos', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'recent', label: 'Recent', icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'starred', label: 'Starred', icon: <Star className="w-3.5 h-3.5 fill-amber-400/20 text-amber-400" /> },
            { id: 'short', label: 'Clips (<2m)', icon: <Flame className="w-3.5 h-3.5 text-orange-400" /> },
            { id: 'hd', label: 'HD (1080p+)', icon: <Sparkles className="w-3.5 h-3.5 text-sky-400" /> },
          ].map((chip) => {
            const isSelected = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                }`}
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {filteredVideos.length > 0 && onSelectAll && (
            <button
              id="select-all-videos-btn"
              onClick={() => onSelectAll(!isAllSelected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold shadow-sm transition-all"
              title={isAllSelected ? "Deselect all (Ctrl+A)" : "Select all (Ctrl+A)"}
            >
              {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
            {filteredVideos.length} video{filteredVideos.length === 1 ? '' : 's'}
          </span>

          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Batch Toolbar when videos are selected */}
      {selectedIds.size > 0 && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-wrap items-center justify-between gap-2 z-20 text-xs shadow-xl shrink-0 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {selectedIds.size} of {filteredVideos.length} selected
            </span>
            <button
              onClick={() => onSelectAll?.(false)}
              className="text-[11px] text-neutral-400 hover:text-white underline ml-1 font-mono"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onBatchZip && selectedItems.length > 0 && (
              <button
                onClick={() => onBatchZip(selectedItems)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold"
                title="Compress to ZIP"
              >
                <Archive className="w-3.5 h-3.5 text-neutral-300" />
                <span>Zip</span>
              </button>
            )}

            {selectedItems.length > 0 && (
              <button
                onClick={() => selectedItems.forEach(v => onDownloadVideo(v))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold"
                title="Download"
              >
                <Download className="w-3.5 h-3.5 text-neutral-300" />
                <span>Download</span>
              </button>
            )}

            {onBatchDelete && selectedItems.length > 0 && (
              <button
                onClick={() => onBatchDelete(selectedItems)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 border border-neutral-700 text-xs font-semibold"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. THEATER STREAMING PLAYER (When a video is playing) */}
      {activePlayingVideo && (
        <div
          id="streaming-theater-section"
          className="w-full bg-black/90 border-b border-neutral-800 p-3 sm:p-5 animate-in fade-in duration-150 shrink-0"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Video View */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div
                ref={playerContainerRef}
                onMouseMove={handleMouseMove}
                className="relative aspect-video w-full bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 group select-none"
              >
                {activeMediaUrl ? (
                  <video
                    ref={videoElementRef}
                    src={activeMediaUrl}
                    autoPlay
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    onClick={togglePlay}
                    className="w-full h-full object-contain bg-black cursor-pointer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <Film className="w-10 h-10 animate-pulse" />
                  </div>
                )}

                {/* Big Center Play Icon when paused */}
                {!isPlaying && (
                  <div 
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                      <Play className="w-7 h-7 fill-black translate-x-0.5" />
                    </div>
                  </div>
                )}

                {/* Controls Bar */}
                <div
                  className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 flex flex-col gap-2 transition-opacity duration-200 ${
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Scrub Bar */}
                  <div
                    onClick={handleSeek}
                    onMouseMove={handleSeekHover}
                    onMouseLeave={handleSeekLeave}
                    className="relative w-full h-2 group/scrub bg-neutral-700/60 rounded-full cursor-pointer flex items-center"
                  >
                    <div
                      className="h-full bg-white rounded-full relative flex items-center"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    >
                      <div className="absolute right-0 w-3 h-3 rounded-full bg-white shadow-md transform translate-x-1/2 scale-0 group-hover/scrub:scale-100 transition-transform" />
                    </div>

                    {hoverTime !== null && (
                      <div
                        className="absolute bottom-4 -translate-x-1/2 bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded text-[10px] font-mono text-white pointer-events-none shadow"
                        style={{ left: `${hoverPosition}%` }}
                      >
                        {formatVideoDuration(hoverTime)}
                      </div>
                    )}
                  </div>

                  {/* Buttons Row */}
                  <div className="flex items-center justify-between gap-2 text-white">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlay}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>

                      <button
                        onClick={playPrevVideo}
                        className="p-1 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                        title="Previous video"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={playNextVideo}
                        className="p-1 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                        title="Next video"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={toggleMute}
                          className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 accent-white bg-neutral-700 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="text-[11px] font-mono text-neutral-300 ml-1">
                        <span>{formatVideoDuration(currentTime)}</span>
                        <span className="mx-1 text-neutral-500">/</span>
                        <span>{formatVideoDuration(duration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-white/10 rounded-lg text-[10px] font-semibold">
                        {[1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changePlaybackRate(rate)}
                            className={`px-1.5 py-0.5 rounded transition-colors ${
                              playbackRate === rate ? 'bg-white text-black' : 'text-neutral-300 hover:text-white'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={togglePiP}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-colors hidden sm:inline-flex"
                        title="Picture in Picture"
                      >
                        <PictureInPicture2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                        title="Fullscreen"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setActivePlayingVideo(null)}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
                        title="Close player"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Info Bar */}
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">
                    {activePlayingVideo.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {formatBytes(activePlayingVideo.size)} &bull; {metadataMap[activePlayingVideo.id]?.resolutionLabel || 'HD'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onToggleFavorite(activePlayingVideo)}
                    className={`p-2 rounded-xl border text-xs flex items-center transition-colors ${
                      activePlayingVideo.favorite
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Star video"
                  >
                    <Star className={`w-3.5 h-3.5 ${activePlayingVideo.favorite ? 'fill-amber-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => onDownloadVideo(activePlayingVideo)}
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenInTab(activePlayingVideo)}
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Playlist Queue */}
            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <ListVideo className="w-3.5 h-3.5 text-white" />
                  Playlist
                </span>
                <label className="flex items-center gap-1.5 text-[10px] text-neutral-400 cursor-pointer">
                  <span>Autoplay</span>
                  <input
                    type="checkbox"
                    checked={autoplayNext}
                    onChange={(e) => setAutoplayNext(e.target.checked)}
                    className="rounded accent-white cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                {filteredVideos.map((v) => {
                  const meta = metadataMap[v.id];
                  const isCurrent = v.id === activePlayingVideo.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setActivePlayingVideo(v)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors border ${
                        isCurrent
                          ? 'bg-neutral-800 border-neutral-600 text-white font-semibold'
                          : 'bg-neutral-900/60 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="w-20 aspect-video rounded-lg bg-neutral-950 overflow-hidden shrink-0 relative border border-neutral-800">
                        {meta?.thumbnail ? (
                          <img src={meta.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <Film className="w-4 h-4" />
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-white">
                          {meta?.formattedDuration || '00:00'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-medium truncate">{v.name}</h4>
                        <span className="text-[10px] text-neutral-500 font-mono block">
                          {formatBytes(v.size)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLEAN VIDEO GRID */}
      <div className="p-4 sm:p-5 flex-1">
        {filteredVideos.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-neutral-800 rounded-3xl">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3 shadow-md">
              <Film className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">No Videos Available</h4>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Upload MP4, WebM, MOV, or MKV videos to play them in your offline drive.
            </p>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-12">
            {filteredVideos.map((video) => {
              const meta = metadataMap[video.id];
              const isHovered = hoveredCardId === video.id;

              return (
                <div
                  key={video.id}
                  id={`video-card-${video.id}`}
                  onMouseEnter={() => {
                    setHoveredCardId(video.id);
                    if (video.blob && !cardPreviewUrls[video.id]) {
                      const url = URL.createObjectURL(video.blob);
                      setCardPreviewUrls((prev) => ({ ...prev, [video.id]: url }));
                    }
                  }}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onClick={() => setActivePlayingVideo(video)}
                  className="group relative flex flex-col bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-150"
                >
                  {/* 16:9 Thumbnail */}
                  <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden">
                    {isHovered && cardPreviewUrls[video.id] ? (
                      <video
                        src={cardPreviewUrls[video.id]}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : meta?.thumbnail ? (
                      <img
                        src={meta.thumbnail}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-700">
                        <Film className="w-7 h-7" />
                      </div>
                    )}

                    {/* Duration Badge */}
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white shadow">
                      {meta?.formattedDuration || '00:00'}
                    </span>

                    {/* Resolution Badge */}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[9px] font-bold text-white uppercase">
                      {meta?.resolutionLabel || 'HD'}
                    </span>

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-black translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-2.5 flex flex-col justify-between flex-1">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-neutral-200 transition-colors mb-1">
                      {video.name}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                      <span>{formatBytes(video.size)}</span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onToggleFavorite(video)}
                          className={`p-1 rounded hover:bg-neutral-800 transition-colors ${
                            video.favorite ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                          title="Star video"
                        >
                          <Star className={`w-3 h-3 ${video.favorite ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => onDownloadVideo(video)}
                          className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteVideo(video)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                          title="Delete to Bin"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
