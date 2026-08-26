import React from 'react';
import { 
  Files, 
  Star, 
  Clock, 
  Trash2, 
  FileText, 
  Image, 
  Music, 
  Video, 
  Code, 
  Archive, 
  HardDrive,
  ExternalLink,
  X
} from 'lucide-react';
import { VFile, FileCategory, StorageStats } from '../types';
import { formatBytes, isFolder } from '../utils/fileUtils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: FileCategory;
  isStarredView: boolean;
  isRecentView: boolean;
  isTrashView: boolean;
  allFiles: VFile[];
  storageStats: StorageStats;
  onSelectAllFiles: () => void;
  onSelectCategory: (category: FileCategory) => void;
  onSelectStarred: () => void;
  onSelectRecent: () => void;
  onSelectTrash: () => void;
  onOpenStorageModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  isStarredView,
  isRecentView,
  isTrashView,
  allFiles,
  storageStats,
  onSelectAllFiles,
  onSelectCategory,
  onSelectStarred,
  onSelectRecent,
  onSelectTrash,
  onOpenStorageModal,
}) => {
  const activeFiles = allFiles.filter(f => !f.trashed);
  const activeFileCount = activeFiles.filter(f => !isFolder(f)).length;
  const trashedCount = allFiles.filter(f => f.trashed).length;
  const starredCount = allFiles.filter(f => f.favorite && !f.trashed).length;

  const isAllActive = !isTrashView && !isStarredView && !isRecentView && selectedCategory === 'all';
  const usagePercent = Math.min(100, Math.max(1, Math.round((storageStats.usage / (storageStats.quota || 1)) * 100)));

  return (
    <>
      {/* Mobile/Tablet Backdrop for overlay mode */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        id="app-sidebar"
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 md:w-60 bg-neutral-950 md:bg-neutral-950 backdrop-blur-xl md:backdrop-blur-none
          border-r border-neutral-800 flex flex-col h-full shrink-0 select-none
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${!isOpen ? 'md:hidden' : ''}
        `}
      >
        {/* Header with iPad style */}
        <div className="h-16 px-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white flex items-center justify-center border border-neutral-700 shadow-sm">
              <Files className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white text-sm tracking-tight block">LocalDrive</span>
              <span className="text-[10px] text-neutral-400 font-mono">Offline &bull; IndexedDB</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List with 44px min touch height */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Main views */}
          <div className="space-y-1">
            <button
              id="sidebar-all-files"
              onClick={() => { onSelectAllFiles(); if (window.innerWidth < 768) onClose(); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-colors min-h-[44px] active:scale-[0.98] ${
                isAllActive
                  ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white active:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Files className={`w-4 h-4 ${isAllActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
                <span>All Files</span>
              </div>
              <span className="text-xs opacity-80 font-mono">{activeFileCount}</span>
            </button>

            <button
              id="sidebar-starred"
              onClick={() => { onSelectStarred(); if (window.innerWidth < 768) onClose(); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-colors min-h-[44px] active:scale-[0.98] ${
                isStarredView
                  ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white active:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${isStarredView ? 'text-neutral-950 fill-neutral-950' : 'text-neutral-400'}`} />
                <span>Starred</span>
              </div>
              {starredCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  isStarredView ? 'bg-neutral-950 text-white' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {starredCount}
                </span>
              )}
            </button>

            <button
              id="sidebar-recent"
              onClick={() => { onSelectRecent(); if (window.innerWidth < 768) onClose(); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-colors min-h-[44px] active:scale-[0.98] ${
                isRecentView
                  ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white active:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className={`w-4 h-4 ${isRecentView ? 'text-neutral-950' : 'text-neutral-400'}`} />
                <span>Recent</span>
              </div>
            </button>

            <button
              id="sidebar-trash"
              onClick={() => { onSelectTrash(); if (window.innerWidth < 768) onClose(); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-colors min-h-[44px] active:scale-[0.98] ${
                isTrashView
                  ? 'bg-neutral-800 text-white border border-neutral-700 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200 active:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-neutral-400" />
                <span>Trash</span>
              </div>
              {trashedCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-300">
                  {trashedCount}
                </span>
              )}
            </button>
          </div>

          {/* Categories */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Categories
              </span>
            </div>
            <div className="space-y-1">
              {[
                { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4 text-neutral-400" /> },
                { id: 'images', label: 'Images', icon: <Image className="w-4 h-4 text-neutral-400" /> },
                { id: 'code', label: 'Code & HTML', icon: <Code className="w-4 h-4 text-neutral-400" /> },
                { id: 'archives', label: 'ZIP Archives', icon: <Archive className="w-4 h-4 text-neutral-400" /> },
                { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4 text-neutral-400" /> },
                { id: 'video', label: 'Video', icon: <Video className="w-4 h-4 text-neutral-400" /> },
              ].map(cat => {
                const isSelected = selectedCategory === cat.id && !isTrashView && !isStarredView && !isRecentView;
                return (
                  <button
                    key={cat.id}
                    id={`category-${cat.id}`}
                    onClick={() => {
                      onSelectCategory(cat.id as FileCategory);
                      if (window.innerWidth < 768) onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors min-h-[40px] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900 active:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {cat.icon}
                      <span>{cat.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Storage Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 shrink-0 space-y-2">
          <a
            id="sidebar-open-tab-btn"
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              Open in New Tab
            </span>
            <span className="text-[10px] uppercase font-mono text-neutral-500">TAB</span>
          </a>

          <div 
            onClick={onOpenStorageModal}
            className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-200 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                Storage
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">{formatBytes(storageStats.usage)}</span>
            </div>

            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
