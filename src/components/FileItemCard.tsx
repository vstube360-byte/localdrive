import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Code, 
  Archive, 
  Star, 
  MoreVertical, 
  ExternalLink, 
  Trash2, 
  FileCode, 
  Check,
  Eye,
  Code2,
  Folder
} from 'lucide-react';
import { VFile, ViewMode } from '../types';
import { 
  formatBytes, 
  formatDate, 
  getFileCategory, 
  isFolder,
  isImage, 
  isVideo,
  isImageOrVideo,
  isTextOrCode,
  isZip
} from '../utils/fileUtils';
import { extractVideoMetadataAndThumbnail } from '../utils/videoUtils';

interface FileItemCardProps {
  item: VFile;
  allFiles?: VFile[];
  viewMode: ViewMode;
  isSelected: boolean;
  isSelectMode?: boolean;
  isRenaming: boolean;
  onSelect: (item: VFile, e: React.MouseEvent | React.TouchEvent) => void;
  onToggleSelect: (item: VFile, e: React.MouseEvent | React.TouchEvent) => void;
  onDoubleClick: (item: VFile) => void;
  onOpenInTab: (item: VFile) => void;
  onContextMenu: (item: VFile, e: React.MouseEvent) => void;
  onToggleFavorite: (item: VFile, e: React.MouseEvent | React.TouchEvent) => void;
  onDelete: (item: VFile, e: React.MouseEvent | React.TouchEvent) => void;
  onRenameSubmit: (item: VFile, newName: string) => void;
  onRenameCancel: () => void;
  onMoveItemToFolder?: (draggedItemId: string, targetFolderId: string) => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  item,
  allFiles = [],
  viewMode,
  isSelected,
  isSelectMode = false,
  isRenaming,
  onSelect,
  onToggleSelect,
  onDoubleClick,
  onOpenInTab,
  onContextMenu,
  onToggleFavorite,
  onDelete,
  onRenameSubmit,
  onRenameCancel,
  onMoveItemToFolder,
}) => {
  const [renameValue, setRenameValue] = useState<string>(item.name);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState<boolean>(false);

  // Long press detection for iPadOS touch context menu
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setRenameValue(item.name);
  }, [item.name]);

  useEffect(() => {
    let active = true;
    let urlToRevoke: string | null = null;

    if (isImage(item) && item.blob) {
      const url = URL.createObjectURL(item.blob);
      urlToRevoke = url;
      if (active) setThumbnailUrl(url);
    } else if (isVideo(item) && item.blob) {
      extractVideoMetadataAndThumbnail(item.id, item.blob, 1.0)
        .then(meta => {
          if (active && meta.thumbnail) {
            setThumbnailUrl(meta.thumbnail);
          }
        })
        .catch(() => {
          if (active) setThumbnailUrl(null);
        });
    } else {
      setThumbnailUrl(null);
    }

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [item.blob, item.updatedAt, item.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onRenameSubmit(item, renameValue.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onRenameCancel();
    }
  };

  // Touch handlers for iPad long press (touch and hold)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = setTimeout(() => {
      // Haptic touch feedback if device supports it
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(15); } catch (_) {}
      }
      // Trigger context menu at touch position
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as unknown as React.MouseEvent;
      onContextMenu(item, syntheticEvent);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPos.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        // User is scrolling, cancel long press
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isRenaming) return;

    // Clicking the card directly opens/previews the file or enters folder without modifying selection!
    onDoubleClick(item);
  };

  const handleCardDoubleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onDoubleClick(item);
  };

  const renderIcon = (sizeClass = 'w-7 h-7') => {
    if (isFolder(item)) {
      return <Folder className={`${sizeClass} text-amber-400 fill-amber-400/20`} />;
    }

    if (isZip(item)) {
      return <Archive className={`${sizeClass} text-neutral-300`} />;
    }

    const cat = getFileCategory(item);
    switch (cat) {
      case 'images':
        return <ImageIcon className={`${sizeClass} text-neutral-300`} />;
      case 'audio':
        return <Music className={`${sizeClass} text-neutral-300`} />;
      case 'video':
        return <Video className={`${sizeClass} text-neutral-300`} />;
      case 'code':
        return <Code className={`${sizeClass} text-white`} />;
      case 'archives':
        return <Archive className={`${sizeClass} text-neutral-300`} />;
      default:
        return <FileText className={`${sizeClass} text-neutral-400`} />;
    }
  };

  const childCount = isFolder(item) ? allFiles.filter(f => f.parentId === item.id && !f.trashed).length : 0;
  const sizeOrFolderLabel = isFolder(item) ? `${childCount} item${childCount === 1 ? '' : 's'}` : formatBytes(item.size);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isFolder(item)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDropTarget(true);
    }
  };

  const handleDragLeave = () => {
    if (isFolder(item)) {
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isFolder(item)) {
      e.preventDefault();
      setIsDropTarget(false);
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== item.id && onMoveItemToFolder) {
        onMoveItemToFolder(draggedId, item.id);
      }
    }
  };

  const colorTagBadge = item.colorTag ? (
    <span 
      className={`w-2.5 h-2.5 rounded-full border border-black/40 shrink-0 ${
        item.colorTag === 'red' ? 'bg-rose-500' :
        item.colorTag === 'orange' ? 'bg-orange-500' :
        item.colorTag === 'yellow' ? 'bg-amber-400' :
        item.colorTag === 'green' ? 'bg-emerald-500' :
        item.colorTag === 'blue' ? 'bg-sky-500' :
        item.colorTag === 'purple' ? 'bg-purple-500' :
        item.colorTag === 'pink' ? 'bg-pink-500' : 'bg-transparent'
      }`}
      title={`Color Tag: ${item.colorTag}`}
    />
  ) : null;

  // 1. LIST VIEW (iPad optimized touch row)
  if (viewMode === 'list') {
    return (
      <div
        id={`file-item-${item.id}`}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        onContextMenu={(e) => onContextMenu(item, e)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs select-none transition-all cursor-pointer border min-h-[52px] active:scale-[0.99] ${
          isDropTarget
            ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-400'
            : isSelected
            ? 'bg-neutral-800 text-white border-neutral-500 shadow-sm'
            : 'bg-neutral-900/50 hover:bg-neutral-900 text-neutral-200 border-neutral-800 active:bg-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Multi-select Checkbox button - click directly toggles selection */}
          <button
            id={`checkbox-item-${item.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item, e);
            }}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 active:scale-90 ${
              isSelected 
                ? 'bg-white border-white text-black shadow-sm' 
                : 'border-neutral-700 bg-neutral-950 hover:border-neutral-500'
            }`}
            title={isSelected ? 'Deselect item' : 'Select item'}
          >
            {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
          </button>

          <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              renderIcon('w-4 h-4')
            )}
          </div>

          <div className="min-w-0 flex-1 mr-1 sm:mr-2">
            {isRenaming ? (
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => onRenameSubmit(item, renameValue.trim())}
                onKeyDown={handleKeyDown}
                className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-400 text-xs text-white outline-none w-full max-w-sm font-mono"
              />
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                {colorTagBadge}
                <span className="font-medium text-neutral-100 text-xs sm:text-sm truncate">{item.name}</span>
                {isZip(item) && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono font-bold shrink-0">
                    ZIP
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-1.5 sm:gap-4 text-neutral-400 shrink-0">
          <span className="text-[11px] font-mono hidden md:inline">{formatDate(item.updatedAt)}</span>
          <span className="w-16 sm:w-20 text-right font-mono text-[10px] sm:text-[11px] text-neutral-400 truncate">
            {sizeOrFolderLabel}
          </span>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* If text/code: show edit button */}
            {isTextOrCode(item) && (
              <button
                id={`btn-edit-item-${item.id}`}
                onClick={(e) => { e.stopPropagation(); onDoubleClick(item); }}
                className="p-1.5 sm:p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
                title="Edit in Code / Text Editor"
              >
                <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* If image/video: show preview button */}
            {isImageOrVideo(item) && (
              <button
                onClick={(e) => { e.stopPropagation(); onDoubleClick(item); }}
                className="p-1.5 sm:p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
                title="Preview Image/Video"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Open in Browser Tab button */}
            <button
              onClick={(e) => { e.stopPropagation(); onOpenInTab(item); }}
              className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
              title="Open in Browser Tab"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Favorite Star */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(item, e); }}
              className={`p-1.5 sm:p-2 rounded-xl min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors ${
                item.favorite ? 'text-white bg-neutral-800' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
              }`}
              title={item.favorite ? 'Unstar' : 'Star'}
            >
              <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.favorite ? 'fill-current' : ''}`} />
            </button>

            {/* Direct Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item, e); }}
              className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
              title="Delete File"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* More Menu */}
            <button
              onClick={(e) => { e.stopPropagation(); onContextMenu(item, e); }}
              className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
              title="More Actions"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. GRID VIEW (iPadOS touch friendly visual cards)
  return (
    <div
      id={`file-item-${item.id}`}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
      onContextMenu={(e) => onContextMenu(item, e)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={`relative flex flex-col justify-between p-2.5 sm:p-3.5 rounded-2xl border transition-all select-none cursor-pointer overflow-hidden active:scale-[0.98] ${
        isDropTarget
          ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-400'
          : isSelected
          ? 'bg-neutral-800 border-neutral-500 shadow-md ring-1 ring-neutral-500'
          : 'bg-neutral-900/60 hover:bg-neutral-900 active:bg-neutral-850 border-neutral-800 hover:border-neutral-700 shadow-sm'
      }`}
    >
      {/* Top row: Checkbox + Icon + Action Buttons */}
      <div className="flex items-start justify-between gap-1 mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Multi-select Checkbox button - click directly toggles selection */}
          <button
            id={`checkbox-item-${item.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item, e);
            }}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 active:scale-90 ${
              isSelected 
                ? 'bg-white border-white text-black shadow-sm' 
                : 'border-neutral-700 bg-neutral-950 hover:border-neutral-500'
            }`}
            title={isSelected ? 'Deselect item' : 'Select item'}
          >
            {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
          </button>

          <div className="p-1.5 sm:p-2 rounded-xl bg-neutral-950 border border-neutral-800 shrink-0">
            {renderIcon('w-4 h-4 sm:w-5 sm:h-5')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5">
          {/* If text/code: show edit button */}
          {isTextOrCode(item) && (
            <button
              id={`grid-btn-edit-${item.id}`}
              onClick={(e) => { e.stopPropagation(); onDoubleClick(item); }}
              className="p-1 sm:p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center transition-colors"
              title="Edit in Code / Text Editor"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* If image/video: show preview button */}
          {isImageOrVideo(item) && (
            <button
              onClick={(e) => { e.stopPropagation(); onDoubleClick(item); }}
              className="p-1 sm:p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center transition-colors"
              title="Preview Image/Video"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onOpenInTab(item); }}
            className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center transition-colors"
            title="Open in Browser Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item, e); }}
            className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center transition-colors"
            title="Delete File"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu(item, e); }}
            className="p-1 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center transition-colors"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Thumbnail */}
      {thumbnailUrl && (
        <div className="my-1.5 sm:my-2 h-20 sm:h-24 w-full rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center">
          <img
            src={thumbnailUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-200"
          />
        </div>
      )}

      {/* File Info */}
      <div className="mt-1 min-w-0">
        {isRenaming ? (
          <input
            type="text"
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => onRenameSubmit(item, renameValue.trim())}
            onKeyDown={handleKeyDown}
            className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-400 text-xs text-white outline-none w-full font-mono"
          />
        ) : (
          <div className="font-semibold text-xs sm:text-sm text-neutral-100 truncate mb-0.5 sm:mb-1 flex items-center gap-1.5">
            {colorTagBadge}
            <span className="truncate">{item.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400 font-mono">
          <span>{sizeOrFolderLabel}</span>
          <div className="flex items-center gap-1">
            {item.favorite && <Star className="w-3 h-3 text-white fill-current shrink-0" />}
            <span className="truncate">{formatDate(item.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
