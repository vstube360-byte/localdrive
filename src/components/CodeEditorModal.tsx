import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  Save, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Maximize2, 
  Minimize2, 
  WrapText, 
  Type, 
  ExternalLink, 
  Sparkles,
  AlertTriangle,
  FileCode,
  FileText,
  Code2,
  CheckCircle2,
  Replace
} from 'lucide-react';
import { VFile } from '../types';
import { 
  getFileExtension, 
  formatBytes, 
  readBlobAsText,
  downloadVirtualFile
} from '../utils/fileUtils';

interface CodeEditorModalProps {
  file: VFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: VFile, newContent: string) => Promise<void> | void;
  onOpenInTab?: (file: VFile) => void;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  file,
  isOpen,
  onClose,
  onSave,
  onOpenInTab,
}) => {
  const [content, setContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('sm');
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState<boolean>(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorCol, setCursorCol] = useState<number>(1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Load content when file changes or modal opens
  useEffect(() => {
    if (!isOpen || !file) {
      setContent('');
      setInitialContent('');
      setIsLoading(false);
      setShowUnsavedPrompt(false);
      setIsSearchOpen(false);
      setFormatError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadContent = async () => {
      try {
        let text = '';
        if (file.textContent !== undefined) {
          text = file.textContent;
        } else if (file.blob) {
          text = await readBlobAsText(file.blob);
        }
        if (isMounted) {
          setContent(text);
          setInitialContent(text);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to read file content:', err);
        if (isMounted) {
          setContent('');
          setInitialContent('');
          setIsLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [file, isOpen]);

  const isDirty = useMemo(() => {
    return content !== initialContent;
  }, [content, initialContent]);

  // Determine file language / extension
  const extension = useMemo(() => {
    return file ? getFileExtension(file.name).toLowerCase() : '';
  }, [file]);

  const languageLabel = useMemo(() => {
    switch (extension) {
      case 'js':
      case 'mjs':
      case 'cjs':
        return 'JavaScript';
      case 'ts':
      case 'mts':
        return 'TypeScript';
      case 'tsx':
        return 'TypeScript React';
      case 'jsx':
        return 'JavaScript React';
      case 'json':
        return 'JSON';
      case 'html':
      case 'htm':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'md':
      case 'markdown':
        return 'Markdown';
      case 'py':
        return 'Python';
      case 'sh':
      case 'bash':
        return 'Shell Script';
      case 'sql':
        return 'SQL';
      case 'yaml':
      case 'yml':
        return 'YAML';
      case 'xml':
      case 'svg':
        return 'XML / SVG';
      case 'env':
        return 'Environment Config';
      case 'csv':
        return 'CSV Document';
      case 'txt':
        return 'Plain Text';
      default:
        return extension ? `${extension.toUpperCase()} File` : 'Text File';
    }
  }, [extension]);

  // Calculate lines
  const lines = useMemo(() => {
    return content.split('\n');
  }, [content]);

  const lineCount = lines.length;
  const charCount = content.length;

  // Handle Save
  const handleSave = useCallback(async () => {
    if (!file) return;
    setIsSaving(true);
    try {
      await onSave(file, content);
      setInitialContent(content);
      setFormatError(null);
    } catch (err) {
      console.error('Error saving file:', err);
    } finally {
      setIsSaving(false);
    }
  }, [file, content, onSave]);

  // Handle Save & Close
  const handleSaveAndClose = async () => {
    await handleSave();
    onClose();
  };

  // Close with unsaved changes verification
  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  // Copy Content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Download Current File
  const handleDownload = () => {
    if (!file) return;
    const blob = new Blob([content], { type: file.mimeType || 'text/plain' });
    const tempFile: VFile = {
      ...file,
      blob,
      size: blob.size,
    };
    downloadVirtualFile(tempFile);
  };

  // Format / Prettify JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setContent(formatted);
      setFormatError(null);
    } catch (err) {
      setFormatError('Invalid JSON format: Unable to prettify');
      setTimeout(() => setFormatError(null), 3000);
    }
  };

  // Synchronize Line Number Scrolling
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Update cursor coordinates
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = content.substring(0, pos);
    const lineList = textBefore.split('\n');
    setCursorLine(lineList.length);
    setCursorCol(lineList[lineList.length - 1].length + 1);
  };

  // Tab Key & Indentation in Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+S or Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Cmd+F or Ctrl+F to find
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setIsSearchOpen(prev => !prev);
      return;
    }

    // Tab Key handling (2 spaces indent)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (!e.shiftKey) {
        // Insert 2 spaces
        const newText = content.substring(0, start) + '  ' + content.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          updateCursorPosition();
        }, 0);
      } else {
        // Outdent if at start of line or spaces exist
        const before = content.substring(0, start);
        if (before.endsWith('  ')) {
          const newText = content.substring(0, start - 2) + content.substring(end);
          setContent(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(0, start - 2);
            updateCursorPosition();
          }, 0);
        }
      }
    }

    // Enter Key Auto-indentation
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const pos = textarea.selectionStart;
      const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
      const currentLine = content.substring(lineStart, pos);
      const match = currentLine.match(/^\s+/);
      const indent = match ? match[0] : '';

      if (indent.length > 0) {
        e.preventDefault();
        const newText = content.substring(0, pos) + '\n' + indent + content.substring(pos);
        setContent(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = pos + 1 + indent.length;
          updateCursorPosition();
        }, 0);
      }
    }
  };

  // Keyboard shortcut listener for escape and global shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else {
          handleRequestClose();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isDirty, handleSave, isSearchOpen]);

  // Search & Replace logic
  const handleFindNext = () => {
    if (!searchQuery || !textareaRef.current) return;
    const text = content.toLowerCase();
    const query = searchQuery.toLowerCase();
    const currentPos = textareaRef.current.selectionEnd;
    
    let nextIndex = text.indexOf(query, currentPos);
    if (nextIndex === -1) {
      // Wrap around to start
      nextIndex = text.indexOf(query, 0);
    }

    if (nextIndex !== -1) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextIndex, nextIndex + searchQuery.length);
      updateCursorPosition();
    }
  };

  const handleReplaceOne = () => {
    if (!searchQuery || !textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);

    if (selected.toLowerCase() === searchQuery.toLowerCase()) {
      const newText = content.substring(0, start) + replaceQuery + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start, start + replaceQuery.length);
          handleFindNext();
        }
      }, 0);
    } else {
      handleFindNext();
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newText = content.replace(regex, replaceQuery);
    setContent(newText);
  };

  if (!isOpen || !file) return null;

  const fontSizeClass = {
    xs: 'text-xs leading-relaxed',
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
  }[fontSize];

  return (
    <div
      id="code-editor-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
    >
      <div
        id="code-editor-container"
        className={`bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-pop-in ${
          isFullscreen 
            ? 'w-full h-full rounded-none border-0' 
            : 'w-full max-w-6xl h-full sm:h-[92dvh] sm:max-h-[920px] rounded-none sm:rounded-2xl'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-950 border-b border-neutral-800 shrink-0 select-none gap-2">
          {/* Left: File Title & Language */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white shrink-0">
                {['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'sh', 'sql', 'yaml', 'yml'].includes(extension) ? (
                  <Code2 className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-neutral-100 truncate">
                    {file.name}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-[10px] font-mono text-neutral-300 shrink-0">
                    {languageLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-400">
                  <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                  <span>•</span>
                  <span>{charCount.toLocaleString()} chars</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{formatBytes(new Blob([content]).size)}</span>
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              id="editor-btn-close-mobile"
              onClick={handleRequestClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[32px] min-h-[32px] flex sm:hidden items-center justify-center transition-colors shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Save State Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono shrink-0">
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-spin" />
                Saving...
              </span>
            ) : isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            <span className="text-[10px] text-neutral-500 hidden xl:inline font-mono">(⌘S)</span>
          </div>

          {/* Right: Actions & Close */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0 justify-end">
            {/* Format JSON button */}
            {extension === 'json' && (
              <button
                id="editor-btn-format-json"
                onClick={handleFormatJson}
                className="px-2 py-1.5 sm:px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white text-xs flex items-center gap-1.5 transition-colors min-h-[32px] sm:min-h-[36px] shrink-0"
                title="Format & Prettify JSON"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
                <span className="hidden md:inline">Format</span>
              </button>
            )}

            {/* Find Button */}
            <button
              id="editor-btn-find"
              onClick={() => setIsSearchOpen(prev => !prev)}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs flex items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0 ${
                isSearchOpen 
                  ? 'bg-neutral-800 border-neutral-700 text-white' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title="Find & Replace (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Word Wrap Toggle */}
            <button
              id="editor-btn-wrap"
              onClick={() => setWordWrap(prev => !prev)}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs flex items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0 ${
                wordWrap 
                  ? 'bg-neutral-800 border-neutral-700 text-white' 
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
              title={wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
            >
              <WrapText className="w-4 h-4" />
            </button>

            {/* Font Size Selector */}
            <button
              id="editor-btn-fontsize"
              onClick={() => {
                if (fontSize === 'xs') setFontSize('sm');
                else if (fontSize === 'sm') setFontSize('base');
                else setFontSize('xs');
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0"
              title={`Font Size: ${fontSize.toUpperCase()}`}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Copy button */}
            <button
              id="editor-btn-copy"
              onClick={handleCopy}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0"
              title="Copy All Content"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Download button */}
            <button
              id="editor-btn-download"
              onClick={handleDownload}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Open in New Tab */}
            {onOpenInTab && (
              <button
                id="editor-btn-open-tab"
                onClick={() => onOpenInTab(file)}
                className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0"
                title="Open in Browser Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              id="editor-btn-fullscreen"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs items-center justify-center transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] hidden sm:flex shrink-0"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Save Button */}
            <button
              id="editor-btn-save"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`px-3 py-1 sm:py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 min-h-[32px] sm:min-h-[36px] shrink-0 transition-all ${
                isDirty
                  ? 'bg-white hover:bg-neutral-200 text-black shadow-sm active:scale-95'
                  : 'bg-neutral-800 text-neutral-400 cursor-not-allowed border border-neutral-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Close Button Desktop */}
            <button
              id="editor-btn-close"
              onClick={handleRequestClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 min-w-[36px] min-h-[36px] hidden sm:flex items-center justify-center transition-colors shrink-0"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format error banner */}
        {formatError && (
          <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs flex items-center justify-between font-mono animate-in slide-in-from-top-1">
            <span>{formatError}</span>
            <button onClick={() => setFormatError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Find & Replace Bar */}
        {isSearchOpen && (
          <div className="px-4 py-2 bg-neutral-950/90 border-b border-neutral-800 flex flex-wrap items-center gap-2 text-xs animate-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFindNext();
                }}
                placeholder="Find in document..."
                className="bg-transparent text-white font-mono text-xs outline-none w-36 sm:w-48 placeholder-neutral-500"
              />
              <button
                onClick={handleFindNext}
                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono text-neutral-200"
              >
                Next
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1">
              <Replace className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace with..."
                className="bg-transparent text-white font-mono text-xs outline-none w-36 sm:w-48 placeholder-neutral-500"
              />
              <button
                onClick={handleReplaceOne}
                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono text-neutral-200"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono text-neutral-200"
              >
                All
              </button>
            </div>

            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 relative flex overflow-hidden bg-neutral-950">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-3">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading file contents...</span>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden relative">
              {/* Line Numbers Gutter */}
              <div
                ref={lineNumbersRef}
                className="select-none py-4 px-2 sm:px-3 bg-neutral-950 border-r border-neutral-800/80 text-neutral-600 font-mono text-right text-xs overflow-hidden shrink-0 min-w-[40px] sm:min-w-[48px]"
                aria-hidden="true"
              >
                {lines.map((_, i) => (
                  <div key={i} className="leading-relaxed">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Main Code Textarea */}
              <div className="flex-1 relative overflow-auto">
                <textarea
                  id="code-editor-textarea"
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    updateCursorPosition();
                  }}
                  onScroll={handleScroll}
                  onKeyDown={handleKeyDown}
                  onClick={updateCursorPosition}
                  onKeyUp={updateCursorPosition}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  wrap={wordWrap ? 'soft' : 'off'}
                  className={`w-full h-full p-4 bg-transparent text-neutral-100 font-mono ${fontSizeClass} outline-none resize-none selection:bg-neutral-700 selection:text-white ${
                    wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
                  }`}
                  placeholder="Type code or text here..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none shrink-0">
          <div className="flex items-center gap-3">
            <span>Ln {cursorLine}, Col {cursorCol}</span>
            <span>•</span>
            <span>Tab size: 2 spaces</span>
            <span>•</span>
            <span>UTF-8</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              {wordWrap ? 'Word Wrap: ON' : 'Word Wrap: OFF'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-neutral-300 font-semibold">{languageLabel}</span>
          </div>
        </div>

        {/* Unsaved Changes Confirmation Dialog */}
        {showUnsavedPrompt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3 text-amber-400 mb-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-semibold text-sm text-white">Unsaved Changes</h3>
              </div>
              <p className="text-xs text-neutral-300 mb-5 leading-relaxed">
                You have unsaved edits in <span className="font-mono text-white font-medium">{file.name}</span>. Do you want to save your changes before closing?
              </p>
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  id="unsaved-btn-discard"
                  onClick={() => {
                    setShowUnsavedPrompt(false);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  id="unsaved-btn-save"
                  onClick={handleSaveAndClose}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold transition-colors shadow-sm"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
