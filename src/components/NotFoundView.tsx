import React from 'react';
import { AlertTriangle, Home, ArrowLeft, Search } from 'lucide-react';

interface NotFoundViewProps {
  invalidPath: string;
  onGoHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  invalidPath,
  onGoHome,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100 select-none text-center min-h-[400px]">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500 mb-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      <div className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
        404 &bull; Page Not Found
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
        Folder or Path Does Not Exist
      </h2>

      <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-6 font-mono break-all px-2">
        The requested path <span className="text-rose-400 font-semibold">"{invalidPath || window.location.pathname}"</span> could not be located in LocalDrive.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:bg-neutral-300 text-neutral-950 text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
        >
          <Home className="w-4 h-4" />
          <span>Return to Drive</span>
        </button>

        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-neutral-200 border border-neutral-800 text-xs font-semibold transition-all active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
};
