import React from 'react';
import { Upload, Archive, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  mode: 'uploading' | 'compressing' | 'extracting';
  progressPercent: number;
  currentFileName: string;
  processedCount?: number;
  totalCount?: number;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  mode,
  progressPercent,
  currentFileName,
  processedCount,
  totalCount,
}) => {
  if (!isOpen) return null;

  const isDone = progressPercent >= 100;

  let title = 'Uploading to Drive';
  if (mode === 'compressing') title = 'Compressing to ZIP Archive';
  if (mode === 'extracting') title = 'Extracting ZIP Archive';

  return (
    <div 
      id="progress-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
    >
      <div 
        id="progress-modal-container"
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center animate-pop-in ring-1 ring-white/10"
      >
        {/* Animated Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mb-3 shadow-inner">
          {isDone ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-in zoom-in" />
          ) : mode === 'uploading' ? (
            <Upload className="w-8 h-8 text-sky-400 animate-bounce" />
          ) : mode === 'compressing' ? (
            <Archive className="w-8 h-8 text-amber-400 animate-bounce" />
          ) : (
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          )}
        </div>

        <h3 className="text-base font-semibold text-white mb-1">
          {isDone ? 'Complete!' : title}
        </h3>

        <p className="text-xs text-neutral-400 mb-3 font-mono truncate max-w-full px-2">
          {currentFileName || 'Processing...'}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-950 border border-neutral-800 h-2.5 rounded-full overflow-hidden mb-2 p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 transition-all duration-300 rounded-full shadow-sm shadow-sky-500/20"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-[11px] font-mono text-neutral-400 px-0.5">
          <span>
            {processedCount !== undefined && totalCount !== undefined && totalCount > 0
              ? `${processedCount} of ${totalCount} items`
              : mode === 'uploading' ? 'Saving files' : 'Processing'}
          </span>
          <span className="font-semibold text-white">
            {progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};
