import React, { useState } from 'react';
import { 
  Upload, 
  Archive, 
  Download, 
  Trash2, 
  RotateCcw, 
  Star, 
  CheckSquare, 
  Square, 
  AlertCircle,
  FilePlus,
  FolderPlus,
  Files,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Folder
} from 'lucide-react';
import { VFile, ViewMode, SortOption } from '../types';
import { isFolder } from '../utils/fileUtils';
import { FileItemCard } from './FileItemCard';
import { InlineNewItemCard } from './InlineNewItemCard';

interface FileListProps {
  files: VFile[];
  allFiles: VFile[];
  viewMode: ViewMode;
  sortOption: SortOption;
  selectedIds: Set<string>;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  renamingItemId: string | null;
  inlineCreatingType?: 'file' | 'folder' | null;
  onInlineCreateCommit?: (name: string, type: 'file' | 'folder') => void;
  onInlineCreateCancel?: () => void;
  isTrashView: boolean;
  currentFolderId?: string | null;
  folderBreadcrumbs?: VFile[];
  onNavigateFolder?: (folderId: string | null) => void;
  onNavigateBack?: () => void;
  onSelect: (item: VFile, e: React.MouseEvent | React.TouchEvent) => void;
  onToggleSelect: (item: VFile, e: React.MouseEvent | React.TouchEvent) => void;
  onSelectAll: (select: boolean) => void;
  onDoubleClick: (item: VFile) => void;
  onOpenInTab: (item: VFile) => void;
  onContextMenu: (item: VFile, e: React.MouseEvent) => void;
  onBlankContextMenu: (e: React.MouseEvent) => void;
  onToggleFavorite: (items: VFile[]) => void;
  onRenameSubmit: (item: VFile, newName: string) => void;
  onRenameCancel: () => void;
  onBatchDownload: (items: VFile[]) => void;
  onBatchZip: (items: VFile[]) => void;
  onBatchDelete: (items: VFile[], permanent?: boolean) => void;
  onBatchRestore: (items: VFile[]) => void;
  onNewFile: () => void;
  onNewFolder?: () => void;
  onTriggerUpload: () => void;
  onUploadFilesWithPaths?: (items: { file: File; path: string }[]) => void;
  onUploadFiles?: (files: FileList | File[]) => void;
  onEmptyTrash: () => void;
  onMoveItemToFolder?: (draggedItemId: string, targetFolderId: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  allFiles,
  viewMode,
  sortOption,
  selectedIds,
  isSelectMode,
  onToggleSelectMode,
  renamingItemId,
  inlineCreatingType = null,
  onInlineCreateCommit,
  onInlineCreateCancel,
  isTrashView,
  currentFolderId = null,
  folderBreadcrumbs = [],
  onNavigateFolder,
  onNavigateBack,
  onSelect,
  onToggleSelect,
  onSelectAll,
  onDoubleClick,
  onOpenInTab,
  onContextMenu,
  onBlankContextMenu,
  onToggleFavorite,
  onRenameSubmit,
  onRenameCancel,
  onBatchDownload,
  onBatchZip,
  onBatchDelete,
  onBatchRestore,
  onNewFile,
  onNewFolder,
  onTriggerUpload,
  onUploadFilesWithPaths,
  onUploadFiles,
  onEmptyTrash,
  onMoveItemToFolder,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const selectedItems = files.filter(f => selectedIds.has(f.id));
  const isAllSelected = files.length > 0 && selectedIds.size === files.length;
  const fileCount = files.filter(f => !isFolder(f)).length;
  const folderCount = files.filter(f => isFolder(f)).length;

  // Recursively read dropped items (files and nested folders)
  const scanFilesAndFolders = async (dataTransfer: DataTransfer): Promise<{ file: File; path: string }[]> => {
    const results: { file: File; path: string }[] = [];
    const items = dataTransfer.items;
    if (!items || items.length === 0) return results;

    const readEntry = async (entry: any, path: string): Promise<void> => {
      if (entry.isFile) {
        const file: File = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        results.push({ file, path: path ? `${path}/${file.name}` : file.name });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries: any[] = await new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        const newPath = path ? `${path}/${entry.name}` : entry.name;
        for (const subEntry of entries) {
          await readEntry(subEntry, newPath);
        }
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(readEntry(entry, ''));
        }
      } else {
        const file = item.getAsFile();
        if (file) {
          results.push({ file, path: file.name });
        }
      }
    }

    await Promise.all(promises);
    return results;
  };

  // Drag and drop handlers on full file area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isTrashView) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isTrashView) return;

    if (e.dataTransfer.types.includes('application/x-localcloud-item')) {
      return;
    }

    try {
      const scanned = await scanFilesAndFolders(e.dataTransfer);
      if (scanned.length > 0 && onUploadFilesWithPaths) {
        onUploadFilesWithPaths(scanned);
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFiles) {
        onUploadFiles(e.dataTransfer.files);
      }
    } catch (err) {
      console.error('Failed to parse drag and drop entries:', err);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFiles) {
        onUploadFiles(e.dataTransfer.files);
      }
    }
  };

  return (
    <div 
      id="file-list-container"
      className={`flex-1 flex flex-col min-w-0 bg-neutral-950 overflow-hidden relative select-none ${
        isDragOver ? 'ring-2 ring-sky-500 bg-sky-950/20' : ''
      }`}
      onContextMenu={onBlankContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Folder Navigation & Breadcrumbs Bar */}
      {!isTrashView && (folderBreadcrumbs.length > 0 || currentFolderId) && (
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-neutral-900/60 border-b border-neutral-800/80 text-xs text-neutral-300 shrink-0 overflow-x-auto no-scrollbar">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors mr-1"
              title="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onNavigateFolder && onNavigateFolder(null)}
            className={`px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1 ${
              !currentFolderId ? 'font-semibold text-white bg-neutral-800' : 'text-neutral-400'
            }`}
          >
            <span>Drive</span>
          </button>

          {folderBreadcrumbs.map((folder, index) => {
            const isLast = index === folderBreadcrumbs.length - 1;
            return (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <button
                  onClick={() => onNavigateFolder && onNavigateFolder(folder.id)}
                  className={`px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors truncate max-w-[150px] sm:max-w-[200px] flex items-center gap-1.5 ${
                    isLast ? 'font-semibold text-white bg-neutral-800' : 'text-neutral-400'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-sky-950/85 backdrop-blur-sm border-2 border-dashed border-sky-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <Upload className="w-12 h-12 text-sky-400 animate-bounce mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-white mb-1">Drop Files or Entire Folders Here</h3>
          <p className="text-xs text-sky-200">Automatically uploads to your active directory</p>
        </div>
      )}

      {/* Sticky Action Sub-Bar */}
      <div className="px-3 sm:px-4 py-2 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Count / Mode */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 min-w-0">
          {isTrashView ? (
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Trash Bin ({files.length})
            </span>
          ) : (
            <div className="flex items-center gap-2 font-mono text-[11px] truncate">
              {folderCount > 0 && (
                <span className="flex items-center gap-1 text-neutral-300">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
                </span>
              )}
              {folderCount > 0 && fileCount > 0 && <span>&bull;</span>}
              {fileCount > 0 && (
                <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
              )}
              {files.length === 0 && <span>Empty Directory</span>}
            </div>
          )}
        </div>

        {/* Right: Quick Batch Selection Toolbar if items selected */}
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-1 sm:gap-2 animate-in fade-in duration-100">
              <span className="text-xs font-mono text-sky-400 font-semibold px-2 py-0.5 rounded-md bg-sky-950 border border-sky-800">
                {selectedIds.size} selected
              </span>

              <button
                id="btn-select-all"
                onClick={() => onSelectAll(!isAllSelected)}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                title={isAllSelected ? 'Deselect All' : 'Select All'}
              >
                {isAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isAllSelected ? 'Deselect All' : 'Select All'}</span>
              </button>

              {isTrashView ? (
                <>
                  <button
                    onClick={() => onBatchRestore(selectedItems)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                    title="Restore Selected"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span className="hidden md:inline">Restore</span>
                  </button>
                  <button
                    onClick={() => onBatchDelete(selectedItems, true)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs flex items-center gap-1.5 transition-colors"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Delete Perm</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onToggleFavorite(selectedItems)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                    title="Favorite Selected"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Favorite</span>
                  </button>
                  <button
                    onClick={() => onBatchDownload(selectedItems)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                    title="Download Selected"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Download</span>
                  </button>
                  <button
                    onClick={() => onBatchZip(selectedItems)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                    title="Zip Selected"
                  >
                    <Archive className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Zip</span>
                  </button>
                  <button
                    onClick={() => onBatchDelete(selectedItems, false)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-900 hover:bg-rose-950/80 border border-neutral-800 hover:border-rose-800 text-neutral-400 hover:text-rose-200 text-xs flex items-center gap-1.5 transition-colors"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Trash</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={onNewFile}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs transition-colors"
                title="Create New File (Inline)"
              >
                <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">New File</span>
              </button>
              {onNewFolder && (
                <button
                  onClick={onNewFolder}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs transition-colors"
                  title="Create New Folder (Inline)"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trash View Notification Banner */}
      {isTrashView && files.length > 0 && (
        <div className="mx-3 sm:mx-4 mt-2 px-3.5 py-2 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Items in trash are stored safely and can be restored anytime.</span>
          </div>
          <button
            onClick={onEmptyTrash}
            className="px-2.5 py-1 rounded-xl bg-rose-900 hover:bg-rose-800 text-white text-[11px] font-semibold transition-colors shrink-0"
          >
            Empty Trash
          </button>
        </div>
      )}

      {/* Main Files Area */}
      <div 
        id="file-list-scrollable"
        className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 pb-24 sm:pb-16"
      >
        {files.length === 0 && !inlineCreatingType ? (
          // Empty State
          <div className="h-full min-h-[280px] sm:min-h-[360px] flex flex-col items-center justify-center text-center p-6 sm:p-8 border-2 border-dashed border-neutral-800 rounded-3xl">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
              {isTrashView ? <Trash2 className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-400" /> : <Files className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-300" />}
            </div>

            <h3 className="text-sm sm:text-base font-semibold text-neutral-100 mb-1">
              {isTrashView ? 'Trash is Empty' : 'No Files in Drive'}
            </h3>

            <p className="text-xs text-neutral-400 max-w-sm mb-5 sm:mb-6 leading-relaxed">
              {isTrashView
                ? 'Deleted files will appear here.'
                : 'Upload files from your device, drop them anywhere, or create a new file.'}
            </p>

            {!isTrashView && (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                <button
                  id="empty-state-upload"
                  onClick={onTriggerUpload}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:bg-neutral-300 text-neutral-950 text-xs font-semibold shadow-sm min-h-[40px] sm:min-h-[44px] transition-all active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4 text-neutral-950" />
                  <span>Upload Files</span>
                </button>
                <button
                  id="empty-state-new-file"
                  onClick={onNewFile}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold min-h-[40px] sm:min-h-[44px] transition-all active:scale-[0.98]"
                >
                  <FilePlus className="w-4 h-4 text-sky-400" />
                  <span>New File</span>
                </button>
                <button
                  id="empty-state-new-folder"
                  onClick={() => { if (onNewFolder) onNewFolder(); else onNewFile(); }}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold min-h-[40px] sm:min-h-[44px] transition-all active:scale-[0.98]"
                >
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                  <span>New Folder</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <div className="space-y-1.5">
                {/* List Header */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 mb-2 select-none">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onSelectAll(!isAllSelected)}
                      className="hover:text-white shrink-0"
                      title={isAllSelected ? 'Deselect all' : 'Select all'}
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-neutral-500" />}
                    </button>
                    <span className="truncate">File Name</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <span className="hidden md:inline">Modified</span>
                    <span className="w-14 sm:w-16 text-right">Size</span>
                    <span className="w-24 sm:w-28 text-right">Actions</span>
                  </div>
                </div>

                {/* Inline Creation Card at Top of List */}
                {inlineCreatingType && (
                  <InlineNewItemCard
                    type={inlineCreatingType}
                    viewMode="list"
                    onCommit={(name, type) => onInlineCreateCommit && onInlineCreateCommit(name, type)}
                    onCancel={() => onInlineCreateCancel && onInlineCreateCancel()}
                  />
                )}

                {files.map(item => (
                  <FileItemCard
                    key={item.id}
                    item={item}
                    allFiles={allFiles}
                    viewMode="list"
                    isSelected={selectedIds.has(item.id)}
                    isSelectMode={isSelectMode}
                    isRenaming={renamingItemId === item.id}
                    onSelect={onSelect}
                    onToggleSelect={onToggleSelect}
                    onDoubleClick={onDoubleClick}
                    onOpenInTab={onOpenInTab}
                    onContextMenu={onContextMenu}
                    onToggleFavorite={(item) => onToggleFavorite([item])}
                    onDelete={(item, e) => {
                      e.stopPropagation();
                      onBatchDelete([item], isTrashView);
                    }}
                    onRenameSubmit={onRenameSubmit}
                    onRenameCancel={onRenameCancel}
                    onMoveItemToFolder={onMoveItemToFolder}
                  />
                ))}
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                {/* Inline Creation Card at Top of Grid */}
                {inlineCreatingType && (
                  <InlineNewItemCard
                    type={inlineCreatingType}
                    viewMode="grid"
                    onCommit={(name, type) => onInlineCreateCommit && onInlineCreateCommit(name, type)}
                    onCancel={() => onInlineCreateCancel && onInlineCreateCancel()}
                  />
                )}

                {files.map(item => (
                  <FileItemCard
                    key={item.id}
                    item={item}
                    allFiles={allFiles}
                    viewMode="grid"
                    isSelected={selectedIds.has(item.id)}
                    isSelectMode={isSelectMode}
                    isRenaming={renamingItemId === item.id}
                    onSelect={onSelect}
                    onToggleSelect={onToggleSelect}
                    onDoubleClick={onDoubleClick}
                    onOpenInTab={onOpenInTab}
                    onContextMenu={onContextMenu}
                    onToggleFavorite={(item) => onToggleFavorite([item])}
                    onDelete={(item, e) => {
                      e.stopPropagation();
                      onBatchDelete([item], isTrashView);
                    }}
                    onRenameSubmit={onRenameSubmit}
                    onRenameCancel={onRenameCancel}
                    onMoveItemToFolder={onMoveItemToFolder}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
