import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  Folder,
  FolderPlus,
  FilePlus,
  X, 
  Sparkles, 
  Check,
  Terminal,
  Database,
  Code2,
  Palette,
  Braces,
  Image as ImageIcon,
  KeyRound,
  Layers,
  ChevronRight,
  FolderTree
} from 'lucide-react';
import { VFile } from '../types';
import { getMimeType } from '../utils/fileUtils';

export type NewItemTab = 'file' | 'folder';

interface NewFileModalProps {
  isOpen: boolean;
  initialMode?: NewItemTab;
  onClose: () => void;
  onCreateFile: (itemOrItems: VFile | VFile[]) => void;
  currentFolderId?: string | null;
  allFiles?: VFile[];
}

interface ExtensionPreset {
  ext: string;
  label: string;
  name: string;
  icon: React.ReactNode;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  defaultContent: string;
}

const EXTENSION_PRESETS: ExtensionPreset[] = [
  {
    ext: '.html',
    label: 'HTML',
    name: 'HTML5 Webpage',
    icon: <FileCode className="w-4 h-4 text-rose-400" />,
    badgeBg: 'bg-rose-950/60',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-800',
    defaultContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local Webpage</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Welcome to LocalBox</h1>
  <p>Static webpage running directly from browser storage.</p>
  <script src="app.js"></script>
</body>
</html>
`,
  },
  {
    ext: '.css',
    label: 'CSS',
    name: 'CSS Stylesheet',
    icon: <Palette className="w-4 h-4 text-sky-400" />,
    badgeBg: 'bg-sky-950/60',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-800',
    defaultContent: `/* Modern Stylesheet */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  padding: 2rem;
  line-height: 1.6;
}
`,
  },
  {
    ext: '.js',
    label: 'JS',
    name: 'JavaScript',
    icon: <Code2 className="w-4 h-4 text-amber-400" />,
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-800',
    defaultContent: `// JavaScript Module
console.log("App script loaded!");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");
});
`,
  },
  {
    ext: '.ts',
    label: 'TS',
    name: 'TypeScript',
    icon: <Code2 className="w-4 h-4 text-blue-400" />,
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-800',
    defaultContent: `export interface User {
  id: string;
  name: string;
  active: boolean;
}

export function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}
`,
  },
  {
    ext: '.tsx',
    label: 'TSX',
    name: 'TypeScript React',
    icon: <Code2 className="w-4 h-4 text-cyan-400" />,
    badgeBg: 'bg-cyan-950/60',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-800',
    defaultContent: `import React from 'react';

export interface Props {
  title?: string;
}

export const Component: React.FC<Props> = ({ title = "Hello World" }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900 text-white">
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
};
`,
  },
  {
    ext: '.json',
    label: 'JSON',
    name: 'JSON Data',
    icon: <Braces className="w-4 h-4 text-emerald-400" />,
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-800',
    defaultContent: `{\n  "name": "project-config",\n  "version": "1.0.0",\n  "offlineReady": true,\n  "data": []\n}\n`,
  },
  {
    ext: '.md',
    label: 'MD',
    name: 'Markdown Note',
    icon: <FileText className="w-4 h-4 text-indigo-400" />,
    badgeBg: 'bg-indigo-950/60',
    badgeText: 'text-indigo-400',
    badgeBorder: 'border-indigo-800',
    defaultContent: `# Project Documentation\n\n## Overview\nQuick notes, checklists, and documentation.\n\n- [x] Initial setup\n- [ ] Add new feature\n`,
  },
  {
    ext: '.py',
    label: 'Python',
    name: 'Python Script',
    icon: <Terminal className="w-4 h-4 text-yellow-400" />,
    badgeBg: 'bg-yellow-950/60',
    badgeText: 'text-yellow-400',
    badgeBorder: 'border-yellow-800',
    defaultContent: `#!/usr/bin/env python3\n\ndef main():\n    print("Hello from LocalBox!")\n\nif __name__ == "__main__":\n    main()\n`,
  },
  {
    ext: '.sql',
    label: 'SQL',
    name: 'SQL Query',
    icon: <Database className="w-4 h-4 text-teal-400" />,
    badgeBg: 'bg-teal-950/60',
    badgeText: 'text-teal-400',
    badgeBorder: 'border-teal-800',
    defaultContent: `-- SQL Schema & Queries\nCREATE TABLE IF NOT EXISTS items (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n`,
  },
  {
    ext: '.csv',
    label: 'CSV',
    name: 'CSV Spreadsheet',
    icon: <FileSpreadsheet className="w-4 h-4 text-green-400" />,
    badgeBg: 'bg-green-950/60',
    badgeText: 'text-green-400',
    badgeBorder: 'border-green-800',
    defaultContent: `id,name,role,status\n1,Alice,Engineer,Active\n2,Bob,Designer,Active\n`,
  },
  {
    ext: '.txt',
    label: 'TXT',
    name: 'Plain Text',
    icon: <FileText className="w-4 h-4 text-neutral-400" />,
    badgeBg: 'bg-neutral-800',
    badgeText: 'text-neutral-300',
    badgeBorder: 'border-neutral-700',
    defaultContent: `Notes and quick thoughts.\n`,
  },
];

const FOLDER_PRESETS = [
  'src',
  'components',
  'assets',
  'styles',
  'images',
  'js',
  'api',
  'docs',
  'public',
  'utils'
];

const FOLDER_COLORS = [
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500' },
  { id: 'sky', name: 'Sky Blue', bg: 'bg-sky-500' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-500' },
  { id: 'neutral', name: 'Neutral', bg: 'bg-neutral-500' },
];

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  initialMode = 'file',
  onClose,
  onCreateFile,
  currentFolderId = null,
  allFiles = [],
}) => {
  const [activeTab, setActiveTab] = useState<NewItemTab>(initialMode);
  
  // File state
  const [rawInputPath, setRawInputPath] = useState<string>('index.html');
  const [content, setContent] = useState<string>(EXTENSION_PRESETS[0].defaultContent);
  const [userHasEditedContent, setUserHasEditedContent] = useState<boolean>(false);

  // Folder state
  const [folderName, setFolderName] = useState<string>('components');
  const [selectedFolderColor, setSelectedFolderColor] = useState<string>('amber');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (initialMode === 'file') {
        setRawInputPath('index.html');
        setContent(EXTENSION_PRESETS[0].defaultContent);
        setUserHasEditedContent(false);
      } else {
        setFolderName('components');
      }
    }
  }, [isOpen, initialMode]);

  // Smart Path & Extension Analysis
  const parsedPathInfo = useMemo(() => {
    const clean = rawInputPath.trim().replace(/\\/g, '/');
    const segments = clean.split('/').filter(Boolean);
    const fileName = segments.pop() || '';
    const folderSegments = segments;

    // Detect extension
    const dotIndex = fileName.lastIndexOf('.');
    const ext = dotIndex !== -1 ? fileName.substring(dotIndex).toLowerCase() : '';

    // Match preset
    const matchedPreset = EXTENSION_PRESETS.find(p => p.ext === ext);

    const typeDetails = matchedPreset || {
      ext: ext || '.txt',
      label: ext.replace('.', '').toUpperCase() || 'FILE',
      name: ext ? `${ext.replace('.', '').toUpperCase()} File` : 'Document',
      icon: ext.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i) ? (
        <ImageIcon className="w-4 h-4 text-purple-400" />
      ) : ext.match(/\.(env|config|yaml|yml)$/i) ? (
        <KeyRound className="w-4 h-4 text-amber-400" />
      ) : (
        <FileText className="w-4 h-4 text-neutral-300" />
      ),
      badgeBg: 'bg-neutral-800',
      badgeText: 'text-neutral-300',
      badgeBorder: 'border-neutral-700',
      defaultContent: '',
    };

    return {
      fileName,
      folderSegments,
      hasNestedFolders: folderSegments.length > 0,
      ext,
      typeDetails,
    };
  }, [rawInputPath]);

  // Compute Current Destination Breadcrumbs
  const breadcrumbTrail = useMemo(() => {
    const trail: string[] = ['Root'];
    if (!currentFolderId) return trail;

    let currId: string | null = currentFolderId;
    const pathStack: string[] = [];

    while (currId) {
      const folder = allFiles.find(f => f.id === currId && !f.trashed);
      if (folder) {
        pathStack.unshift(folder.name);
        currId = folder.parentId || null;
      } else {
        break;
      }
    }

    return ['Root', ...pathStack];
  }, [currentFolderId, allFiles]);

  if (!isOpen) return null;

  // Handle Quick Extension Chip Click
  const handleExtensionChipClick = (preset: ExtensionPreset) => {
    let current = rawInputPath.trim();
    if (!current) {
      current = `untitled${preset.ext}`;
    } else {
      const dotIndex = current.lastIndexOf('.');
      if (dotIndex !== -1 && !current.endsWith('/')) {
        current = current.substring(0, dotIndex) + preset.ext;
      } else {
        current = `${current}${preset.ext}`;
      }
    }

    setRawInputPath(current);

    // If user hasn't manually altered content, update template starter content
    if (!userHasEditedContent) {
      setContent(preset.defaultContent);
    }
  };

  // Submit File (with nested path support)
  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { fileName, folderSegments } = parsedPathInfo;
    let finalFileName = fileName.trim();

    if (!finalFileName) {
      finalFileName = `Untitled_${Date.now()}.txt`;
    } else if (!finalFileName.includes('.')) {
      finalFileName += parsedPathInfo.typeDetails.ext;
    }

    const now = Date.now();
    const createdItems: VFile[] = [];
    let activeParentId = currentFolderId;

    // 1. Auto-create any nested subfolders
    if (folderSegments.length > 0) {
      for (const segment of folderSegments) {
        const existingFolder = allFiles.find(
          f => f.type === 'folder' && !f.trashed && f.name.toLowerCase() === segment.toLowerCase() && (f.parentId || null) === activeParentId
        );

        if (existingFolder) {
          activeParentId = existingFolder.id;
        } else {
          const newFolderId = 'folder_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
          const folderVFile: VFile = {
            id: newFolderId,
            name: segment,
            mimeType: 'folder',
            type: 'folder',
            size: 0,
            createdAt: now,
            updatedAt: now,
            parentId: activeParentId,
            trashed: false,
          };
          createdItems.push(folderVFile);
          activeParentId = newFolderId;
        }
      }
    }

    // 2. Create the file inside the resolved destination
    const mime = getMimeType(finalFileName);
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });

    const newFile: VFile = {
      id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + now,
      name: finalFileName,
      mimeType: mime || 'text/plain',
      size: blob.size,
      blob,
      textContent: content,
      createdAt: now,
      updatedAt: now,
      parentId: activeParentId,
      trashed: false,
      type: 'file',
    };

    createdItems.push(newFile);

    if (createdItems.length === 1) {
      onCreateFile(createdItems[0]);
    } else {
      onCreateFile(createdItems);
    }

    onClose();
  };

  // Submit Folder
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = folderName.trim();
    if (!finalName) {
      finalName = `New Folder (${Date.now()})`;
    }

    const now = Date.now();
    const newFolder: VFile = {
      id: 'folder_' + Math.random().toString(36).substring(2, 10) + '_' + now,
      name: finalName,
      mimeType: 'folder',
      type: 'folder',
      size: 0,
      folderColor: selectedFolderColor,
      createdAt: now,
      updatedAt: now,
      parentId: currentFolderId,
      trashed: false,
    };

    onCreateFile(newFolder);
    onClose();
    setFolderName('components');
  };

  return (
    <div 
      id="new-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="new-item-modal"
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-neutral-100 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all ${
              activeTab === 'folder' 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                : 'bg-sky-500/20 border-sky-500/40 text-sky-400'
            }`}>
              {activeTab === 'folder' ? <FolderPlus className="w-5 h-5" /> : <FilePlus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                {activeTab === 'folder' ? 'Create New Folder' : 'Create New Document / Code'}
              </h3>
              {/* Destination Breadcrumb */}
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 truncate font-mono mt-0.5">
                <span className="text-neutral-500">In:</span>
                {breadcrumbTrail.map((folderName, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />}
                    <span className={idx === breadcrumbTrail.length - 1 ? 'text-neutral-200 font-medium' : ''}>
                      {folderName}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-2xl my-3 shrink-0">
          <button
            type="button"
            id="tab-new-file"
            onClick={() => setActiveTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New File</span>
          </button>
          <button
            type="button"
            id="tab-new-folder"
            onClick={() => setActiveTab('folder')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'folder'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/25 font-bold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Form Body for FILE Mode */}
        {activeTab === 'file' ? (
          <form onSubmit={handleCreateFileSubmit} className="flex-1 overflow-y-auto py-1 space-y-4 pr-1">
            {/* Input with Live Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  File Name or Path <span className="text-[10px] text-neutral-500 font-normal font-mono">(e.g. src/app.js)</span>
                </label>
                {/* Live Detected Type Badge */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono transition-all ${parsedPathInfo.typeDetails.badgeBg} ${parsedPathInfo.typeDetails.badgeText} ${parsedPathInfo.typeDetails.badgeBorder}`}>
                  {parsedPathInfo.typeDetails.icon}
                  <span>{parsedPathInfo.typeDetails.name}</span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={rawInputPath}
                  onChange={(e) => setRawInputPath(e.target.value)}
                  placeholder="index.html or src/components/Header.tsx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  autoFocus
                />
              </div>

              {/* Nested Folder Auto-Creation Indicator */}
              {parsedPathInfo.hasNestedFolders && (
                <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-300 text-[11px] font-mono animate-in fade-in slide-in-from-top-1">
                  <FolderTree className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    Will auto-create folder{parsedPathInfo.folderSegments.length > 1 ? 's' : ''}:{' '}
                    <strong className="text-white font-semibold">
                      {parsedPathInfo.folderSegments.join(' / ')}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Smart Extension Pill Chips */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                Quick Extension Selector
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXTENSION_PRESETS.map((preset) => {
                  const isCurrentExt = parsedPathInfo.ext === preset.ext;
                  return (
                    <button
                      key={preset.ext}
                      type="button"
                      onClick={() => handleExtensionChipClick(preset)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border transition-all ${
                        isCurrentExt
                          ? `${preset.badgeBg} ${preset.badgeText} ${preset.badgeBorder} font-bold ring-1 ring-white/20 scale-[1.03]`
                          : 'bg-neutral-950/80 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {preset.icon}
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starter Content Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Initial Content / Starter Snippet
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {content.length} chars
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setUserHasEditedContent(true);
                }}
                rows={5}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none leading-relaxed"
                placeholder="Type starter content here..."
              />
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-confirm-create-file"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create {parsedPathInfo.hasNestedFolders ? 'Path & File' : 'File'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Form Body for FOLDER Mode */
          <form onSubmit={handleCreateFolderSubmit} className="flex-1 overflow-y-auto py-1 space-y-4 pr-1">
            {/* Folder Name input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Folder Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="components / assets / styles"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5 uppercase tracking-wider">
                Common Folder Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FOLDER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFolderName(preset)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono border transition-all ${
                      folderName === preset
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold scale-[1.03]'
                        : 'bg-neutral-950/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Folder Accent Color */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                Folder Accent Color
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FOLDER_COLORS.map((col) => {
                  const isSelected = selectedFolderColor === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedFolderColor(col.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl border text-center transition-all ${
                        isSelected 
                          ? 'bg-neutral-800 border-neutral-400 ring-1 ring-neutral-400 text-white' 
                          : 'bg-neutral-950/60 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full ${col.bg} flex items-center justify-center shadow-sm`}>
                        {isSelected && <Check className="w-3 h-3 text-neutral-950 stroke-[3]" />}
                      </div>
                      <span className="text-[10px] truncate w-full mt-0.5">{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-confirm-create-folder"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition-all min-h-[40px]"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create Folder</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const NewItemModal = NewFileModal;
