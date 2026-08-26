import { VFile, FileCategory } from '../types';
import { isFolder, getFileCategory } from './fileUtils';

export interface RouteState {
  selectedCategory: FileCategory;
  isStarredView: boolean;
  isRecentView: boolean;
  isTrashView: boolean;
  currentFolderId: string | null;
  previewFileId: string | null;
  editorFileId: string | null;
  activeVideoId?: string | null;
  isNotFound?: boolean;
  invalidPath?: string;
}

const VALID_CATEGORIES: FileCategory[] = [
  'all',
  'documents',
  'images',
  'audio',
  'video',
  'code',
  'archives',
  'other',
];

/**
 * Builds human-readable folder path slug starting with /drive
 * e.g. [{id: 'f1', name: 'folder'}, {id: 'f2', name: 'xyz'}] -> '/drive/folder/xyz'
 */
export function buildFolderPathSlug(breadcrumbs: VFile[]): string {
  if (breadcrumbs.length === 0) return '/drive';
  const path = breadcrumbs.map(b => encodeURIComponent(b.name)).join('/');
  return `/drive/${path}`;
}

/**
 * Resolves target folder ID from path segments e.g. ['folder', 'xyz']
 */
export function resolveFolderFromPathSegments(segments: string[], allFiles: VFile[]): string | null {
  if (segments.length === 0) return null;
  let currParentId: string | null = null;

  for (const seg of segments) {
    const decodedName = decodeURIComponent(seg).toLowerCase();
    const folder = allFiles.find(
      f => isFolder(f) && !f.trashed && f.name.toLowerCase() === decodedName && (f.parentId || null) === currParentId
    );

    if (folder) {
      currParentId = folder.id;
    } else {
      // Fallback: try matching by folder ID directly if segment is a file/folder ID
      const folderById = allFiles.find(f => isFolder(f) && !f.trashed && f.id === seg);
      if (folderById) {
        currParentId = folderById.id;
      } else {
        return null; // Segment failed to resolve
      }
    }
  }

  return currParentId;
}

/**
 * Computes URL path & search query string from application state
 */
export function computeUrlFromState(
  selectedCategory: FileCategory,
  isStarredView: boolean,
  isRecentView: boolean,
  isTrashView: boolean,
  currentFolderId: string | null,
  folderBreadcrumbs: VFile[],
  previewFile: VFile | null,
  editorFile: VFile | null,
  isNotFound: boolean = false,
  invalidPath: string = ''
): { path: string; search: string } {
  if (isNotFound && invalidPath) {
    return { path: invalidPath, search: window.location.search };
  }

  let path = '/drive';

  if (isTrashView) {
    path = '/trash';
  } else if (isStarredView) {
    path = '/starred';
  } else if (isRecentView) {
    path = '/recent';
  } else if (selectedCategory !== 'all') {
    path = `/category/${selectedCategory}`;
  } else {
    path = buildFolderPathSlug(folderBreadcrumbs);
  }

  const params = new URLSearchParams();
  if (previewFile) {
    if (previewFile.mimeType?.startsWith('video/') || getFileCategory(previewFile) === 'video') {
      params.set('v', previewFile.id);
    } else {
      params.set('preview', previewFile.id);
    }
  }
  if (editorFile) {
    params.set('editor', editorFile.id);
  }

  const search = params.toString() ? `?${params.toString()}` : '';
  return { path, search };
}

/**
 * Parses browser URL location into RouteState and detects 404 invalid URLs
 */
export function parseRouteFromUrl(allFiles: VFile[]): RouteState {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  let selectedCategory: FileCategory = 'all';
  let isStarredView = false;
  let isRecentView = false;
  let isTrashView = false;
  let currentFolderId: string | null = null;
  let isNotFound = false;
  let invalidPath = '';

  if (pathname === '/' || pathname === '/drive' || pathname === '/drive/') {
    // Valid root drive
  } else if (pathname === '/trash' || pathname === '/trash/') {
    isTrashView = true;
  } else if (pathname === '/starred' || pathname === '/starred/') {
    isStarredView = true;
  } else if (pathname === '/recent' || pathname === '/recent/') {
    isRecentView = true;
  } else if (pathname.startsWith('/category/')) {
    const cat = pathname.replace('/category/', '').replace(/\/$/, '').toLowerCase() as FileCategory;
    if (VALID_CATEGORIES.includes(cat)) {
      selectedCategory = cat;
    } else {
      isNotFound = true;
      invalidPath = pathname;
    }
  } else if (pathname.startsWith('/drive/')) {
    const rawPath = pathname.replace('/drive/', '');
    const segments = rawPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const resolved = resolveFolderFromPathSegments(segments, allFiles);
      if (resolved) {
        currentFolderId = resolved;
      } else {
        isNotFound = true;
        invalidPath = pathname;
      }
    }
  } else if (pathname.startsWith('/folder/')) {
    const rawPath = pathname.replace('/folder/', '');
    const segments = rawPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const resolved = resolveFolderFromPathSegments(segments, allFiles);
      if (resolved) {
        currentFolderId = resolved;
      } else {
        isNotFound = true;
        invalidPath = pathname;
      }
    }
  } else {
    // Any unrecognized path
    isNotFound = true;
    invalidPath = pathname;
  }

  const previewFileId = searchParams.get('preview') || searchParams.get('v');
  const editorFileId = searchParams.get('editor');
  const activeVideoId = searchParams.get('v');

  return {
    selectedCategory,
    isStarredView,
    isRecentView,
    isTrashView,
    currentFolderId,
    previewFileId,
    editorFileId,
    activeVideoId,
    isNotFound,
    invalidPath,
  };
}
