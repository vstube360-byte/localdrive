import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VFile, ViewMode, SortOption, FileCategory, StorageStats, ContextMenuState } from './types';
import { dbStorage } from './db/indexedDB';
import { 
  getFileCategory, 
  getFileExtension, 
  generateUniqueName, 
  getMimeType, 
  isTextOrCode,
  isImageOrVideo,
  readBlobAsText,
  isHtml,
  resolveHtmlRelativeAssets,
  downloadVirtualFile,
  isFolder,
  ensureUniqueNamesPerFolder,
  getStarterContentForFile,
} from './utils/fileUtils';
import { createZipArchive, extractZipArchive } from './utils/zipUtils';
import { isAppOfflineLoaded, loadAppForOffline } from './serviceWorkerRegistration';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FileList } from './components/FileList';
import { PreviewModal } from './components/PreviewModal';
import { CodeEditorModal } from './components/CodeEditorModal';
import { NewFileModal } from './components/NewFileModal';
import { StorageModal } from './components/StorageModal';
import { ProgressModal } from './components/ProgressModal';
import { ContextMenu } from './components/ContextMenu';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { VideoStreamingView } from './components/VideoStreamingView';
import { AudioPlayerView } from './components/AudioPlayerView';
import { FilePropertiesModal } from './components/FilePropertiesModal';
import { NotFoundView } from './components/NotFoundView';
import { ClipboardState } from './types';
import { computeUrlFromState, parseRouteFromUrl } from './utils/routerUtils';

export default function App() {
  // 1. Files & DB state
  const [allFiles, setAllFiles] = useState<VFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [invalidPath, setInvalidPath] = useState<string>('');
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemCount: number;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    itemCount: 0,
    onConfirm: () => {},
  });
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usage: 0,
    quota: 1024 * 1024 * 1024 * 5,
    fileCount: 0,
    categoryBreakdown: {
      all: 0,
      documents: 0,
      images: 0,
      audio: 0,
      video: 0,
      code: 0,
      archives: 0,
      other: 0,
    },
  });

  // Offline loading state
  const [isOfflineLoaded, setIsOfflineLoaded] = useState<boolean>(() => isAppOfflineLoaded());
  const [isOfflineLoading, setIsOfflineLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleLoadOffline = async () => {
    setIsOfflineLoading(true);
    try {
      const res = await loadAppForOffline();
      setIsOfflineLoaded(true);
      showToast(res.message || 'App is now loaded and cached for 100% offline access!');
    } catch (err) {
      console.error('Offline loading error:', err);
      setIsOfflineLoaded(true);
      showToast('App cached for offline use.');
    } finally {
      setIsOfflineLoading(false);
    }
  };

  // 2. iPad UI & Navigation state
  const prevWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Dynamically adjust sidebar and dimensions when screen size or orientation changes
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const prevW = prevWidthRef.current;
      if (prevW >= 768 && w < 768) {
        setIsSidebarOpen(false);
      } else if (prevW < 768 && w >= 768) {
        setIsSidebarOpen(true);
      }
      prevWidthRef.current = w;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [isStarredView, setIsStarredView] = useState<boolean>(false);
  const [isRecentView, setIsRecentView] = useState<boolean>(false);
  const [isTrashView, setIsTrashView] = useState<boolean>(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'updatedAt', order: 'desc' });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Compute folder breadcrumb trail
  const folderBreadcrumbs = useMemo(() => {
    const path: VFile[] = [];
    let currId = currentFolderId;
    while (currId) {
      const folder = allFiles.find(f => f.id === currId && !f.trashed && isFolder(f));
      if (folder) {
        path.unshift(folder);
        currId = folder.parentId || null;
      } else {
        break;
      }
    }
    return path;
  }, [currentFolderId, allFiles]);

  // 3. Selection & Renaming state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  // 4. Modal & Action states
  const [previewFile, setPreviewFile] = useState<VFile | null>(null);
  const [editorFile, setEditorFile] = useState<VFile | null>(null);
  const [propertiesFile, setPropertiesFile] = useState<VFile | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState<boolean>(false);
  const [newItemModalMode, setNewItemModalMode] = useState<'file' | 'folder'>('file');
  const [inlineCreatingType, setInlineCreatingType] = useState<'file' | 'folder' | null>(null);
  const [storageModalOpen, setStorageModalOpen] = useState<boolean>(false);
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    mode: 'uploading' | 'compressing' | 'extracting';
    percent: number;
    currentFileName: string;
    processedCount?: number;
    totalCount?: number;
  }>({
    isOpen: false,
    mode: 'uploading',
    percent: 0,
    currentFileName: '',
    processedCount: 0,
    totalCount: 0,
  });

  // 5. Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetItem: null,
    selectedItems: [],
  });

  // 6. Global Drag over window for file upload
  const [isWindowDragOver, setIsWindowDragOver] = useState<boolean>(false);

  // Compute storage statistics
  const updateStorageStats = useCallback(async (files: VFile[]) => {
    const estimate = await dbStorage.getStorageEstimate();
    const active = files.filter(f => !f.trashed);
    const breakdown: Record<FileCategory, number> = {
      all: 0,
      documents: 0,
      images: 0,
      audio: 0,
      video: 0,
      code: 0,
      archives: 0,
      other: 0,
    };

    let totalSize = 0;
    let fileCount = 0;

    for (const file of active) {
      if (isFolder(file)) continue; // Folders are NOT counted as files!
      fileCount++;
      totalSize += file.size;
      const cat = getFileCategory(file);
      breakdown[cat] = (breakdown[cat] || 0) + file.size;
    }
    breakdown.all = totalSize;

    setStorageStats({
      usage: estimate.usage > 0 ? estimate.usage : totalSize,
      quota: estimate.quota,
      fileCount,
      categoryBreakdown: breakdown,
    });
  }, []);

  // Initial Load from IndexedDB & Initial URL Route Parsing
  useEffect(() => {
    const initDB = async () => {
      try {
        const storedFiles = await dbStorage.getAllFiles();
        const { files: cleanFiles, updated } = ensureUniqueNamesPerFolder(storedFiles);
        if (updated.length > 0) {
          await dbStorage.saveFiles(updated);
        }
        setAllFiles(cleanFiles);
        await updateStorageStats(cleanFiles);

        // Restore initial navigation state from browser URL
        const route = parseRouteFromUrl(cleanFiles);
        if (route.isNotFound) {
          setIsNotFound(true);
          setInvalidPath(route.invalidPath || window.location.pathname);
        } else {
          setIsNotFound(false);
          if (route.isTrashView) setIsTrashView(true);
          else if (route.isStarredView) setIsStarredView(true);
          else if (route.isRecentView) setIsRecentView(true);
          else if (route.selectedCategory !== 'all') setSelectedCategory(route.selectedCategory);
          else if (route.currentFolderId) setCurrentFolderId(route.currentFolderId);

          if (route.previewFileId) {
            const p = cleanFiles.find(f => f.id === route.previewFileId);
            if (p) setPreviewFile(p);
          }
          if (route.editorFileId) {
            const e = cleanFiles.find(f => f.id === route.editorFileId);
            if (e) setEditorFile(e);
          }
        }
      } catch (err) {
        console.error('Failed to initialize database', err);
      } finally {
        setLoading(false);
      }
    };

    initDB();
  }, [updateStorageStats]);

  // URL Browser Address Bar Sync (PushState)
  useEffect(() => {
    if (loading) return;

    const { path, search } = computeUrlFromState(
      selectedCategory,
      isStarredView,
      isRecentView,
      isTrashView,
      currentFolderId,
      folderBreadcrumbs,
      previewFile,
      editorFile,
      isNotFound,
      invalidPath
    );

    const targetUrl = `${path}${search}`;
    const currentFullUrl = `${window.location.pathname}${window.location.search}`;

    if (currentFullUrl !== targetUrl) {
      window.history.pushState({ path, search }, '', targetUrl);
    }
  }, [
    loading,
    selectedCategory,
    isStarredView,
    isRecentView,
    isTrashView,
    currentFolderId,
    folderBreadcrumbs,
    previewFile,
    editorFile,
    isNotFound,
    invalidPath,
  ]);

  // Browser Back / Forward Button Handling (Popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (loading || allFiles.length === 0) return;
      const route = parseRouteFromUrl(allFiles);

      if (route.isNotFound) {
        setIsNotFound(true);
        setInvalidPath(route.invalidPath || window.location.pathname);
      } else {
        setIsNotFound(false);
        setIsTrashView(route.isTrashView);
        setIsStarredView(route.isStarredView);
        setIsRecentView(route.isRecentView);
        setSelectedCategory(route.selectedCategory);
        setCurrentFolderId(route.currentFolderId);

        const p = route.previewFileId ? allFiles.find(f => f.id === route.previewFileId) || null : null;
        setPreviewFile(p);

        const e = route.editorFileId ? allFiles.find(f => f.id === route.editorFileId) || null : null;
        setEditorFile(e);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loading, allFiles]);

  // Handle Window-level Drag & Drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        setIsWindowDragOver(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsWindowDragOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setIsWindowDragOver(false);
        await handleUploadFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [allFiles]);

  // Filter and sort files
  const displayedFiles = useMemo(() => {
    let result = allFiles.filter(f => {
      // 1. Trash filter
      if (isTrashView) {
        return f.trashed === true;
      }
      if (f.trashed) return false;

      // 2. Starred view
      if (isStarredView) {
        return f.favorite === true;
      }

      // 3. Search query filter (searches across all files, extensions, mime, color tags, notes, text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesExt = getFileExtension(f.name).toLowerCase().includes(q);
        const matchesMime = f.mimeType?.toLowerCase().includes(q);
        const matchesTag = f.colorTag ? f.colorTag.toLowerCase().includes(q) : false;
        const matchesNotes = f.notes ? f.notes.toLowerCase().includes(q) : false;
        const matchesContent = f.textContent ? f.textContent.toLowerCase().includes(q) : false;
        return matchesName || matchesExt || matchesMime || matchesTag || matchesNotes || matchesContent;
      }

      // 4. Recent view
      if (isRecentView) {
        return !isFolder(f);
      }

      // 5. Category filter (includes files from root and all subfolders recursively)
      if (selectedCategory !== 'all') {
        if (isFolder(f)) return false; // Exclude folder items from category views
        if (getFileCategory(f) !== selectedCategory) return false;

        // If inside a specific subfolder, only include files in that folder or any of its subfolders
        if (currentFolderId) {
          let currParent = f.parentId || null;
          let isInsideCurrentTree = false;
          while (currParent) {
            if (currParent === currentFolderId) {
              isInsideCurrentTree = true;
              break;
            }
            const parentObj = allFiles.find(p => p.id === currParent);
            currParent = parentObj?.parentId || null;
          }
          return isInsideCurrentTree;
        }

        // If in root drive, show all category files from all folders & subfolders
        return true;
      }

      // 6. Normal folder view: match current folder items
      const parent = f.parentId || null;
      return parent === currentFolderId;
    });

    // Sort files: Folders ALWAYS sorted to top
    result.sort((a, b) => {
      const aIsFolder = isFolder(a);
      const bIsFolder = isFolder(b);
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      let comparison = 0;
      if (sortOption.field === 'name') {
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortOption.field === 'size') {
        comparison = a.size - b.size;
      } else if (sortOption.field === 'updatedAt') {
        comparison = a.updatedAt - b.updatedAt;
      } else if (sortOption.field === 'type') {
        const extA = getFileExtension(a.name);
        const extB = getFileExtension(b.name);
        comparison = extA.localeCompare(extB);
      }

      return sortOption.order === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allFiles, selectedCategory, isStarredView, isRecentView, isTrashView, searchQuery, sortOption, currentFolderId]);

  // Active files in current view (Files, Video view, or Audio view)
  const currentViewFiles = useMemo(() => {
    if (selectedCategory === 'video' && !isTrashView && !isStarredView && !isRecentView) {
      return allFiles.filter(f => !f.trashed && (f.mimeType?.startsWith('video/') || getFileCategory(f) === 'video'));
    }
    if (selectedCategory === 'audio' && !isTrashView && !isStarredView && !isRecentView) {
      return allFiles.filter(f => !f.trashed && (f.mimeType?.startsWith('audio/') || getFileCategory(f) === 'audio'));
    }
    return displayedFiles;
  }, [allFiles, displayedFiles, selectedCategory, isTrashView, isStarredView, isRecentView]);

  // Clipboard & Move Handlers
  const handleCopy = (items: VFile[]) => {
    if (items.length === 0) return;
    setClipboard({ items, action: 'copy' });
    showToast(`Copied ${items.length} item${items.length === 1 ? '' : 's'} to clipboard`);
  };

  const handleCut = (items: VFile[]) => {
    if (items.length === 0) return;
    setClipboard({ items, action: 'cut' });
    showToast(`Cut ${items.length} item${items.length === 1 ? '' : 's'} to clipboard`);
  };

  const handlePaste = async () => {
    if (!clipboard || clipboard.items.length === 0) return;

    const now = Date.now();
    if (clipboard.action === 'copy') {
      const duplicated: VFile[] = [];
      for (const item of clipboard.items) {
        const uniqueName = generateUniqueName(`Copy of ${item.name}`, allFiles, undefined, currentFolderId);
        const copy: VFile = {
          ...item,
          id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + (now + Math.random()),
          name: uniqueName,
          parentId: currentFolderId,
          createdAt: now,
          updatedAt: now,
        };
        duplicated.push(copy);
      }
      await dbStorage.saveFiles(duplicated);
      setAllFiles(prev => [...duplicated, ...prev]);
      await updateStorageStats([...duplicated, ...allFiles]);
      showToast(`Pasted ${duplicated.length} item${duplicated.length === 1 ? '' : 's'}`);
    } else if (clipboard.action === 'cut') {
      const itemIds = new Set(clipboard.items.map(i => i.id));
      const updated = allFiles.map(f => {
        if (itemIds.has(f.id)) {
          return { ...f, parentId: currentFolderId, updatedAt: now };
        }
        return f;
      });
      const movedFiles = updated.filter(f => itemIds.has(f.id));
      await dbStorage.saveFiles(movedFiles);
      setAllFiles(updated);
      await updateStorageStats(updated);
      setClipboard(null);
      showToast(`Moved ${movedFiles.length} item${movedFiles.length === 1 ? '' : 's'} to current folder`);
    }
  };

  const handleMoveItemToFolder = async (draggedItemId: string, targetFolderId: string) => {
    if (!draggedItemId || !targetFolderId || draggedItemId === targetFolderId) return;

    const targetFolder = allFiles.find(f => f.id === targetFolderId);
    const draggedItem = allFiles.find(f => f.id === draggedItemId);
    if (!targetFolder || !draggedItem) return;

    const now = Date.now();
    const uniqueName = generateUniqueName(draggedItem.name, allFiles, draggedItem.id, targetFolderId);
    const updated: VFile = {
      ...draggedItem,
      name: uniqueName,
      parentId: targetFolderId,
      updatedAt: now,
    };

    const newAllFiles = allFiles.map(f => (f.id === draggedItemId ? updated : f));
    await dbStorage.saveFile(updated);
    setAllFiles(newAllFiles);
    await updateStorageStats(newAllFiles);
    showToast(`Moved "${draggedItem.name}" into "${targetFolder.name}"`);
  };

  const handleUpdateFile = async (updatedFile: VFile) => {
    const newFiles = allFiles.map(f => (f.id === updatedFile.id ? updatedFile : f));
    await dbStorage.saveFile(updatedFile);
    setAllFiles(newFiles);
  };

  // Global Keyboard shortcuts (Cmd/Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V, F2, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      const selectedItemsList = currentViewFiles.filter(f => selectedIds.has(f.id));

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(currentViewFiles.map(f => f.id)));
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        if (selectedItemsList.length > 0) {
          e.preventDefault();
          handleCopy(selectedItemsList);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        if (selectedItemsList.length > 0) {
          e.preventDefault();
          handleCut(selectedItemsList);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        if (clipboard && clipboard.items.length > 0) {
          e.preventDefault();
          handlePaste();
        }
      } else if (e.key === 'F2') {
        if (selectedItemsList.length === 1) {
          e.preventDefault();
          setRenamingItemId(selectedItemsList[0].id);
        }
      } else if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
        if (isSelectMode) {
          setIsSelectMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentViewFiles, selectedIds, clipboard, isSelectMode]);

  // Navigation handlers
  const handleSelectAllFiles = () => {
    setIsNotFound(false);
    setSelectedCategory('all');
    setIsStarredView(false);
    setIsRecentView(false);
    setIsTrashView(false);
    setCurrentFolderId(null);
    setSelectedIds(new Set());
  };

  const handleSelectCategory = (category: FileCategory) => {
    setIsNotFound(false);
    setSelectedCategory(category);
    setIsStarredView(false);
    setIsRecentView(false);
    setIsTrashView(false);
    setCurrentFolderId(null);
    setSelectedIds(new Set());
  };

  const handleSelectStarred = () => {
    setIsNotFound(false);
    setIsStarredView(true);
    setIsRecentView(false);
    setIsTrashView(false);
    setSelectedCategory('all');
    setCurrentFolderId(null);
    setSelectedIds(new Set());
  };

  const handleSelectRecent = () => {
    setIsNotFound(false);
    setIsRecentView(true);
    setIsStarredView(false);
    setIsTrashView(false);
    setSelectedCategory('all');
    setCurrentFolderId(null);
    setSelectedIds(new Set());
    setSortOption({ field: 'updatedAt', order: 'desc' });
  };

  const handleSelectTrash = () => {
    setIsNotFound(false);
    setIsTrashView(true);
    setIsStarredView(false);
    setIsRecentView(false);
    setSelectedCategory('all');
    setCurrentFolderId(null);
    setSelectedIds(new Set());
  };

  // Direct toggle for individual item (Checkbox click or Select Mode tap)
  const handleToggleItemSelect = (item: VFile, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    lastSelectedIdRef.current = item.id;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  // Selection handlers (Click with Shift-range, Ctrl/Cmd toggle, or single select)
  const handleItemSelect = (item: VFile, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const mouseEvent = e as React.MouseEvent;

    // Shift key range selection
    if (mouseEvent.shiftKey && lastSelectedIdRef.current) {
      const lastIndex = displayedFiles.findIndex(f => f.id === lastSelectedIdRef.current);
      const currentIndex = displayedFiles.findIndex(f => f.id === item.id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = displayedFiles.slice(start, end + 1).map(f => f.id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
        return;
      }
    }

    lastSelectedIdRef.current = item.id;

    if (mouseEvent.metaKey || mouseEvent.ctrlKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    } else {
      setSelectedIds(prev => {
        if (prev.has(item.id) && prev.size === 1) {
          return new Set();
        }
        return new Set([item.id]);
      });
    }
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(currentViewFiles.map(f => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Direct open in external browser tab (Native Virtual Server for static sites with full asset resolution)
  const handleOpenInTab = async (item: VFile) => {
    if (isHtml(item) && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        if (!navigator.serviceWorker.controller) {
          await navigator.serviceWorker.register('/sw.js').catch(() => {});
          await navigator.serviceWorker.ready.catch(() => {});
        }
        const rootFolderId = item.parentId || '__root__';
        const vsiteUrl = `/__vsite__/${rootFolderId}/${encodeURIComponent(item.name)}`;
        window.open(vsiteUrl, '_blank');
        return;
      } catch (err) {
        console.warn('Virtual web server navigation fallback to Blob URL:', err);
      }
    }

    let blob = item.blob;
    if (!blob && item.textContent !== undefined) {
      blob = new Blob([item.textContent], { type: item.mimeType || getMimeType(item.name) });
    }
    if (isHtml(item)) {
      try {
        let text = item.textContent;
        if (text === undefined && blob) {
          text = await readBlobAsText(blob);
        }
        if (text) {
          const { resolvedHtml } = await resolveHtmlRelativeAssets(text, allFiles);
          blob = new Blob([resolvedHtml], { type: 'text/html;charset=utf-8' });
        }
      } catch (e) {
        console.warn('Could not resolve HTML relative assets', e);
      }
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  // Open file handler:
  // - If folder: Navigate into folder
  // - If text or code file: Open Code/Text Editor modal
  // - If Image/Video: Open Image/Video preview modal
  // - All others: Open in browser tab
  const handleDoubleClick = (item: VFile) => {
    if (isFolder(item)) {
      setCurrentFolderId(item.id);
      setSelectedIds(new Set());
      return;
    }
    if (isTextOrCode(item)) {
      setEditorFile(item);
    } else if (isImageOrVideo(item)) {
      setPreviewFile(item);
    } else {
      handleOpenInTab(item);
    }
  };

  // Save file content from Code/Text Editor
  const handleSaveFileContent = async (file: VFile, newContent: string) => {
    const now = Date.now();
    const mime = file.mimeType || getMimeType(file.name);
    const newBlob = new Blob([newContent], { type: mime });
    const updatedFile: VFile = {
      ...file,
      textContent: newContent,
      blob: newBlob,
      size: newBlob.size,
      updatedAt: now,
    };

    await dbStorage.saveFile(updatedFile);
    setAllFiles(prev => prev.map(f => (f.id === file.id ? updatedFile : f)));
    if (editorFile && editorFile.id === file.id) {
      setEditorFile(updatedFile);
    }
    await updateStorageStats(allFiles.map(f => (f.id === file.id ? updatedFile : f)));
  };

  // Context Menu Handlers
  const handleItemContextMenu = (item: VFile, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let itemsToSelect: VFile[] = [];
    if (selectedIds.has(item.id)) {
      itemsToSelect = allFiles.filter(f => selectedIds.has(f.id));
    } else {
      setSelectedIds(new Set([item.id]));
      itemsToSelect = [item];
    }

    setContextMenu({
      isOpen: true,
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
      targetItem: item,
      selectedItems: itemsToSelect,
    });
  };

  const handleBlankContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
      targetItem: null,
      selectedItems: [],
    });
  };

  // Create File or Folder from Modal (Supports single or multi-item nested path creation)
  const handleCreateFile = async (itemOrItems: VFile | VFile[] | string, content?: string, mimeType?: string) => {
    if (Array.isArray(itemOrItems)) {
      if (itemOrItems.length === 0) return;
      await dbStorage.saveFiles(itemOrItems);
      setAllFiles(prev => [...itemOrItems, ...prev]);
      await updateStorageStats([...itemOrItems, ...allFiles]);
      const mainItem = itemOrItems[itemOrItems.length - 1];
      const isDir = mainItem.type === 'folder' || mainItem.mimeType === 'folder';
      showToast(isDir ? `Created folder "${mainItem.name}"` : `Created file "${mainItem.name}"`);
      return;
    }

    let newFile: VFile;
    const now = Date.now();

    if (typeof itemOrItems === 'string') {
      const uniqueName = generateUniqueName(itemOrItems, allFiles, undefined, currentFolderId);
      const mime = mimeType || 'text/plain';
      const text = content || '';
      const blob = new Blob([text], { type: mime });
      newFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + now,
        name: uniqueName,
        mimeType: mime,
        type: 'file',
        size: blob.size,
        textContent: text,
        blob,
        createdAt: now,
        updatedAt: now,
        parentId: currentFolderId,
        trashed: false,
      };
    } else {
      const targetParent = itemOrItems.parentId !== undefined ? itemOrItems.parentId : currentFolderId;
      const uniqueName = generateUniqueName(itemOrItems.name, allFiles, undefined, targetParent);
      newFile = {
        ...itemOrItems,
        name: uniqueName,
        parentId: targetParent,
        createdAt: itemOrItems.createdAt || now,
        updatedAt: itemOrItems.updatedAt || now,
      };
    }

    await dbStorage.saveFile(newFile);
    setAllFiles(prev => [newFile, ...prev]);
    await updateStorageStats([newFile, ...allFiles]);
    const isDir = newFile.type === 'folder' || newFile.mimeType === 'folder';
    showToast(isDir ? `Created folder "${newFile.name}"` : `Created file "${newFile.name}"`);
  };

  // Inline Creation Commit Handler (instant inline creation without popup)
  const handleInlineCreateCommit = async (rawName: string, type: 'file' | 'folder') => {
    setInlineCreatingType(null);
    const trimmed = rawName.trim();
    if (!trimmed) return;

    // Check for nested path like "src/components/App.tsx"
    const normalized = trimmed.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);

    if (segments.length > 1) {
      const fileName = segments.pop() || (type === 'folder' ? 'folder' : 'untitled.txt');
      const folderSegments = segments;
      let activeParentId = currentFolderId;
      const createdItems: VFile[] = [];
      const now = Date.now();

      for (const seg of folderSegments) {
        const existingFolder = allFiles.find(
          f => isFolder(f) && !f.trashed && f.name.toLowerCase() === seg.toLowerCase() && (f.parentId || null) === activeParentId
        );
        if (existingFolder) {
          activeParentId = existingFolder.id;
        } else {
          const newFolderId = 'folder_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
          const folderVFile: VFile = {
            id: newFolderId,
            name: seg,
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

      if (type === 'folder') {
        const uniqueName = generateUniqueName(fileName, allFiles, undefined, activeParentId);
        const newFolder: VFile = {
          id: 'folder_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
          name: uniqueName,
          mimeType: 'folder',
          type: 'folder',
          size: 0,
          createdAt: now,
          updatedAt: now,
          parentId: activeParentId,
          trashed: false,
        };
        createdItems.push(newFolder);
      } else {
        const uniqueName = generateUniqueName(fileName, allFiles, undefined, activeParentId);
        const mime = getMimeType(uniqueName);
        const starterContent = getStarterContentForFile(uniqueName);
        const blob = new Blob([starterContent], { type: mime || 'text/plain;charset=utf-8' });
        const newFile: VFile = {
          id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
          name: uniqueName,
          mimeType: mime || 'text/plain',
          type: 'file',
          size: blob.size,
          blob,
          textContent: starterContent,
          createdAt: now,
          updatedAt: now,
          parentId: activeParentId,
          trashed: false,
        };
        createdItems.push(newFile);
      }

      await handleCreateFile(createdItems);
      return;
    }

    // Direct single item creation
    const now = Date.now();
    if (type === 'folder') {
      const uniqueName = generateUniqueName(trimmed, allFiles, undefined, currentFolderId);
      const newFolder: VFile = {
        id: 'folder_' + Math.random().toString(36).substring(2, 10) + '_' + now,
        name: uniqueName,
        mimeType: 'folder',
        type: 'folder',
        size: 0,
        createdAt: now,
        updatedAt: now,
        parentId: currentFolderId,
        trashed: false,
      };
      await handleCreateFile(newFolder);
    } else {
      const uniqueName = generateUniqueName(trimmed, allFiles, undefined, currentFolderId);
      const mime = getMimeType(uniqueName);
      const starterContent = getStarterContentForFile(uniqueName);
      const blob = new Blob([starterContent], { type: mime || 'text/plain;charset=utf-8' });
      const newFile: VFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + now,
        name: uniqueName,
        mimeType: mime || 'text/plain',
        type: 'file',
        size: blob.size,
        blob,
        textContent: starterContent,
        createdAt: now,
        updatedAt: now,
        parentId: currentFolderId,
        trashed: false,
      };
      await handleCreateFile(newFile);
    }
  };

  // Upload Files from iPad / Computer / Gallery
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setProgressModal({
      isOpen: true,
      mode: 'uploading',
      percent: 5,
      currentFileName: 'Preparing upload...',
      processedCount: 0,
      totalCount: filesArray.length,
    });

    const now = Date.now();
    const newFiles: VFile[] = [];
    const runningFiles = [...allFiles];

    for (let i = 0; i < filesArray.length; i++) {
      const osFile = filesArray[i];
      let rawName = osFile.name;
      // Handle mobile camera / gallery files that might have blank or generic names
      if (!rawName || rawName === 'image' || rawName === 'video' || rawName === 'Blob') {
        const ext = osFile.type ? (osFile.type.split('/')[1] || 'bin').replace('jpeg', 'jpg') : 'bin';
        rawName = `photo_${now}_${i + 1}.${ext}`;
      }

      const percent = Math.round(((i + 1) / filesArray.length) * 85);
      setProgressModal(prev => ({
        ...prev,
        percent,
        currentFileName: rawName,
        processedCount: i + 1,
      }));

      const mime = osFile.type || getMimeType(rawName);
      const uniqueName = generateUniqueName(rawName, runningFiles, undefined, currentFolderId);

      let textContent: string | undefined = undefined;
      const tempVFile: VFile = {
        id: '',
        name: uniqueName,
        mimeType: mime,
        size: osFile.size,
        createdAt: now,
        updatedAt: now,
      };

      if (isTextOrCode(tempVFile) && osFile.size < 2 * 1024 * 1024) {
        try {
          textContent = await readBlobAsText(osFile);
        } catch (e) {
          console.warn('Could not read text for uploaded file', e);
        }
      }

      const newVFile: VFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + (now + i),
        name: uniqueName,
        mimeType: mime,
        size: osFile.size,
        blob: osFile,
        textContent,
        createdAt: now,
        updatedAt: now,
        parentId: currentFolderId,
        trashed: false,
      };
      newFiles.push(newVFile);
      runningFiles.push(newVFile);
    }

    setProgressModal(prev => ({ ...prev, percent: 95, currentFileName: 'Saving to offline storage...' }));
    await dbStorage.saveFiles(newFiles);
    setAllFiles(prev => [...newFiles, ...prev]);
    await updateStorageStats([...newFiles, ...allFiles]);

    setProgressModal(prev => ({ ...prev, percent: 100, currentFileName: 'Upload complete!' }));
    setTimeout(() => setProgressModal(prev => ({ ...prev, isOpen: false })), 600);

    const msg = newFiles.length === 1 
      ? `Uploaded ${newFiles[0].name}`
      : `Successfully uploaded ${newFiles.length} files to drive`;
    showToast(msg);
  };

  // Handle uploading files with paths (e.g. from folder upload or drag-and-drop folders)
  const handleUploadFilesWithPaths = async (items: { file: File; path: string }[]) => {
    if (items.length === 0) return;

    setProgressModal({
      isOpen: true,
      mode: 'uploading',
      percent: 5,
      currentFileName: 'Building folder structure...',
      processedCount: 0,
      totalCount: items.length,
    });

    const now = Date.now();
    const newFiles: VFile[] = [];
    const runningFiles = [...allFiles];
    const folderMap = new Map<string, string>();

    const getOrCreateFolderId = (folderSegments: string[]): string | null => {
      let currParentId = currentFolderId;
      let pathKey = currParentId || '';

      for (const segment of folderSegments) {
        pathKey += `/${segment.toLowerCase()}`;
        if (folderMap.has(pathKey)) {
          currParentId = folderMap.get(pathKey)!;
          continue;
        }

        const existing = runningFiles.find(
          f => isFolder(f) && !f.trashed && f.name.toLowerCase() === segment.toLowerCase() && (f.parentId || null) === currParentId
        );

        if (existing) {
          folderMap.set(pathKey, existing.id);
          currParentId = existing.id;
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
            parentId: currParentId,
            trashed: false,
          };
          newFiles.push(folderVFile);
          runningFiles.push(folderVFile);
          folderMap.set(pathKey, newFolderId);
          currParentId = newFolderId;
        }
      }
      return currParentId;
    };

    for (let i = 0; i < items.length; i++) {
      const { file: osFile, path } = items[i];
      let rawName = osFile.name;
      if (!rawName || rawName === 'image' || rawName === 'video' || rawName === 'Blob') {
        const ext = osFile.type ? (osFile.type.split('/')[1] || 'bin').replace('jpeg', 'jpg') : 'bin';
        rawName = `photo_${now}_${i + 1}.${ext}`;
      }

      const pathParts = path.split('/').filter(Boolean);
      const fileName = pathParts.pop() || rawName;
      const folderSegments = pathParts;

      const percent = Math.round(((i + 1) / items.length) * 85);
      setProgressModal(prev => ({
        ...prev,
        percent,
        currentFileName: path || fileName,
        processedCount: i + 1,
      }));

      const fileParentId = getOrCreateFolderId(folderSegments);
      const mime = osFile.type || getMimeType(fileName);
      const uniqueName = generateUniqueName(fileName, runningFiles, undefined, fileParentId);

      let textContent: string | undefined = undefined;
      const tempVFile: VFile = {
        id: '',
        name: uniqueName,
        mimeType: mime,
        size: osFile.size,
        createdAt: now,
        updatedAt: now,
      };

      if (isTextOrCode(tempVFile) && osFile.size < 2 * 1024 * 1024) {
        try {
          textContent = await readBlobAsText(osFile);
        } catch (e) {
          console.warn('Could not read text for folder file', e);
        }
      }

      const newVFile: VFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + (now + i),
        name: uniqueName,
        mimeType: mime,
        size: osFile.size,
        blob: osFile,
        textContent,
        createdAt: now,
        updatedAt: now,
        parentId: fileParentId,
        trashed: false,
      };
      newFiles.push(newVFile);
      runningFiles.push(newVFile);
    }

    setProgressModal(prev => ({ ...prev, percent: 95, currentFileName: 'Saving folder structure...' }));
    await dbStorage.saveFiles(newFiles);
    setAllFiles(prev => [...newFiles, ...prev]);
    await updateStorageStats([...newFiles, ...allFiles]);

    setProgressModal(prev => ({ ...prev, percent: 100, currentFileName: 'Upload complete!' }));
    setTimeout(() => setProgressModal(prev => ({ ...prev, isOpen: false })), 600);

    showToast(`Uploaded folder with ${newFiles.length} file${newFiles.length === 1 ? '' : 's'}`);
  };

  // Upload and Extract ZIP Archive
  const handleUploadZip = async (zipFile: File) => {
    setProgressModal({
      isOpen: true,
      mode: 'extracting',
      percent: 10,
      currentFileName: 'Parsing ZIP archive...',
    });

    try {
      const extractedVFiles = await extractZipArchive(
        zipFile,
        (percent, fileName) => {
          setProgressModal(p => ({ ...p, percent, currentFileName: fileName }));
        }
      );

      await dbStorage.saveFiles(extractedVFiles);
      setAllFiles(prev => [...extractedVFiles, ...prev]);
      await updateStorageStats([...extractedVFiles, ...allFiles]);

      setProgressModal(p => ({ ...p, percent: 100, currentFileName: 'Extraction complete!' }));
      setTimeout(() => setProgressModal(p => ({ ...p, isOpen: false })), 600);
    } catch (err) {
      console.error('Failed to extract zip', err);
      setProgressModal(p => ({ ...p, isOpen: false }));
    }
  };

  // Extract Existing ZIP File from Drive
  const handleUnzipFile = async (item: VFile) => {
    if (!item.blob) return;

    setProgressModal({
      isOpen: true,
      mode: 'extracting',
      percent: 10,
      currentFileName: item.name,
    });

    try {
      const extracted = await extractZipArchive(
        item.blob,
        (percent, fileName) => {
          setProgressModal(p => ({ ...p, percent, currentFileName: fileName }));
        }
      );

      await dbStorage.saveFiles(extracted);
      setAllFiles(prev => [...extracted, ...prev]);
      await updateStorageStats([...extracted, ...allFiles]);

      setProgressModal(p => ({ ...p, percent: 100, currentFileName: 'Extraction complete!' }));
      setTimeout(() => setProgressModal(p => ({ ...p, isOpen: false })), 600);
    } catch (err) {
      console.error('Failed to unzip file', err);
      setProgressModal(p => ({ ...p, isOpen: false }));
    }
  };

  // Compress Selection to ZIP Archive
  const handleBatchZip = async (items: VFile[]) => {
    if (items.length === 0) return;

    setProgressModal({
      isOpen: true,
      mode: 'compressing',
      percent: 10,
      currentFileName: 'Compressing files...',
    });

    try {
      const zipBlob = await createZipArchive(
        items,
        allFiles,
        (percent, fileName) => {
          setProgressModal(p => ({ ...p, percent, currentFileName: fileName }));
        }
      );

      const baseName = items.length === 1 ? `${items[0].name}.zip` : 'Archive.zip';
      const uniqueName = generateUniqueName(baseName, allFiles, undefined, currentFolderId);
      const now = Date.now();

      const newZipVFile: VFile = {
        id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + now,
        name: uniqueName,
        mimeType: 'application/zip',
        size: zipBlob.size,
        blob: zipBlob,
        createdAt: now,
        updatedAt: now,
        parentId: currentFolderId,
        trashed: false,
      };

      await dbStorage.saveFile(newZipVFile);
      setAllFiles(prev => [newZipVFile, ...prev]);
      await updateStorageStats([newZipVFile, ...allFiles]);

      setProgressModal(p => ({ ...p, percent: 100, currentFileName: 'Archive created!' }));
      setTimeout(() => setProgressModal(p => ({ ...p, isOpen: false })), 600);
    } catch (err) {
      console.error('Failed to zip files', err);
      setProgressModal(p => ({ ...p, isOpen: false }));
    }
  };

  // Download Files
  const handleBatchDownload = async (items: VFile[]) => {
    if (items.length === 0) return;

    if (items.length === 1 && (items[0].blob || items[0].textContent !== undefined)) {
      downloadVirtualFile(items[0]);
    } else {
      setProgressModal({
        isOpen: true,
        mode: 'compressing',
        percent: 10,
        currentFileName: 'Packaging download archive...',
      });

      const zipBlob = await createZipArchive(
        items,
        allFiles,
        (percent, fileName) => {
          setProgressModal(p => ({ ...p, percent, currentFileName: fileName }));
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = items.length === 1 ? `${items[0].name}.zip` : 'download.zip';
      a.click();
      URL.revokeObjectURL(url);

      setProgressModal(p => ({ ...p, percent: 100, currentFileName: 'Download starting...' }));
      setTimeout(() => setProgressModal(p => ({ ...p, isOpen: false })), 500);
    }
  };

  // Duplicate items
  const handleDuplicate = async (items: VFile[]) => {
    const now = Date.now();
    const duplicated: VFile[] = [];

    for (const item of items) {
      const uniqueName = generateUniqueName(`Copy of ${item.name}`, allFiles, undefined, item.parentId || null);
      const copy: VFile = {
        ...item,
        id: 'file_' + Math.random().toString(36).substring(2, 10) + '_' + (now + Math.random()),
        name: uniqueName,
        createdAt: now,
        updatedAt: now,
      };
      duplicated.push(copy);
    }

    if (duplicated.length > 0) {
      await dbStorage.saveFiles(duplicated);
      setAllFiles(prev => [...duplicated, ...prev]);
      await updateStorageStats([...duplicated, ...allFiles]);
    }
  };

  // Star / Favorite Toggle
  const handleToggleFavorite = async (items: VFile[]) => {
    const itemIds = new Set(items.map(i => i.id));
    const allFav = items.every(i => i.favorite);

    const updated = allFiles.map(f => {
      if (itemIds.has(f.id)) {
        return { ...f, favorite: !allFav, updatedAt: Date.now() };
      }
      return f;
    });

    const changed = updated.filter(f => itemIds.has(f.id));
    await dbStorage.saveFiles(changed);
    setAllFiles(updated);
  };

  // Rename
  const handleRenameSubmit = async (item: VFile, newName: string) => {
    setRenamingItemId(null);
    if (!newName || newName === item.name) return;

    const uniqueName = generateUniqueName(newName, allFiles, item.id, item.parentId || null);
    const updated: VFile = {
      ...item,
      name: uniqueName,
      mimeType: getMimeType(uniqueName),
      updatedAt: Date.now(),
    };

    await dbStorage.saveFile(updated);
    setAllFiles(prev => prev.map(f => f.id === item.id ? updated : f));
  };

  // Trash & Delete Anything with Confirmation Warnings when deleting from Bin
  const handleDelete = async (items: VFile[], permanent = false) => {
    // Helper to gather all descendant item IDs for deleted folders
    const getDescendantIds = (targetIds: Set<string>, files: VFile[]): Set<string> => {
      const descendants = new Set<string>();
      const queue = Array.from(targetIds);
      while (queue.length > 0) {
        const parentId = queue.shift()!;
        const children = files.filter(f => f.parentId === parentId);
        for (const child of children) {
          if (!descendants.has(child.id)) {
            descendants.add(child.id);
            if (isFolder(child)) {
              queue.push(child.id);
            }
          }
        }
      }
      return descendants;
    };

    const initialIds = new Set(items.map(i => i.id));
    const allDescendantIds = getDescendantIds(initialIds, allFiles);
    const itemIds = new Set([...Array.from(initialIds), ...Array.from(allDescendantIds)]);

    if (permanent) {
      const count = items.length;
      const title = count === 1 
        ? `Permanently Delete "${items[0].name}"?` 
        : `Permanently Delete ${count} Items?`;
      const description = `Are you sure you want to permanently delete ${
        count === 1 ? `"${items[0].name}"` : `${count} selected items`
      } from the Bin? This action cannot be undone and all data will be permanently wiped.`;

      setDeleteModalConfig({
        isOpen: true,
        title,
        description,
        itemCount: count,
        onConfirm: async () => {
          await dbStorage.deleteFiles(Array.from(itemIds));
          const remaining = allFiles.filter(f => !itemIds.has(f.id));
          setAllFiles(remaining);
          setSelectedIds(new Set());
          await updateStorageStats(remaining);
          showToast(`Permanently deleted ${count} item${count === 1 ? '' : 's'}`);
        },
      });
      return;
    }

    const now = Date.now();
    const updated = allFiles.map(f => {
      if (itemIds.has(f.id)) {
        return { ...f, trashed: true, trashedAt: now };
      }
      return f;
    });
    const changed = updated.filter(f => itemIds.has(f.id));
    await dbStorage.saveFiles(changed);
    setAllFiles(updated);
    setSelectedIds(new Set());
    await updateStorageStats(updated);
    showToast(`Moved ${items.length} item${items.length === 1 ? '' : 's'} to Bin`);
  };

  // Restore from Trash
  const handleRestore = async (items: VFile[]) => {
    const itemIds = new Set(items.map(i => i.id));
    const updated = allFiles.map(f => {
      if (itemIds.has(f.id)) {
        return { ...f, trashed: false, trashedAt: undefined };
      }
      return f;
    });

    const changed = updated.filter(f => itemIds.has(f.id));
    await dbStorage.saveFiles(changed);
    setAllFiles(updated);
    setSelectedIds(new Set());
    await updateStorageStats(updated);
    showToast(`Restored ${items.length} item${items.length === 1 ? '' : 's'}`);
  };

  // Empty Trash with Warning
  const handleEmptyTrash = async () => {
    const trashed = allFiles.filter(f => f.trashed);
    const count = trashed.length;
    if (count === 0) {
      showToast('Bin is already empty');
      return;
    }

    setDeleteModalConfig({
      isOpen: true,
      title: 'Empty Entire Bin?',
      description: `Are you sure you want to permanently delete all ${count} item${count === 1 ? '' : 's'} in the Bin? This cannot be undone and will permanently wipe local files.`,
      itemCount: count,
      onConfirm: async () => {
        const ids = trashed.map(t => t.id);
        await dbStorage.deleteFiles(ids);
        const remaining = allFiles.filter(f => !f.trashed);
        setAllFiles(remaining);
        setSelectedIds(new Set());
        await updateStorageStats(remaining);
        showToast(`Emptied Bin (${count} items removed)`);
      },
    });
  };

  // Clear Storage
  const handleClearStorage = async () => {
    await dbStorage.clearAll();
    setAllFiles([]);
    setSelectedIds(new Set());
    await updateStorageStats([]);
  };

  return (
    <div 
      id="app-root-layout"
      className="flex h-full h-[100dvh] w-full max-w-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none antialiased"
    >
      {/* OS File Drag Over Overlay */}
      {isWindowDragOver && (
        <div 
          id="window-drag-overlay"
          className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-sm border-2 border-dashed border-white flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-100"
        >
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-700 shadow-2xl flex flex-col items-center gap-2 text-center max-w-xs">
            <span className="text-3xl">📥</span>
            <h2 className="text-sm font-semibold text-neutral-100">Drop files to store offline</h2>
            <p className="text-[11px] text-neutral-400">
              Files are saved directly into IndexedDB.
            </p>
          </div>
        </div>
      )}

      {/* iPadOS Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedCategory={selectedCategory}
        isStarredView={isStarredView}
        isRecentView={isRecentView}
        isTrashView={isTrashView}
        allFiles={allFiles}
        storageStats={storageStats}
        onSelectAllFiles={handleSelectAllFiles}
        onSelectCategory={handleSelectCategory}
        onSelectStarred={handleSelectStarred}
        onSelectRecent={handleSelectRecent}
        onSelectTrash={handleSelectTrash}
        onOpenStorageModal={() => setStorageModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-neutral-950">
        {/* iPad Navbar with Sidebar toggle and Selected File Options Bar */}
        <Navbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onNewFile={() => setInlineCreatingType('file')}
          onNewFolder={() => setInlineCreatingType('folder')}
          onUploadFiles={handleUploadFiles}
          onUploadFilesWithPaths={handleUploadFilesWithPaths}
          onUploadZip={handleUploadZip}
          isOfflineLoaded={isOfflineLoaded}
          isOfflineLoading={isOfflineLoading}
          onLoadOffline={handleLoadOffline}
          selectedItems={allFiles.filter(f => selectedIds.has(f.id))}
          onClearSelection={() => setSelectedIds(new Set())}
          onOpenInTab={handleOpenInTab}
          onPreview={(item) => setPreviewFile(item)}
          onEdit={(item) => setEditorFile(item)}
          onRename={(item) => setRenamingItemId(item.id)}
          onToggleFavorite={handleToggleFavorite}
          onDownload={handleBatchDownload}
          onZip={handleBatchZip}
          onUnzip={handleUnzipFile}
          onGetInfo={(item) => setPropertiesFile(item)}
          onDelete={(items) => handleDelete(items, isTrashView)}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div 
            id="app-toast-notification"
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-neutral-900 border border-neutral-700 text-white rounded-2xl shadow-2xl text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* View Switch: 404 Error View OR Video View OR Audio Player View OR General File List */}
        {isNotFound ? (
          <NotFoundView
            invalidPath={invalidPath}
            onGoHome={handleSelectAllFiles}
          />
        ) : selectedCategory === 'video' && !isTrashView && !isStarredView && !isRecentView ? (
          <VideoStreamingView
            videos={allFiles.filter(f => !f.trashed && (f.mimeType?.startsWith('video/') || getFileCategory(f) === 'video'))}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onBatchZip={handleBatchZip}
            onBatchDelete={(items) => handleDelete(items, false)}
            onUploadVideos={handleUploadFiles}
            onDeleteVideo={(video) => handleDelete([video], false)}
            onToggleFavorite={(video) => handleToggleFavorite([video])}
            onDownloadVideo={(video) => handleBatchDownload([video])}
            onOpenInTab={handleOpenInTab}
          />
        ) : selectedCategory === 'audio' && !isTrashView && !isStarredView && !isRecentView ? (
          <AudioPlayerView
            audioFiles={allFiles.filter(f => !f.trashed && (f.mimeType?.startsWith('audio/') || getFileCategory(f) === 'audio'))}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onBatchZip={handleBatchZip}
            onBatchDelete={(items) => handleDelete(items, false)}
            onUploadAudio={handleUploadFiles}
            onDeleteAudio={(audio) => handleDelete([audio], false)}
            onToggleFavorite={(audio) => handleToggleFavorite([audio])}
            onDownloadAudio={(audio) => handleBatchDownload([audio])}
            onOpenInTab={handleOpenInTab}
          />
        ) : (
          <FileList
            files={displayedFiles}
            allFiles={allFiles}
            viewMode={viewMode}
            sortOption={sortOption}
            selectedIds={selectedIds}
            isSelectMode={isSelectMode}
            onToggleSelectMode={() => setIsSelectMode(prev => !prev)}
            renamingItemId={renamingItemId}
            inlineCreatingType={inlineCreatingType}
            onInlineCreateCommit={handleInlineCreateCommit}
            onInlineCreateCancel={() => setInlineCreatingType(null)}
            isTrashView={isTrashView}
            currentFolderId={currentFolderId}
            folderBreadcrumbs={folderBreadcrumbs}
            onNavigateFolder={(folderId) => { setCurrentFolderId(folderId); setSelectedIds(new Set()); }}
            onNavigateBack={() => {
              const parent = folderBreadcrumbs.length > 1 ? folderBreadcrumbs[folderBreadcrumbs.length - 2].id : null;
              setCurrentFolderId(parent);
              setSelectedIds(new Set());
            }}
            onSelect={handleItemSelect}
            onToggleSelect={handleToggleItemSelect}
            onSelectAll={handleSelectAll}
            onDoubleClick={handleDoubleClick}
            onOpenInTab={handleOpenInTab}
            onContextMenu={handleItemContextMenu}
            onBlankContextMenu={handleBlankContextMenu}
            onToggleFavorite={handleToggleFavorite}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={() => setRenamingItemId(null)}
            onBatchDownload={handleBatchDownload}
            onBatchZip={handleBatchZip}
            onBatchDelete={handleDelete}
            onBatchRestore={handleRestore}
            onNewFile={() => setInlineCreatingType('file')}
            onNewFolder={() => setInlineCreatingType('folder')}
            onTriggerUpload={() => {
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }}
            onUploadFiles={handleUploadFiles}
            onUploadFilesWithPaths={handleUploadFilesWithPaths}
            onEmptyTrash={handleEmptyTrash}
            onMoveItemToFolder={handleMoveItemToFolder}
          />
        )}
      </main>

      {/* Delete Confirmation Warning Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModalConfig.onConfirm}
        title={deleteModalConfig.title}
        description={deleteModalConfig.description}
        itemCount={deleteModalConfig.itemCount}
      />

      {/* FILE PROPERTIES & EXIF / SHA-256 METADATA MODAL */}
      <FilePropertiesModal
        file={propertiesFile}
        isOpen={!!propertiesFile}
        onClose={() => setPropertiesFile(null)}
        onUpdateFile={handleUpdateFile}
      />

      {/* IMAGE & VIDEO PREVIEW MODAL */}
      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={(f) => handleDelete([f], isTrashView)}
      />

      {/* CODE & TEXT FILE EDITOR MODAL */}
      <CodeEditorModal
        file={editorFile}
        isOpen={!!editorFile}
        onClose={() => setEditorFile(null)}
        onSave={handleSaveFileContent}
        onOpenInTab={handleOpenInTab}
      />

      {/* NEW FILE / FOLDER MODAL */}
      <NewFileModal
        isOpen={isNewFileModalOpen}
        initialMode={newItemModalMode}
        currentFolderId={currentFolderId}
        allFiles={allFiles}
        onClose={() => setIsNewFileModalOpen(false)}
        onCreateFile={handleCreateFile}
      />

      {/* STORAGE MODAL */}
      <StorageModal
        isOpen={storageModalOpen}
        stats={storageStats}
        allFiles={allFiles}
        onClose={() => setStorageModalOpen(false)}
        onClearStorage={handleClearStorage}
      />

      {/* UPLOAD / ZIP / UNZIP PROGRESS MODAL */}
      <ProgressModal
        isOpen={progressModal.isOpen}
        mode={progressModal.mode}
        progressPercent={progressModal.percent}
        currentFileName={progressModal.currentFileName}
        processedCount={progressModal.processedCount}
        totalCount={progressModal.totalCount}
      />

      {/* RIGHT-CLICK / LONG-PRESS CONTEXT MENU */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        targetItem={contextMenu.targetItem}
        selectedItems={contextMenu.selectedItems}
        isTrashView={isTrashView}
        canPaste={!!clipboard && clipboard.items.length > 0}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onPreview={(item) => setPreviewFile(item)}
        onEdit={(item) => setEditorFile(item)}
        onOpenInTab={handleOpenInTab}
        onToggleFavorite={handleToggleFavorite}
        onDownload={handleBatchDownload}
        onZip={handleBatchZip}
        onUnzip={handleUnzipFile}
        onDuplicate={handleDuplicate}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onGetInfo={(item) => setPropertiesFile(item)}
        onRename={(item) => setRenamingItemId(item.id)}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onNewFile={() => setInlineCreatingType('file')}
        onNewFolder={() => setInlineCreatingType('folder')}
      />
    </div>
  );
}
