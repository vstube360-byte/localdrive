import JSZip from 'jszip';
import { VFile } from '../types';
import { getMimeType, isTextOrCode, readBlobAsText } from './fileUtils';

export interface ZipProgressCallback {
  (percent: number, currentFileName: string): void;
}

/**
 * Creates a ZIP archive blob from a list of selected files.
 */
export async function createZipArchive(
  selectedFiles: VFile[],
  allFiles: VFile[],
  onProgress?: ZipProgressCallback
): Promise<Blob> {
  const zip = new JSZip();
  const activeFiles = selectedFiles.filter(f => !f.trashed);
  let count = 0;
  const total = activeFiles.length;

  for (const file of activeFiles) {
    count++;
    if (onProgress) {
      onProgress(Math.round((count / Math.max(total, 1)) * 90), file.name);
    }

    if (file.blob) {
      zip.file(file.name, file.blob);
    } else if (file.textContent !== undefined) {
      zip.file(file.name, file.textContent);
    } else {
      zip.file(file.name, '');
    }
  }

  if (onProgress) {
    onProgress(95, 'Compressing archive...');
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent), 'Finalizing archive...');
      }
    }
  );

  return zipBlob;
}

/**
 * Extracts a ZIP file (from Blob) preserving full folder hierarchy.
 */
export async function extractZipArchive(
  zipBlob: Blob,
  onProgress?: ZipProgressCallback | string | null,
  targetFolderId?: string | ZipProgressCallback | null
): Promise<VFile[]> {
  let progressCb: ZipProgressCallback | undefined;
  let rootParentId: string | null = null;

  if (typeof onProgress === 'function') {
    progressCb = onProgress;
    rootParentId = typeof targetFolderId === 'string' ? targetFolderId : null;
  } else if (typeof onProgress === 'string') {
    rootParentId = onProgress;
    if (typeof targetFolderId === 'function') {
      progressCb = targetFolderId;
    }
  }

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlob);
  const newVFiles: VFile[] = [];
  const now = Date.now();
  const folderMap = new Map<string, string>();

  // Helper to resolve or create folder objects for nested zip entries
  const getOrCreateFolderId = (folderSegments: string[]): string | null => {
    let currParentId = rootParentId;
    let pathKey = currParentId || '';

    for (const segment of folderSegments) {
      pathKey += `/${segment.toLowerCase()}`;
      if (folderMap.has(pathKey)) {
        currParentId = folderMap.get(pathKey)!;
        continue;
      }

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
      newVFiles.push(folderVFile);
      folderMap.set(pathKey, newFolderId);
      currParentId = newFolderId;
    }
    return currParentId;
  };

  const entries: { path: string; entry: JSZip.JSZipObject }[] = [];
  loadedZip.forEach((relativePath, entry) => {
    if (!entry.dir) {
      entries.push({ path: relativePath, entry });
    }
  });

  const totalEntries = entries.length;
  let processedCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const { path: relativePath, entry } = entries[i];
    processedCount++;
    if (progressCb) {
      progressCb(Math.round((processedCount / Math.max(totalEntries, 1)) * 100), entry.name);
    }

    const pathParts = relativePath.split('/').filter(Boolean);
    const fileName = pathParts.pop() || `file_${i}`;
    const folderSegments = pathParts;
    const parentFolderId = folderSegments.length > 0 ? getOrCreateFolderId(folderSegments) : rootParentId;

    const mime = getMimeType(fileName);
    const fileBlob = await entry.async('blob');

    let textContent: string | undefined = undefined;
    const tempVFile: VFile = {
      id: '',
      name: fileName,
      mimeType: mime,
      size: fileBlob.size,
      createdAt: now,
      updatedAt: now,
    };

    if (isTextOrCode(tempVFile) && fileBlob.size < 2 * 1024 * 1024) {
      try {
        textContent = await readBlobAsText(fileBlob);
      } catch (e) {
        console.warn('Failed to parse text for ' + fileName, e);
      }
    }

    const fileId = 'file_' + Math.random().toString(36).substring(2, 10) + '_' + (now + i);
    const newFile: VFile = {
      id: fileId,
      name: fileName,
      mimeType: mime,
      size: fileBlob.size,
      blob: fileBlob,
      textContent,
      createdAt: now,
      updatedAt: now,
      parentId: parentFolderId,
      trashed: false,
    };

    newVFiles.push(newFile);
  }

  return newVFiles;
}
