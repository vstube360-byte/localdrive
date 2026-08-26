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

interface FileListProps {
  files: VFile[];
  allFiles: VFile[];
  viewMode: ViewMode;
  sortOption: SortOption;
  selectedIds: Set<string>;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  renamingItemId: string | null;
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
        return new Promise((resolve) => {
          entry.file((file: File) => {
            results.push({ file, path: path ? `${path}/${file.name}` : file.name });
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
          const readEntries = () => {
            dirReader.readEntries(async (entries: any[]) => {
              if (entries.length === 0) {
                resolve();
              } else {
                for (const subEntry of entries) {
                  await readEntry(subEntry, path ? `${path}/${entry.name}` : entry.name);
                }
                readEntries();
              }
            }, () => resolve());
          };
          readEntries();
        });
      }
    };

    const entries: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
      }
    }

    for (const entry of entries) {
      await readEntry(entry, '');
    }
    return results;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const scanned = await scanFilesAndFolders(e.dataTransfer);
      if (scanned.length > 0 && onUploadFilesWithPaths) {
        onUploadFilesWithPaths(scanned);
        return;
      }
    } catch (err) {
      console.warn('Folder drag and drop scan fallback:', err);
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFiles) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      id="file-list-container"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden relative select-none w-full max-w-full transition-colors ${
        isDragOver ? 'bg-sky-950/20 ring-2 ring-sky-500/50 ring-inset' : ''
      }`}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).id === 'file-list-container' || (e.target as HTMLElement).id === 'file-list-scrollable') {
          e.preventDefault();
          onBlankContextMenu(e);
        }
      }}
    >
      {/* Drag & Drop Visual Overlay Banner */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-sky-950/80 backdrop-blur-sm border-2 border-dashed border-sky-400 rounded-2xl m-2 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center mb-3 animate-bounce">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Drop Files or Folders Here</h3>
          <p className="text-xs text-sky-200">Release to upload files and nested directory trees directly</p>
        </div>
      )}

      {/* Breadcrumb Navigation Bar for Real Folders */}
      {!isTrashView && (
        <div className="mx-2.5 sm:mx-4 mt-2 sm:mt-2.5 px-3 py-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs text-neutral-300 z-10 shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {currentFolderId && onNavigateBack && (
              <button
                onClick={onNavigateBack}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-semibold min-h-[32px] transition-all active:scale-95 mr-1"
                title="Go back to parent folder"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={() => onNavigateFolder && onNavigateFolder(null)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors font-medium ${
                !currentFolderId ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              <span>Drive</span>
            </button>

            {folderBreadcrumbs.map((folder, idx) => {
              const isLast = idx === folderBreadcrumbs.length - 1;
              return (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                  <button
                    onClick={() => onNavigateFolder && onNavigateFolder(folder.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors truncate max-w-[160px] ${
                      isLast ? 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
      {/* Item Counter & Select All Bar */}
      <div className="mx-2.5 sm:mx-4 mt-2 sm:mt-2.5 flex items-center justify-between gap-2 z-10 shrink-0">
        {files.length > 0 ? (
          <button
            id="select-all-btn"
            onClick={() => onSelectAll(!isAllSelected)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors min-h-[34px] active:scale-[0.98]"
            title={isAllSelected ? "Deselect all items (Ctrl+A)" : "Select all items in folder (Ctrl+A)"}
          >
            {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
        ) : (
          <div />
        )}

        <div className="text-[11px] sm:text-xs text-neutral-400 font-mono">
          {fileCount > 0 && `${fileCount} file${fileCount === 1 ? '' : 's'}`}
          {fileCount > 0 && folderCount > 0 && ', '}
          {folderCount > 0 && `${folderCount} folder${folderCount === 1 ? '' : 's'}`}
          {fileCount === 0 && folderCount === 0 && '0 items'}
        </div>
      </div>

      {/* iPad-optimized Batch Toolbar when files are selected */}
      {selectedIds.size > 0 && (
        <div 
          id="batch-selection-toolbar"
          className="mx-2.5 sm:mx-4 mt-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-wrap items-center justify-between gap-2 z-20 text-xs shadow-xl shrink-0 animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-[11px] sm:text-xs">
              {selectedIds.size} of {files.length} selected
            </span>
            <button
              onClick={() => onSelectAll(false)}
              className="text-neutral-400 hover:text-white underline ml-1 text-[11px]"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isTrashView ? (
              <>
                <button
                  id="batch-restore-btn"
                  onClick={() => onBatchRestore(selectedItems)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-100 font-semibold min-h-[36px] sm:min-h-[40px] active:scale-[0.98] border border-neutral-700 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Restore</span>
                </button>
                <button
                  id="batch-delete-perm-btn"
                  onClick={() => onBatchDelete(selectedItems, true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-semibold min-h-[36px] sm:min-h-[40px] active:scale-[0.98] border border-neutral-700 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Delete Forever</span>
                </button>
              </>
            ) : (
              <>
                <button
                  id="batch-zip-btn"
                  onClick={() => onBatchZip(selectedItems)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 border border-neutral-700 min-h-[36px] sm:min-h-[40px] text-xs"
                  title="Compress into ZIP"
                >
                  <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-300" />
                  <span className="hidden sm:inline">Zip</span>
                </button>

                <button
                  id="batch-download-btn"
                  onClick={() => onBatchDownload(selectedItems)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 border border-neutral-700 min-h-[36px] sm:min-h-[40px] text-xs"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-300" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  id="batch-star-btn"
                  onClick={() => onToggleFavorite(selectedItems)}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                  title="Star / Unstar"
                >
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                </button>

                {/* Instant Batch Delete / Trash button */}
                <button
                  id="batch-trash-btn"
                  onClick={() => onBatchDelete(selectedItems, false)}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white font-semibold min-h-[36px] sm:min-h-[40px] active:scale-[0.98] border border-neutral-700 text-xs"
                  title="Move to Trash"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Trash Header Notice */}
      {isTrashView && files.length > 0 && (
        <div className="mx-2.5 sm:mx-4 mt-2 p-2.5 sm:p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2 text-xs text-neutral-300 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="truncate">Items in trash are stored until deleted permanently.</span>
          </div>
          <button
            id="empty-trash-btn"
            onClick={onEmptyTrash}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white font-semibold min-h-[36px] sm:min-h-[38px] transition-colors shrink-0 text-[11px] sm:text-xs"
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
        {files.length === 0 ? (
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

            {/* GRID VIEW (Fluid 2-col up to 6-col responsive grid) */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
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
