import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  Folder,
  FolderPlus,
  FilePlus,
  Check, 
  X,
  Code2,
  Palette,
  Braces,
  Terminal,
  Database,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  KeyRound,
} from 'lucide-react';
import { ViewMode } from '../types';

interface InlineNewItemCardProps {
  type: 'file' | 'folder';
  viewMode: ViewMode;
  onCommit: (name: string, type: 'file' | 'folder') => void;
  onCancel: () => void;
}

export const InlineNewItemCard: React.FC<InlineNewItemCardProps> = ({
  type,
  viewMode,
  onCommit,
  onCancel,
}) => {
  // Empty by default as requested
  const [inputValue, setInputValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Real-time file type detection
  const detectedType = useMemo(() => {
    if (type === 'folder') {
      return {
        label: inputValue.trim() ? 'Folder' : 'New Folder',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <Folder className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 fill-amber-500/20" />,
        miniIcon: <Folder className="w-4 h-4 text-amber-400" />,
      };
    }

    const clean = inputValue.trim();
    if (!clean) {
      return {
        label: 'New File',
        color: 'text-sky-400',
        bg: 'bg-sky-950/40 border-sky-800/60',
        icon: <FilePlus className="w-6 h-6 sm:w-8 sm:h-8 text-sky-400" />,
        miniIcon: <FilePlus className="w-4 h-4 text-sky-400" />,
      };
    }

    const dotIndex = clean.lastIndexOf('.');
    const ext = dotIndex !== -1 ? clean.substring(dotIndex).toLowerCase() : '';

    switch (ext) {
      case '.html':
      case '.htm':
        return {
          label: 'HTML5 Webpage',
          color: 'text-rose-400',
          bg: 'bg-rose-950/40 border-rose-800/60',
          icon: <FileCode className="w-6 h-6 sm:w-8 sm:h-8 text-rose-400" />,
          miniIcon: <FileCode className="w-4 h-4 text-rose-400" />,
        };
      case '.css':
      case '.scss':
      case '.less':
        return {
          label: 'CSS Stylesheet',
          color: 'text-sky-400',
          bg: 'bg-sky-950/40 border-sky-800/60',
          icon: <Palette className="w-6 h-6 sm:w-8 sm:h-8 text-sky-400" />,
          miniIcon: <Palette className="w-4 h-4 text-sky-400" />,
        };
      case '.js':
      case '.mjs':
      case '.cjs':
        return {
          label: 'JavaScript',
          color: 'text-amber-400',
          bg: 'bg-amber-950/40 border-amber-800/60',
          icon: <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />,
          miniIcon: <Code2 className="w-4 h-4 text-amber-400" />,
        };
      case '.ts':
        return {
          label: 'TypeScript',
          color: 'text-blue-400',
          bg: 'bg-blue-950/40 border-blue-800/60',
          icon: <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />,
          miniIcon: <Code2 className="w-4 h-4 text-blue-400" />,
        };
      case '.tsx':
      case '.jsx':
        return {
          label: 'React Component',
          color: 'text-cyan-400',
          bg: 'bg-cyan-950/40 border-cyan-800/60',
          icon: <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />,
          miniIcon: <Code2 className="w-4 h-4 text-cyan-400" />,
        };
      case '.json':
        return {
          label: 'JSON Data',
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/40 border-emerald-800/60',
          icon: <Braces className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />,
          miniIcon: <Braces className="w-4 h-4 text-emerald-400" />,
        };
      case '.py':
        return {
          label: 'Python Script',
          color: 'text-yellow-400',
          bg: 'bg-yellow-950/40 border-yellow-800/60',
          icon: <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />,
          miniIcon: <Terminal className="w-4 h-4 text-yellow-400" />,
        };
      case '.sql':
        return {
          label: 'SQL Query',
          color: 'text-teal-400',
          bg: 'bg-teal-950/40 border-teal-800/60',
          icon: <Database className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400" />,
          miniIcon: <Database className="w-4 h-4 text-teal-400" />,
        };
      case '.md':
      case '.markdown':
        return {
          label: 'Markdown Doc',
          color: 'text-indigo-400',
          bg: 'bg-indigo-950/40 border-indigo-800/60',
          icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />,
          miniIcon: <FileText className="w-4 h-4 text-indigo-400" />,
        };
      case '.csv':
        return {
          label: 'CSV Spreadsheet',
          color: 'text-green-400',
          bg: 'bg-green-950/40 border-green-800/60',
          icon: <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />,
          miniIcon: <FileSpreadsheet className="w-4 h-4 text-green-400" />,
        };
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
      case '.webp':
        return {
          label: 'Image Asset',
          color: 'text-purple-400',
          bg: 'bg-purple-950/40 border-purple-800/60',
          icon: <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />,
          miniIcon: <ImageIcon className="w-4 h-4 text-purple-400" />,
        };
      case '.mp3':
      case '.wav':
      case '.ogg':
        return {
          label: 'Audio File',
          color: 'text-pink-400',
          bg: 'bg-pink-950/40 border-pink-800/60',
          icon: <Music className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400" />,
          miniIcon: <Music className="w-4 h-4 text-pink-400" />,
        };
      case '.mp4':
      case '.webm':
      case '.mov':
        return {
          label: 'Video Clip',
          color: 'text-rose-400',
          bg: 'bg-rose-950/40 border-rose-800/60',
          icon: <Video className="w-6 h-6 sm:w-8 sm:h-8 text-rose-400" />,
          miniIcon: <Video className="w-4 h-4 text-rose-400" />,
        };
      case '.zip':
      case '.tar':
      case '.gz':
        return {
          label: 'Archive Package',
          color: 'text-amber-300',
          bg: 'bg-amber-950/40 border-amber-800/60',
          icon: <Archive className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300" />,
          miniIcon: <Archive className="w-4 h-4 text-amber-300" />,
        };
      case '.env':
      case '.config':
      case '.yaml':
      case '.yml':
        return {
          label: 'Config File',
          color: 'text-zinc-300',
          bg: 'bg-zinc-900 border-zinc-700',
          icon: <KeyRound className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />,
          miniIcon: <KeyRound className="w-4 h-4 text-zinc-300" />,
        };
      default:
        return {
          label: ext ? `${ext.toUpperCase()} File` : 'Document',
          color: 'text-neutral-300',
          bg: 'bg-neutral-900 border-neutral-700',
          icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-300" />,
          miniIcon: <FileText className="w-4 h-4 text-neutral-300" />,
        };
    }
  }, [inputValue, type]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onCommit(trimmed, type);
  };

  // GRID VIEW MODE
  if (viewMode === 'grid') {
    return (
      <div className="relative group bg-neutral-900/95 border-2 border-sky-500 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-2xl ring-4 ring-sky-500/25 animate-slide-down-spring">
        {/* Top Icon & Live Badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="p-2.5 sm:p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center">
            {detectedType.icon}
          </div>
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium ${detectedType.bg} ${detectedType.color}`}>
            {detectedType.label}
          </span>
        </div>

        {/* Input Box */}
        <div className="my-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-sky-500 rounded-lg text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            placeholder={type === 'folder' ? 'Folder name...' : 'filename.ext'}
          />
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mt-1 px-0.5">
            <span>Press <kbd className="text-white font-semibold">Enter</kbd> to save</span>
            <span><kbd className="text-neutral-500">Esc</kbd> to cancel</span>
          </div>
        </div>

        {/* Action Commit Buttons */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleSubmit(); }}
            disabled={!inputValue.trim()}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
            title="Create (Enter)"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </div>
      </div>
    );
  }

  // LIST / COMPACT VIEW MODE
  return (
    <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-neutral-900/95 border-2 border-sky-500/80 rounded-xl shadow-lg ring-2 ring-sky-500/20 animate-in fade-in duration-150 gap-2 mb-1.5">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 shrink-0">
          {detectedType.miniIcon}
        </div>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
            className="w-full max-w-sm px-2.5 py-1 bg-neutral-950 border border-sky-500 rounded-lg text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            placeholder={type === 'folder' ? 'Folder name...' : 'filename.ext'}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`hidden md:inline-block px-2 py-0.5 rounded-md border text-[10px] font-mono ${detectedType.bg} ${detectedType.color}`}>
          {detectedType.label}
        </span>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          title="Cancel (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleSubmit(); }}
          disabled={!inputValue.trim()}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white text-xs font-semibold shadow-sm"
          title="Create (Enter)"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Create</span>
        </button>
      </div>
    </div>
  );
};
