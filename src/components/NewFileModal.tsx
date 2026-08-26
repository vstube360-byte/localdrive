import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  File, 
  Folder,
  FolderPlus,
  FilePlus,
  X, 
  Sparkles, 
  Plus,
  Check,
  Terminal,
  FileDigit
} from 'lucide-react';
import { VFile } from '../types';
import { getMimeType } from '../utils/fileUtils';

export type NewItemTab = 'file' | 'folder';

interface NewFileModalProps {
  isOpen: boolean;
  initialMode?: NewItemTab;
  onClose: () => void;
  onCreateFile: (file: VFile) => void;
  currentFolderId?: string | null;
}

interface FileTemplate {
  id: string;
  name: string;
  extension: string;
  icon: React.ReactNode;
  defaultContent: string;
  description: string;
}

const FILE_TEMPLATES: FileTemplate[] = [
  {
    id: 'txt',
    name: 'Plain Text',
    extension: '.txt',
    icon: <FileText className="w-5 h-5 text-sky-400" />,
    defaultContent: 'Welcome to your new document.\n\nYou can take quick notes, write scratchpad ideas, or store snippets here.',
    description: 'Simple unformatted text note'
  },
  {
    id: 'md',
    name: 'Markdown Note',
    extension: '.md',
    icon: <FileText className="w-5 h-5 text-indigo-400" />,
    defaultContent: '# Document Title\n\n## Overview\nWrite formatted thoughts with **bold**, *italics*, and lists.\n\n- [ ] Task 1\n- [x] Completed task\n\n```js\nconsole.log("Hello from LocalCloud!");\n```\n',
    description: 'Rich formatting with headers & code blocks'
  },
  {
    id: 'json',
    name: 'JSON Data',
    extension: '.json',
    icon: <FileCode className="w-5 h-5 text-amber-400" />,
    defaultContent: '{\n  "name": "LocalCloud Project",\n  "version": "1.0.0",\n  "created": "' + new Date().toISOString() + '",\n  "settings": {\n    "offlineReady": true,\n    "secure": true\n  }\n}\n',
    description: 'Structured configuration data'
  },
  {
    id: 'js',
    name: 'JavaScript / TypeScript',
    extension: '.ts',
    icon: <FileCode className="w-5 h-5 text-emerald-400" />,
    defaultContent: '/**\n * Local script utility\n */\nexport function calculateSum(a: number, b: number): number {\n  return a + b;\n}\n\nconsole.log("Result:", calculateSum(10, 20));\n',
    description: 'Script file with code highlighting'
  },
  {
    id: 'html',
    name: 'HTML Webpage',
    extension: '.html',
    icon: <FileCode className="w-5 h-5 text-rose-400" />,
    defaultContent: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Local Page</title>\n  <style>\n    body { font-family: sans-serif; padding: 2rem; background: #0a0a0a; color: #fff; }\n  </style>\n</head>\n<body>\n  <h1>Local Sandbox</h1>\n  <p>Rendered locally in your offline workspace.</p>\n</body>\n</html>\n',
    description: 'HTML5 document with live preview'
  },
  {
    id: 'csv',
    name: 'CSV Spreadsheet',
    extension: '.csv',
    icon: <FileSpreadsheet className="w-5 h-5 text-teal-400" />,
    defaultContent: 'ID,Name,Role,Status\n1,Alice Johnson,Lead Engineer,Active\n2,Bob Smith,Designer,Active\n3,Charlie Brown,QA,Pending\n',
    description: 'Tabular comma-separated values'
  },
  {
    id: 'py',
    name: 'Python Script',
    extension: '.py',
    icon: <Terminal className="w-5 h-5 text-yellow-400" />,
    defaultContent: '#!/usr/bin/env python3\n"""\nLocal Python utility\n"""\ndef main():\n    print("Hello from LocalCloud Drive!")\n\nif __name__ == "__main__":\n    main()\n',
    description: 'Python script with syntax highlighting'
  }
];

const FOLDER_PRESETS = [
  'Projects',
  'Documents',
  'Media',
  'Work',
  'Archive',
  'Notes',
  'Backups',
  'Photos'
];

const FOLDER_COLORS = [
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500', border: 'border-amber-500/50', text: 'text-amber-400' },
  { id: 'sky', name: 'Sky Blue', bg: 'bg-sky-500', border: 'border-sky-500/50', text: 'text-sky-400' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500', border: 'border-purple-500/50', text: 'text-purple-400' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-500', border: 'border-rose-500/50', text: 'text-rose-400' },
  { id: 'neutral', name: 'Neutral', bg: 'bg-neutral-500', border: 'border-neutral-500/50', text: 'text-neutral-300' },
];

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  initialMode = 'file',
  onClose,
  onCreateFile,
  currentFolderId = null,
}) => {
  const [activeTab, setActiveTab] = useState<NewItemTab>(initialMode);
  
  // File State
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate>(FILE_TEMPLATES[0]);
  const [fileName, setFileName] = useState<string>('Untitled Document');
  const [customExtension, setCustomExtension] = useState<string>('.txt');
  const [initialContent, setInitialContent] = useState<string>(FILE_TEMPLATES[0].defaultContent);

  // Folder State
  const [folderName, setFolderName] = useState<string>('New Folder');
  const [selectedFolderColor, setSelectedFolderColor] = useState<string>('amber');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: FileTemplate) => {
    setSelectedTemplate(template);
    setCustomExtension(template.extension);
    setInitialContent(template.defaultContent);
    if (fileName === 'Untitled Document' || fileName.startsWith('Untitled')) {
      setFileName(`Untitled ${template.name}`);
    }
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = fileName.trim();
    if (!finalName) {
      finalName = `Untitled_${Date.now()}`;
    }

    // Append extension if user didn't write it
    if (!finalName.includes('.')) {
      finalName += customExtension;
    }

    const now = Date.now();
    const mime = getMimeType(finalName);
    const blob = new Blob([initialContent], { type: mime || 'text/plain;charset=utf-8' });

    const newFile: VFile = {
      id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + now,
      name: finalName,
      mimeType: mime || 'text/plain',
      size: blob.size,
      blob,
      textContent: initialContent,
      createdAt: now,
      updatedAt: now,
      parentId: currentFolderId,
      trashed: false,
      type: 'file',
    };

    onCreateFile(newFile);
    onClose();
    // Reset
    setFileName('Untitled Document');
    setSelectedTemplate(FILE_TEMPLATES[0]);
    setInitialContent(FILE_TEMPLATES[0].defaultContent);
  };

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
    setFolderName('New Folder');
  };

  return (
    <div 
      id="new-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="new-item-modal"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-neutral-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Mode Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
              activeTab === 'folder' 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                : 'bg-sky-500/20 border-sky-500/30 text-sky-400'
            }`}>
              {activeTab === 'folder' ? <FolderPlus className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {activeTab === 'folder' ? 'Create New Folder' : 'Create New Document'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {activeTab === 'folder' ? 'Create a directory to organize your files' : 'Choose a template or write custom code/text'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-2xl my-3 shrink-0">
          <button
            type="button"
            id="tab-new-file"
            onClick={() => setActiveTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
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
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-bold'
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
            {/* Template Selector Grid */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Template &amp; File Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILE_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-sky-500/15 border-sky-500/50 text-white ring-1 ring-sky-500/40' 
                          : 'bg-neutral-800/60 hover:bg-neutral-800 border-neutral-700/60 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        {tmpl.icon}
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                      <span className="font-semibold text-xs text-white truncate w-full">{tmpl.name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{tmpl.extension}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Name input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                File Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="my_document.txt"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Initial text content preview / scratchpad */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Initial Content (Optional)
              </label>
              <textarea
                value={initialContent}
                onChange={(e) => setInitialContent(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                placeholder="Type initial content here..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
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
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition-all min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create File</span>
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
                  placeholder="Projects / Documents"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Quick Name Suggestions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FOLDER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFolderName(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                      folderName === preset
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                        : 'bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Folder Accent Color */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Folder Accent
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FOLDER_COLORS.map((col) => {
                  const isSelected = selectedFolderColor === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedFolderColor(col.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                        isSelected 
                          ? 'bg-neutral-800 border-neutral-400 ring-1 ring-neutral-400 text-white' 
                          : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full ${col.bg} flex items-center justify-center`}>
                        {isSelected && <Check className="w-3 h-3 text-neutral-950 stroke-[3]" />}
                      </div>
                      <span className="text-[10px] truncate w-full">{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4">
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
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all min-h-[40px]"
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
