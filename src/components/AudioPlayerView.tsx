import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  RotateCw, 
  Repeat, 
  Repeat1, 
  Shuffle, 
  Music, 
  Disc, 
  Star, 
  Download, 
  ExternalLink, 
  Trash2, 
  Upload, 
  Clock, 
  Layers, 
  Sparkles, 
  X, 
  ListMusic, 
  Radio, 
  Mic,
  CheckSquare,
  Square,
  Archive
} from 'lucide-react';
import { VFile } from '../types';
import { formatBytes, formatDate, getFileExtension } from '../utils/fileUtils';

interface AudioPlayerViewProps {
  audioFiles: VFile[];
  selectedIds?: Set<string>;
  onSelectAll?: (select: boolean) => void;
  onBatchZip?: (items: VFile[]) => void;
  onBatchDelete?: (items: VFile[]) => void;
  onUploadAudio: (files: FileList | File[]) => void;
  onDeleteAudio: (audio: VFile) => void;
  onToggleFavorite: (audio: VFile) => void;
  onDownloadAudio: (audio: VFile) => void;
  onOpenInTab: (audio: VFile) => void;
}

export const AudioPlayerView: React.FC<AudioPlayerViewProps> = ({
  audioFiles,
  selectedIds = new Set(),
  onSelectAll,
  onBatchZip,
  onBatchDelete,
  onUploadAudio,
  onDeleteAudio,
  onToggleFavorite,
  onDownloadAudio,
  onOpenInTab,
}) => {
  // Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'starred' | 'music' | 'voice'>('all');
  
  // Now Playing State
  const [activeTrack, setActiveTrack] = useState<VFile | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string>('');

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Filter Audio Tracks
  const filteredAudio = useMemo(() => {
    return audioFiles.filter((a) => {
      if (a.trashed) return false;
      const ext = getFileExtension(a.name).toLowerCase();

      if (activeFilter === 'starred' && !a.favorite) return false;
      if (activeFilter === 'music' && ['wav', 'flac', 'aac'].includes(ext)) return true;
      if (activeFilter === 'voice' && ['m4a', 'ogg', 'txt'].includes(ext)) return true;

      return true;
    }).sort((a, b) => {
      if (activeFilter === 'recent') {
        return b.updatedAt - a.updatedAt;
      }
      return b.createdAt - a.createdAt;
    });
  }, [audioFiles, activeFilter]);

  // Object URL lifecycle for active audio track
  useEffect(() => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    if (activeTrack && activeTrack.blob) {
      const url = URL.createObjectURL(activeTrack.blob);
      activeBlobUrlRef.current = url;
      setActiveAudioUrl(url);
      setIsPlaying(true);
      setCurrentTime(0);
    } else {
      setActiveAudioUrl('');
      setIsPlaying(false);
    }

    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [activeTrack]);

  // Handle Audio Player Events
  const handleTimeUpdate = () => {
    if (audioElementRef.current) {
      setCurrentTime(audioElementRef.current.currentTime);
      setDuration(audioElementRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    if (repeatMode === 'one' && audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.play();
      return;
    }

    if (filteredAudio.length > 0) {
      if (isShuffle) {
        const randomIndex = Math.floor(Math.random() * filteredAudio.length);
        setActiveTrack(filteredAudio[randomIndex]);
      } else {
        playNextTrack();
      }
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (audioElementRef.current) {
      if (audioElementRef.current.paused) {
        audioElementRef.current.play();
        setIsPlaying(true);
      } else {
        audioElementRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (audioElementRef.current) {
      const nextMute = !isMuted;
      audioElementRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioElementRef.current) {
      audioElementRef.current.volume = val;
      audioElementRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * duration;
    if (audioElementRef.current && !isNaN(targetTime)) {
      audioElementRef.current.currentTime = targetTime;
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

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = rate;
    }
  };

  const skipSeconds = (seconds: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const playNextTrack = () => {
    if (!activeTrack || filteredAudio.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * filteredAudio.length);
      setActiveTrack(filteredAudio[randomIndex]);
      return;
    }
    const currentIndex = filteredAudio.findIndex((a) => a.id === activeTrack.id);
    const nextIndex = (currentIndex + 1) % filteredAudio.length;
    setActiveTrack(filteredAudio[nextIndex]);
  };

  const playPrevTrack = () => {
    if (!activeTrack || filteredAudio.length === 0) return;
    const currentIndex = filteredAudio.findIndex((a) => a.id === activeTrack.id);
    const prevIndex = (currentIndex - 1 + filteredAudio.length) % filteredAudio.length;
    setActiveTrack(filteredAudio[prevIndex]);
  };

  const formatAudioTime = (secs: number): string => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTrack) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(5);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-5);
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTrack, isPlaying, duration, currentTime]);

  const isAllSelected = filteredAudio.length > 0 && selectedIds.size >= filteredAudio.length;
  const selectedItems = useMemo(() => audioFiles.filter(a => selectedIds.has(a.id)), [audioFiles, selectedIds]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto bg-neutral-950 text-neutral-100 font-sans select-none">
      {/* Hidden Audio File Input */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadAudio(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden Native Audio Element */}
      {activeAudioUrl && (
        <audio
          ref={audioElementRef}
          src={activeAudioUrl}
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
        />
      )}

      {/* 1. FILTER BAR & AUDIO HUB HEADER */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Tracks', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'recent', label: 'Recent', icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'starred', label: 'Starred', icon: <Star className="w-3.5 h-3.5 fill-amber-400/20 text-amber-400" /> },
            { id: 'music', label: 'Songs & Music', icon: <Music className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'voice', label: 'Voice & Recordings', icon: <Mic className="w-3.5 h-3.5 text-sky-400" /> },
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
          {filteredAudio.length > 0 && onSelectAll && (
            <button
              id="select-all-audio-btn"
              onClick={() => onSelectAll(!isAllSelected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold shadow-sm transition-all"
              title={isAllSelected ? "Deselect all (Ctrl+A)" : "Select all (Ctrl+A)"}
            >
              {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
            {filteredAudio.length} track{filteredAudio.length === 1 ? '' : 's'}
          </span>

          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Audio</span>
          </button>
        </div>
      </div>

      {/* Batch Toolbar when audio tracks are selected */}
      {selectedIds.size > 0 && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-wrap items-center justify-between gap-2 z-20 text-xs shadow-xl shrink-0 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {selectedIds.size} of {filteredAudio.length} selected
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
                onClick={() => selectedItems.forEach(a => onDownloadAudio(a))}
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

      {/* 2. SPECIALIZED AUDIO PLAYER BANNER (Now Playing Card) */}
      {activeTrack && (
        <div className="w-full bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border-b border-neutral-800 p-4 sm:p-5 shadow-2xl animate-in fade-in duration-150 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4 sm:gap-6">
            {/* Spinning Vinyl / Disc Visualizer */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xl group">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-neutral-800 to-sky-600 flex items-center justify-center border-4 border-neutral-900 shadow-inner ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                <div className="w-8 h-8 rounded-full bg-neutral-950 border-2 border-neutral-800 flex items-center justify-center">
                  <Disc className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Animated Equalizer Overlay */}
              {isPlaying && (
                <div className="absolute inset-x-0 bottom-1 flex items-end justify-center gap-0.5 h-4 px-2">
                  <span className="w-1 bg-emerald-400 rounded-t animate-pulse h-3" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 bg-emerald-400 rounded-t animate-pulse h-4" style={{ animationDelay: '0.3s' }} />
                  <span className="w-1 bg-emerald-400 rounded-t animate-pulse h-2" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 bg-emerald-400 rounded-t animate-pulse h-4" style={{ animationDelay: '0.4s' }} />
                </div>
              )}
            </div>

            {/* Track Info & Controls */}
            <div className="flex-1 flex flex-col gap-2.5 w-full min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono">
                      {getFileExtension(activeTrack.name) || 'AUDIO'}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      {activeTrack.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {formatBytes(activeTrack.size)} &bull; Added {formatDate(activeTrack.createdAt)}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTrack(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  title="Close player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrub Bar */}
              <div
                onClick={handleSeek}
                onMouseMove={handleSeekHover}
                onMouseLeave={handleSeekLeave}
                className="relative w-full h-2 group/scrub bg-neutral-800 rounded-full cursor-pointer flex items-center"
              >
                <div
                  className="h-full bg-emerald-400 rounded-full relative flex items-center transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 w-3 h-3 rounded-full bg-white shadow-md transform translate-x-1/2 scale-0 group-hover/scrub:scale-100 transition-transform" />
                </div>

                {hoverTime !== null && (
                  <div
                    className="absolute bottom-4 -translate-x-1/2 bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded text-[10px] font-mono text-white pointer-events-none shadow"
                    style={{ left: `${hoverPosition}%` }}
                  >
                    {formatAudioTime(hoverTime)}
                  </div>
                )}
              </div>

              {/* Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-white pt-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isShuffle ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Shuffle"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={playPrevTrack}
                    className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Previous track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => skipSeconds(-10)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-lg transition-all active:scale-95"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-neutral-950" /> : <Play className="w-5 h-5 fill-neutral-950 translate-x-0.5" />}
                  </button>

                  <button
                    onClick={() => skipSeconds(10)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
                    title="Forward 10s"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={playNextTrack}
                    className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Next track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (repeatMode === 'off') setRepeatMode('all');
                      else if (repeatMode === 'all') setRepeatMode('one');
                      else setRepeatMode('off');
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      repeatMode !== 'off' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                    }`}
                    title={`Repeat: ${repeatMode}`}
                  >
                    {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[11px] font-mono text-neutral-400">
                    <span>{formatAudioTime(currentTime)}</span>
                    <span className="mx-1 text-neutral-600">/</span>
                    <span>{formatAudioTime(duration)}</span>
                  </div>

                  {/* Playback Speed */}
                  <div className="flex items-center bg-white/10 rounded-lg text-[10px] font-semibold">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
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

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="p-1 rounded-lg text-neutral-300 hover:text-white transition-colors"
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
                      className="w-16 h-1 accent-emerald-400 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. AUDIO TRACK LIST & CARDS */}
      <div className="p-4 sm:p-5 flex-1">
        {filteredAudio.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center border-2 border-dashed border-neutral-800 rounded-3xl">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3 shadow-md">
              <Music className="w-7 h-7 text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">No Audio Tracks Available</h4>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Upload MP3, WAV, OGG, FLAC, M4A, or AAC audio files to listen offline.
            </p>
            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Audio</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 pb-12 max-w-5xl mx-auto">
            {/* List Header */}
            <div className="flex items-center justify-between px-3.5 py-2 text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-800 mb-2">
              <span className="flex-1">Track Name</span>
              <div className="flex items-center gap-6">
                <span className="hidden md:inline">Format</span>
                <span className="w-20 text-right">Size</span>
                <span className="w-28 text-right">Actions</span>
              </div>
            </div>

            {filteredAudio.map((track, idx) => {
              const isCurrent = activeTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  id={`audio-row-${track.id}`}
                  onClick={() => setActiveTrack(track)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs select-none transition-all cursor-pointer border min-h-[54px] active:scale-[0.99] ${
                    isCurrent
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-neutral-900/50 hover:bg-neutral-900 text-neutral-200 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    {/* Index / Play indicator */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) togglePlay();
                        else setActiveTrack(track);
                      }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                        isCurrent
                          ? 'bg-emerald-400 border-emerald-400 text-neutral-950 shadow'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-neutral-950" />
                      ) : (
                        <Play className={`w-3.5 h-3.5 ${isCurrent ? 'fill-neutral-950' : 'fill-current translate-x-0.5'}`} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                          {track.name}
                        </span>
                        {track.favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono block">
                        Uploaded {formatDate(track.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-neutral-400 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-800 text-neutral-300 font-mono uppercase hidden md:inline">
                      {getFileExtension(track.name) || 'AUDIO'}
                    </span>

                    <span className="w-16 text-right font-mono text-[10px] sm:text-[11px] text-neutral-400">
                      {formatBytes(track.size)}
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(track)}
                        className={`p-1.5 rounded-xl border transition-colors ${
                          track.favorite
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                        title="Star track"
                      >
                        <Star className={`w-3.5 h-3.5 ${track.favorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      <button
                        onClick={() => onDownloadAudio(track)}
                        className="p-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteAudio(track)}
                        className="p-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors"
                        title="Delete to Bin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
