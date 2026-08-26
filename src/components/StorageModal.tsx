import React, { useState } from 'react';
import { 
  X, 
  HardDrive, 
  Download, 
  Trash2
} from 'lucide-react';
import { StorageStats, VFile, FileCategory } from '../types';
import { formatBytes } from '../utils/fileUtils';
import { createZipArchive } from '../utils/zipUtils';

interface StorageModalProps {
  isOpen: boolean;
  stats: StorageStats;
  allFiles: VFile[];
  onClose: () => void;
  onClearStorage: () => Promise<void>;
}

export const StorageModal: React.FC<StorageModalProps> = ({
  isOpen,
  stats,
  allFiles,
  onClose,
  onClearStorage,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  if (!isOpen) return null;

  const usagePercent = Math.min(100, Math.max(1, Math.round((stats.usage / (stats.quota || 1)) * 100)));

  const handleExportAllZip = async () => {
    setIsExporting(true);
    try {
      const activeFiles = allFiles.filter(f => !f.trashed);
      const blob = await createZipArchive(activeFiles, allFiles);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `files_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export zip', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setIsClearing(true);
    try {
      await onClearStorage();
      onClose();
    } catch (e) {
      console.error('Failed to clear storage', e);
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <div 
      id="storage-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="storage-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-white" />
            <h3 className="text-xs font-semibold text-neutral-100">IndexedDB Storage</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-100">{formatBytes(stats.usage)}</span>
              <span className="text-neutral-400 font-mono">{stats.fileCount} Files</span>
            </div>
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Estimated quota: {formatBytes(stats.quota)}</span>
              <span className="text-neutral-200 font-mono">100% Offline</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              id="storage-export-zip-btn"
              onClick={handleExportAllZip}
              disabled={isExporting || allFiles.length === 0}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 min-h-[44px] transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-white" />
                <span className="font-medium">Export All as ZIP</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">{isExporting ? 'Exporting...' : 'Download'}</span>
            </button>

            <button
              id="storage-clear-btn"
              onClick={handleClear}
              disabled={isClearing}
              className={`w-full flex items-center justify-between p-3 rounded-xl border min-h-[44px] transition-colors ${
                confirmClear
                  ? 'bg-neutral-800 border-neutral-600 text-white font-medium'
                  : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-neutral-400" />
                <span>{confirmClear ? 'Tap again to wipe all storage' : 'Clear Storage (Delete All)'}</span>
              </div>
              <span className="text-[11px] font-mono">{confirmClear ? 'Confirm' : 'Wipe'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
