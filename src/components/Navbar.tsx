import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  Plus, 
  FilePlus, 
  FolderPlus,
  Folder,
  Upload, 
  FolderUp,
  Archive, 
  Grid, 
  List, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  PanelLeft, 
  ExternalLink, 
  WifiOff,
  Image as ImageIcon,
  Camera,
  DownloadCloud,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { ViewMode, SortOption, SortField } from '../types';

interface NavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onNewFile: () => void;
  onNewFolder?: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onUploadFilesWithPaths?: (items: { file: File; path: string }[]) => void;
  onUploadZip: (file: File) => void;
  isOfflineLoaded?: boolean;
  isOfflineLoading?: boolean;
  onLoadOffline?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortOption,
  onSortChange,
  onNewFile,
  onNewFolder,
  onUploadFiles,
  onUploadFilesWithPaths,
  onUploadZip,
  isOfflineLoaded = false,
  isOfflineLoading = false,
  onLoadOffline,
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState<boolean>(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleFieldSort = (field: SortField) => {
    if (sortOption.field === field) {
      onSortChange({
        field,
        order: sortOption.order === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSortChange({
        field,
        order: 'asc',
      });
    }
  };

  return (
    <header 
      id="app-navbar"
      className="relative h-14 sm:h-16 px-2 sm:px-4 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between gap-1.5 sm:gap-2.5 shrink-0 z-40 select-none max-w-full"
    >
      {/* Hidden File Inputs */}
      {/* 1. General Multiple Files Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* 2. Multiple Gallery Photos & Videos Input */}
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        ref={galleryInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* 3. Direct Camera / Capture Input */}
      <input
        type="file"
        accept="image/*,video/*"
        capture="environment"
        ref={cameraInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* 4. ZIP Archive Input */}
      <input
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        ref={zipInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadZip(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* 5. Folder / Directory Input */}
      <input
        type="file"
        // @ts-expect-error webkitdirectory is standard in browsers
        webkitdirectory="true"
        directory=""
        multiple
        ref={folderInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const fileList = Array.from(e.target.files);
            if (onUploadFilesWithPaths) {
              const items = fileList.map((f) => ({
                file: f,
                path: (f as any).webkitRelativePath || f.name,
              }));
              onUploadFilesWithPaths(items);
            } else {
              onUploadFiles(e.target.files);
            }
            e.target.value = '';
          }
        }}
      />

      {/* Left: Sidebar Toggle + Add / Upload Button */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[38px] min-h-[38px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center transition-colors ${
            isSidebarOpen ? 'bg-neutral-900 text-white' : ''
          }`}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="relative" ref={newMenuRef}>
          <button
            id="navbar-new-btn"
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:bg-neutral-300 text-neutral-950 text-xs font-semibold shadow-sm min-h-[38px] sm:min-h-[44px] transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-neutral-950" />
            <span className="hidden sm:inline">Upload / New</span>
            <span className="sm:hidden text-[11px]">Add</span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-950 transition-transform duration-200 ${isNewMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isNewMenuOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl py-1.5 z-50 divide-y divide-neutral-800 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="py-1">
                <button
                  id="menu-item-upload-files"
                  onClick={() => { setIsNewMenuOpen(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <Upload className="w-4 h-4 text-neutral-300" />
                  <div>
                    <span className="font-medium block">Upload Files</span>
                    <span className="text-[10px] text-neutral-400">Multiple documents, code, or any files</span>
                  </div>
                </button>

                <button
                  id="menu-item-upload-folder"
                  onClick={() => { setIsNewMenuOpen(false); folderInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <FolderUp className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-medium block">Upload Entire Folder</span>
                    <span className="text-[10px] text-neutral-400">Upload folder and its nested contents</span>
                  </div>
                </button>

                <button
                  id="menu-item-upload-gallery"
                  onClick={() => { setIsNewMenuOpen(false); galleryInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-neutral-300" />
                  <div>
                    <span className="font-medium block">Upload Photos &amp; Videos</span>
                    <span className="text-[10px] text-neutral-400">Gallery &amp; Camera Roll (Multiple)</span>
                  </div>
                </button>

                <button
                  id="menu-item-camera-capture"
                  onClick={() => { setIsNewMenuOpen(false); cameraInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-medium block">Camera / Take Photo</span>
                    <span className="text-[10px] text-neutral-400">Capture photo directly on device</span>
                  </div>
                </button>

                <button
                  id="menu-item-upload-zip"
                  onClick={() => { setIsNewMenuOpen(false); zipInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <Archive className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-medium block">Upload &amp; Extract ZIP</span>
                    <span className="text-[10px] text-neutral-400">Unpack zip archive into files</span>
                  </div>
                </button>
              </div>

              <div className="py-1">
                <button
                  id="menu-item-new-folder"
                  onClick={() => { setIsNewMenuOpen(false); if (onNewFolder) onNewFolder(); else onNewFile(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-medium block">Create New Folder</span>
                    <span className="text-[10px] text-neutral-400">New directory to organize items</span>
                  </div>
                </button>

                <button
                  id="menu-item-new-file"
                  onClick={() => { setIsNewMenuOpen(false); onNewFile(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-neutral-200 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 text-left min-h-[44px] transition-colors"
                >
                  <FilePlus className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-medium block">Create New File</span>
                    <span className="text-[10px] text-neutral-400">Text, HTML, Markdown, or Code</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Clean Search Bar */}
      <div className="flex-1 min-w-[70px] max-w-md relative mx-1 sm:mx-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 absolute left-2.5 sm:left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 sm:pl-9 pr-7 sm:pr-9 py-1.5 sm:py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 min-h-[36px] sm:min-h-[40px] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 sm:right-2 p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Load Offline Button (disappears once loaded) + Status + Open in Tab + Sort & View */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* "Load App Offline" Button - Appears when not yet loaded offline, disappears completely after loading */}
        {!isOfflineLoaded && onLoadOffline && (
          <button
            id="load-offline-btn"
            onClick={onLoadOffline}
            disabled={isOfflineLoading}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white text-xs font-semibold shadow-md min-h-[36px] sm:min-h-[40px] transition-all duration-300 animate-in fade-in zoom-in-95 cursor-pointer shrink-0 disabled:opacity-75"
            title="Pre-cache and load entire application for 100% offline access"
          >
            {isOfflineLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
                <span className="text-[11px] sm:text-xs">Loading Offline...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-100" />
                <span className="hidden sm:inline">Load App Offline</span>
                <span className="sm:hidden text-[11px]">Offline</span>
              </>
            )}
          </button>
        )}

        {/* Offline / Online Status Badge */}
        <div
          id="network-status-badge"
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-[11px] font-mono min-h-[36px] transition-colors ${
            isOnline 
              ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300' 
              : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
          }`}
          title={isOnline ? 'Connected (Offline cache active & ready in IndexedDB)' : 'Offline mode active (Loaded from local cache & IndexedDB)'}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden xl:inline">Offline Ready</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xl:inline">Offline Mode</span>
            </>
          )}
        </div>

        {/* Open App in Another Tab Link Button */}
        <a
          id="open-in-new-tab-link"
          href={typeof window !== 'undefined' ? window.location.href : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-xs text-neutral-200 hover:text-white min-h-[36px] sm:min-h-[44px] transition-colors"
          title="Open application in another browser tab"
        >
          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
          <span className="hidden lg:inline font-medium">Open in Tab</span>
        </a>

        {/* Sort Menu */}
        <div className="relative" ref={sortMenuRef}>
          <button
            id="navbar-sort-btn"
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-xs text-neutral-300 min-h-[36px] sm:min-h-[44px] transition-colors"
            title="Sort"
          >
            <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
            <span className="hidden md:inline capitalize">{sortOption.field}</span>
            {sortOption.order === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-neutral-400" /> : <ArrowDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {isSortMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase text-neutral-400">
                Sort Files By
              </div>
              {[
                { field: 'name' as SortField, label: 'Name' },
                { field: 'updatedAt' as SortField, label: 'Modified Date' },
                { field: 'size' as SortField, label: 'File Size' },
                { field: 'type' as SortField, label: 'Type / Extension' },
              ].map(({ field, label }) => {
                const isActive = sortOption.field === field;
                return (
                  <button
                    key={field}
                    onClick={() => handleFieldSort(field)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left min-h-[40px] transition-colors ${
                      isActive
                        ? 'bg-neutral-800 text-white font-semibold'
                        : 'text-neutral-300 hover:bg-neutral-800 active:bg-neutral-700'
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && (
                      <span className="text-[10px] uppercase text-neutral-300 font-mono">
                        {sortOption.order}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 sm:p-1">
          <button
            id="view-mode-grid"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 sm:p-2 rounded-lg text-xs min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            id="view-mode-list"
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 sm:p-2 rounded-lg text-xs min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

