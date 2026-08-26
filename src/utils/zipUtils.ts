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
 * Extracts a ZIP file (from Blob) and creates flat VFiles for IndexedDB.
 */
export async function extractZipArchive(
  zipBlob: Blob,
  onProgress?: ZipProgressCallback
): Promise<VFile[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlob);
  const newVFiles: VFile[] = [];
  const now = Date.now();

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
    if (onProgress) {
      onProgress(Math.round((processedCount / Math.max(totalEntries, 1)) * 100), entry.name);
    }

    // Use clean filename (strip path if nested)
    const fileName = relativePath.split('/').filter(Boolean).pop() || `file_${i}`;
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
      trashed: false,
    };

    newVFiles.push(newFile);
  }

  return newVFiles;
}
