import React, { useState, useEffect } from 'react';
import { 
  X, 
  Info, 
  Hash, 
  Tag, 
  Calendar, 
  HardDrive, 
  FileText, 
  Folder, 
  Copy, 
  Check, 
  Sparkles,
  Camera,
  Layers,
  Edit3,
  Save
} from 'lucide-react';
import { VFile, ColorTag } from '../types';
import { formatBytes, formatDate, isFolder, getFileExtension } from '../utils/fileUtils';

interface FilePropertiesModalProps {
  file: VFile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateFile: (updatedFile: VFile) => void;
}

const COLOR_OPTIONS: { id: ColorTag; label: string; bg: string; border: string }[] = [
  { id: null, label: 'None', bg: 'bg-neutral-800', border: 'border-neutral-700' },
  { id: 'red', label: 'Red', bg: 'bg-rose-500', border: 'border-rose-400' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', border: 'border-orange-400' },
  { id: 'yellow', label: 'Yellow', bg: 'bg-amber-400', border: 'border-amber-300' },
  { id: 'green', label: 'Green', bg: 'bg-emerald-500', border: 'border-emerald-400' },
  { id: 'blue', label: 'Blue', bg: 'bg-sky-500', border: 'border-sky-400' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', border: 'border-purple-400' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500', border: 'border-pink-400' },
];

export const FilePropertiesModal: React.FC<FilePropertiesModalProps> = ({
  file,
  isOpen,
  onClose,
  onUpdateFile,
}) => {
  const [hash, setHash] = useState<string>('');
  const [isCalculatingHash, setIsCalculatingHash] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<ColorTag>(null);
  const [notes, setNotes] = useState<string>('');
  const [imageMeta, setImageMeta] = useState<{ width?: number; height?: number } | null>(null);

  useEffect(() => {
    if (!file) return;

    setSelectedColor(file.colorTag || null);
    setNotes(file.notes || file.description || '');
    setHash(file.hash || '');
    setImageMeta(file.exif || null);

    // Compute SHA-256 Hash if blob is available and hash not yet cached
    if (file.blob && !file.hash && !isFolder(file)) {
      setIsCalculatingHash(true);
      file.blob.arrayBuffer()
        .then(buffer => crypto.subtle.digest('SHA-256', buffer))
        .then(hashBuffer => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setHash(hex);
          onUpdateFile({ ...file, hash: hex });
        })
        .catch(err => console.warn('Could not compute SHA-256 hash', err))
        .finally(() => setIsCalculatingHash(false));
    }

    // Inspect Image dimensions if image file
    if (file.blob && file.mimeType.startsWith('image/') && (!file.exif || !file.exif.width)) {
      const url = URL.createObjectURL(file.blob);
      const img = new Image();
      img.onload = () => {
        const meta = { width: img.naturalWidth, height: img.naturalHeight };
        setImageMeta(meta);
        onUpdateFile({ ...file, exif: meta });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleCopyHash = () => {
    if (hash) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleSaveColor = (color: ColorTag) => {
    setSelectedColor(color);
    onUpdateFile({ ...file, colorTag: color });
  };

  const handleSaveNotes = () => {
    onUpdateFile({ ...file, notes, description: notes });
  };

  return (
    <div 
      id="file-properties-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
    >
      <div 
        id="file-properties-modal-container"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center shadow-sm">
              {isFolder(file) ? <Folder className="w-4 h-4 text-amber-400" /> : <Info className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight truncate max-w-[260px] sm:max-w-[320px]">
                {file.name}
              </h3>
              <span className="text-[10px] text-neutral-400 font-mono">File Properties &amp; Metadata</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-neutral-300">
          {/* General Information Card */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-neutral-400 text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                File Details
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 uppercase">
                {isFolder(file) ? 'DIRECTORY' : getFileExtension(file.name) || 'FILE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
              <div>
                <span className="text-neutral-500 block">Size:</span>
                <span className="text-white font-semibold">{formatBytes(file.size)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">MIME Type:</span>
                <span className="text-neutral-200 truncate block">{file.mimeType || 'unknown'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Created:</span>
                <span className="text-neutral-300">{formatDate(file.createdAt)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Modified:</span>
                <span className="text-neutral-300">{formatDate(file.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Color Tag Selector */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 font-semibold text-neutral-300 text-xs">
              <Tag className="w-3.5 h-3.5 text-sky-400" />
              <span>Color Tag</span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map((opt) => {
                const isSelected = selectedColor === opt.id;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSaveColor(opt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? `${opt.bg} text-white border-white shadow-md font-bold ring-2 ring-white/30`
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    {opt.id && <span className={`w-2.5 h-2.5 rounded-full ${opt.bg}`} />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SHA-256 Hash Checksum Card (For Files) */}
          {!isFolder(file) && (
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  SHA-256 Checksum Hash
                </span>

                {hash && (
                  <button
                    onClick={handleCopyHash}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 font-mono text-[10px] break-all text-emerald-400 select-all">
                {isCalculatingHash ? (
                  <span className="text-neutral-500 animate-pulse">Calculating SHA-256 hash...</span>
                ) : hash ? (
                  hash
                ) : (
                  <span className="text-neutral-500">Hash unavailable</span>
                )}
              </div>
            </div>
          )}

          {/* Image EXIF / Media Metadata Card */}
          {imageMeta && (imageMeta.width || imageMeta.height) && (
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 space-y-2">
              <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                Image &amp; Media Dimensions
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-neutral-500 block">Resolution:</span>
                  <span className="text-white font-semibold">{imageMeta.width} &times; {imageMeta.height} px</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Aspect Ratio:</span>
                  <span className="text-neutral-300">
                    {imageMeta.width && imageMeta.height ? (imageMeta.width / imageMeta.height).toFixed(2) : '1.0'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Editable Notes / Description */}
          <div className="space-y-2">
            <label className="flex items-center justify-between font-semibold text-neutral-300 text-xs">
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Notes &amp; Description</span>
              </span>
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                <Save className="w-3 h-3" />
                <span>Save Notes</span>
              </button>
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Add notes, tags, or description for this file..."
              className="w-full h-20 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 font-sans resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
