import React, { useEffect, useRef } from 'react';
import { 
  Eye, 
  ExternalLink, 
  Star, 
  Download, 
  Archive, 
  Copy, 
  Scissors,
  Clipboard,
  Edit3, 
  Trash2, 
  RotateCcw, 
  FilePlus,
  FolderPlus,
  Code2,
  Info
} from 'lucide-react';
import { VFile } from '../types';
import { isImageOrVideo, isZip, isTextOrCode, isHtml } from '../utils/fileUtils';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  targetItem: VFile | null;
  selectedItems: VFile[];
  isTrashView: boolean;
  canPaste?: boolean;
  onClose: () => void;
  onPreview: (item: VFile) => void;
  onEdit?: (item: VFile) => void;
  onOpenInTab: (item: VFile) => void;
  onToggleFavorite: (items: VFile[]) => void;
  onDownload: (items: VFile[]) => void;
  onZip: (items: VFile[]) => void;
  onUnzip: (item: VFile) => void;
  onDuplicate: (items: VFile[]) => void;
  onCopy?: (items: VFile[]) => void;
  onCut?: (items: VFile[]) => void;
  onPaste?: () => void;
  onGetInfo?: (item: VFile) => void;
  onRename: (item: VFile) => void;
  onDelete: (items: VFile[], permanent?: boolean) => void;
  onRestore: (items: VFile[]) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isOpen,
  targetItem,
  selectedItems,
  isTrashView,
  canPaste = false,
  onClose,
  onPreview,
  onEdit,
  onOpenInTab,
  onToggleFavorite,
  onDownload,
  onZip,
  onUnzip,
  onDuplicate,
  onCopy,
  onCut,
  onPaste,
  onGetInfo,
  onRename,
  onDelete,
  onRestore,
  onNewFile,
  onNewFolder,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 420);

  const activeItems = selectedItems.length > 0 ? selectedItems : targetItem ? [targetItem] : [];
  const singleItem = activeItems.length === 1 ? activeItems[0] : null;
  const isMultiple = activeItems.length > 1;

  if (!targetItem && activeItems.length === 0) {
    return (
      <div
        id="context-menu-blank"
        ref={menuRef}
        className="fixed z-50 min-w-[220px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl py-1.5 text-xs text-neutral-200 divide-y divide-neutral-800 animate-in fade-in zoom-in-95 duration-100 select-none"
        style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      >
        <div className="py-1">
          {onNewFolder && (
            <button
              id="context-btn-new-folder"
              onClick={() => { onClose(); onNewFolder(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 active:bg-neutral-700 text-left min-h-[44px] transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>Create New Folder</span>
            </button>
          )}

          {onNewFile && (
            <button
              id="context-btn-new-file"
              onClick={() => { onClose(); onNewFile(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 active:bg-neutral-700 text-left min-h-[44px] transition-colors"
            >
              <FilePlus className="w-4 h-4 text-sky-400" />
              <span>Create New File</span>
            </button>
          )}
        </div>

        {onPaste && (
          <div className="py-1">
            <button
              id="context-btn-paste-blank"
              onClick={() => { onClose(); onPaste(); }}
              disabled={!canPaste}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left min-h-[44px] transition-colors ${
                canPaste ? 'hover:bg-neutral-800 text-white' : 'text-neutral-600 cursor-not-allowed'
              }`}
            >
              <Clipboard className="w-4 h-4 text-emerald-400" />
              <span>Paste Clipboard Items</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id="context-menu-item"
      ref={menuRef}
      className="fixed z-50 min-w-[220px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl py-1.5 text-xs text-neutral-200 divide-y divide-neutral-800 animate-in fade-in zoom-in-95 duration-100 select-none"
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
    >
      {isTrashView ? (
        <div className="py-1">
          <button
            id="context-btn-restore"
            onClick={() => { onClose(); onRestore(activeItems); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-neutral-800 active:bg-neutral-700 text-left min-h-[44px] transition-colors text-neutral-200"
          >
            <RotateCcw className="w-4 h-4 text-white" />
            <span>Restore {isMultiple ? `(${activeItems.length})` : ''}</span>
          </button>
          <button
            id="context-btn-delete-perm"
            onClick={() => { onClose(); onDelete(activeItems, true); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-neutral-800 text-neutral-400 hover:text-white text-left min-h-[44px] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Permanently</span>
          </button>
        </div>
      ) : (
        <>
          {/* Section 1: Open & Previews */}
          <div className="py-1">
            {singleItem && onEdit && isTextOrCode(singleItem) && (
              <button
                id="context-btn-edit-code"
                onClick={() => { onClose(); onEdit(singleItem); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors text-white font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-4 h-4 text-white" />
                  <span>Edit File (Code / Text Editor)</span>
                </div>
              </button>
            )}

            {singleItem && (
              <button
                id="context-btn-open-tab"
                onClick={() => { onClose(); onOpenInTab(singleItem); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors text-neutral-200"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-neutral-300" />
                  <span>Open in Browser Tab</span>
                </div>
              </button>
            )}

            {singleItem && (isImageOrVideo(singleItem) || isHtml(singleItem)) && (
              <button
                id="context-btn-preview"
                onClick={() => { onClose(); onPreview(singleItem); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors text-neutral-200"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-neutral-300" />
                  <span>Preview {isHtml(singleItem) ? 'Live Website' : (singleItem.mimeType?.startsWith('image') ? 'Image' : 'Video')}</span>
                </div>
              </button>
            )}

            {singleItem && isZip(singleItem) && (
              <button
                id="context-btn-unzip"
                onClick={() => { onClose(); onUnzip(singleItem); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-white text-left min-h-[44px] transition-colors font-medium"
              >
                <Archive className="w-4 h-4 text-white" />
                <span>Extract ZIP Files</span>
              </button>
            )}

            {singleItem && onGetInfo && (
              <button
                id="context-btn-get-info"
                onClick={() => { onClose(); onGetInfo(singleItem); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors text-sky-400 font-medium"
              >
                <Info className="w-4 h-4 text-sky-400" />
                <span>Get Info &amp; Metadata</span>
              </button>
            )}
          </div>

          {/* Section 2: Clipboard & Copies */}
          <div className="py-1">
            {onCopy && (
              <button
                id="context-btn-copy"
                onClick={() => { onClose(); onCopy(activeItems); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
              >
                <Copy className="w-4 h-4 text-neutral-300" />
                <span>Copy {isMultiple ? `(${activeItems.length})` : ''} (Ctrl+C)</span>
              </button>
            )}

            {onCut && (
              <button
                id="context-btn-cut"
                onClick={() => { onClose(); onCut(activeItems); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
              >
                <Scissors className="w-4 h-4 text-neutral-300" />
                <span>Cut {isMultiple ? `(${activeItems.length})` : ''} (Ctrl+X)</span>
              </button>
            )}

            {onPaste && (
              <button
                id="context-btn-paste"
                onClick={() => { onClose(); onPaste(); }}
                disabled={!canPaste}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left min-h-[44px] transition-colors ${
                  canPaste ? 'hover:bg-neutral-800 text-white' : 'text-neutral-600 cursor-not-allowed'
                }`}
              >
                <Clipboard className="w-4 h-4 text-emerald-400" />
                <span>Paste Items (Ctrl+V)</span>
              </button>
            )}

            <button
              id="context-btn-duplicate"
              onClick={() => { onClose(); onDuplicate(activeItems); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
            >
              <Copy className="w-4 h-4 text-neutral-400" />
              <span>Make Duplicate Copy</span>
            </button>
          </div>

          {/* Section 3: ZIP & Download */}
          <div className="py-1">
            <button
              id="context-btn-zip"
              onClick={() => { onClose(); onZip(activeItems); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
            >
              <Archive className="w-4 h-4 text-neutral-300" />
              <span>Compress to ZIP {isMultiple ? `(${activeItems.length})` : ''}</span>
            </button>

            <button
              id="context-btn-download"
              onClick={() => { onClose(); onDownload(activeItems); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
            >
              <Download className="w-4 h-4 text-neutral-300" />
              <span>Download {isMultiple ? 'as ZIP' : ''}</span>
            </button>
          </div>

          {/* Section 4: Star, Rename & Delete */}
          <div className="py-1">
            <button
              id="context-btn-star"
              onClick={() => { onClose(); onToggleFavorite(activeItems); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
            >
              <Star className="w-4 h-4 text-white" />
              <span>
                {activeItems.every(i => i.favorite) ? 'Unstar' : 'Star'}
              </span>
            </button>

            {singleItem && (
              <button
                id="context-btn-rename"
                onClick={() => { onClose(); onRename(singleItem); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neutral-800 text-left min-h-[44px] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4 text-neutral-400" />
                  <span>Rename (F2)</span>
                </div>
              </button>
            )}

            <button
              id="context-btn-trash"
              onClick={() => { onClose(); onDelete(activeItems, false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-neutral-800 text-neutral-400 hover:text-white text-left min-h-[44px] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Move to Trash</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
