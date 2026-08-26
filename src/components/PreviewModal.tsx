import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Image as ImageIcon,
  Video,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { VFile } from '../types';
import { 
  formatBytes, 
  isImage, 
  isVideo,
  isImageOrVideo
} from '../utils/fileUtils';

interface PreviewModalProps {
  file: VFile | null;
  onClose: () => void;
  onDelete?: (file: VFile) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  file,
  onClose,
  onDelete,
}) => {
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Image zoom & rotate
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const blobUrlRef = useRef<string | null>(null);

  const cleanupCreatedBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!file || !isImageOrVideo(file)) {
      cleanupCreatedBlob();
      return;
    }

    setLoading(true);
    setZoom(1);
    setRotation(0);
    cleanupCreatedBlob();

    const loadContent = () => {
      try {
        let blob = file.blob;
        if (!blob && file.textContent !== undefined) {
          blob = new Blob([file.textContent], { type: file.mimeType });
        }

        if (blob) {
          const directUrl = URL.createObjectURL(blob);
          blobUrlRef.current = directUrl;
          setMediaBlobUrl(directUrl);
        }
      } catch (err) {
        console.error('Failed to load media preview', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();

    return () => {
      cleanupCreatedBlob();
    };
  }, [file]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Only render if file exists and is strictly an Image or Video
  if (!file || !isImageOrVideo(file)) {
    return null;
  }

  const handleDownload = () => {
    let blob = file.blob;
    if (!blob && file.textContent !== undefined) {
      blob = new Blob([file.textContent], { type: file.mimeType });
    }
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewTab = () => {
    let blob = file.blob;
    if (!blob && file.textContent !== undefined) {
      blob = new Blob([file.textContent], { type: file.mimeType });
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const handleDeleteCurrent = () => {
    if (onDelete) {
      onDelete(file);
    }
    onClose();
  };

  return (
    <div 
      id="preview-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 md:p-6 animate-in fade-in duration-150"
    >
      <div 
        id="preview-modal-container"
        onClick={(e) => e.stopPropagation()}
        className={`bg-neutral-950 border border-neutral-800 flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'w-full h-full rounded-none border-0' 
            : 'w-full max-w-5xl h-full sm:h-[88dvh] rounded-none sm:rounded-3xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900 border-b border-neutral-800 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 rounded-xl bg-neutral-800 text-white shrink-0 border border-neutral-700">
              {isImage(file) ? <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-semibold text-neutral-100 truncate">
                {file.name}
              </h2>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate font-mono">
                {formatBytes(file.size)} &bull; {file.mimeType}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              id="preview-btn-open-tab"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-neutral-200 active:bg-neutral-300 text-neutral-950 text-xs font-semibold min-h-[36px] sm:min-h-[40px] shadow-sm transition-colors"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-950" />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>

            <button
              id="preview-btn-download"
              onClick={handleDownload}
              className="p-2 sm:p-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center transition-colors"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="preview-btn-delete"
              onClick={handleDeleteCurrent}
              className="p-2 sm:p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center transition-colors"
              title="Delete File"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              id="preview-btn-fullscreen"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:flex p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[40px] min-h-[40px] items-center justify-center transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              id="preview-btn-close"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Media Content Area */}
        <div className="flex-1 overflow-auto bg-neutral-950 relative flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin text-white" />
              <p className="text-xs">Loading media...</p>
            </div>
          ) : (
            <>
              {/* IMAGE VIEWER */}
              {isImage(file) && (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden select-none">
                  {/* Floating Zoom & Rotate Controls */}
                  <div className="absolute bottom-4 sm:bottom-6 z-10 flex items-center gap-1 sm:gap-1.5 bg-neutral-900/95 border border-neutral-700 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-2xl text-neutral-200 text-xs">
                    <button
                      onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
                      className="p-1 sm:p-1.5 hover:text-white min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <span className="font-mono text-[10px] sm:text-[11px] px-1">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(z => Math.min(4, z + 0.2))}
                      className="p-1 sm:p-1.5 hover:text-white min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <div className="w-px h-3.5 bg-neutral-700 mx-1" />
                    <button
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="p-1 sm:p-1.5 hover:text-white min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center"
                      title="Rotate 90deg"
                    >
                      <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => { setZoom(1); setRotation(0); }}
                      className="text-[11px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 ml-0.5 sm:ml-1"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img
                      src={mediaBlobUrl}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    />
                  </div>
                </div>
              )}

              {/* VIDEO PLAYER */}
              {isVideo(file) && (
                <div className="w-full h-full flex items-center justify-center p-2 sm:p-8">
                  <video
                    id="preview-video-player"
                    controls
                    autoPlay
                    src={mediaBlobUrl}
                    className="max-w-full max-h-full rounded-2xl shadow-2xl border border-neutral-800"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
