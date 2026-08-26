import { VFile, FileCategory } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}

export function formatFullDate(timestamp: number): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return '';
}

export function getMimeType(fileName: string): string {
  const ext = getFileExtension(fileName);
  const mimeMap: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    mjs: 'text/javascript',
    jsx: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    json: 'application/json',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    csv: 'text/csv',
    xml: 'text/xml',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    avif: 'image/avif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    pdf: 'application/pdf',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export function getFileCategory(file: VFile): FileCategory {
  const ext = getFileExtension(file.name);
  const mime = file.mimeType || getMimeType(file.name);

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)
  ) {
    return 'images';
  }

  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)
  ) {
    return 'audio';
  }

  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)
  ) {
    return 'video';
  }

  if (
    ['html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'py', 'c', 'cpp', 'java', 'rs', 'go', 'php', 'sql', 'sh', 'yaml', 'yml'].includes(ext)
  ) {
    return 'code';
  }

  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar')
  ) {
    return 'archives';
  }

  if (
    mime.startsWith('text/') ||
    ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
  ) {
    return 'documents';
  }

  return 'other';
}

export function isFolder(file: VFile): boolean {
  return (
    file.type === 'folder' ||
    file.mimeType === 'folder' ||
    file.mimeType === 'inode/directory' ||
    file.mimeType === 'application/x-directory'
  );
}

export function isTextOrCode(file: VFile): boolean {
  const ext = getFileExtension(file.name);
  const mime = file.mimeType || getMimeType(file.name);
  return (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/javascript' ||
    mime === 'application/typescript' ||
    mime === 'application/xml' ||
    ['html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'txt', 'csv', 'svg', 'xml', 'py', 'sh', 'sql', 'yaml', 'yml', 'env', 'gitignore'].includes(ext)
  );
}

export function isImage(file: VFile): boolean {
  return getFileCategory(file) === 'images';
}

export function isAudio(file: VFile): boolean {
  return getFileCategory(file) === 'audio';
}

export function isVideo(file: VFile): boolean {
  return getFileCategory(file) === 'video';
}

export function isImageOrVideo(file: VFile): boolean {
  return isImage(file) || isVideo(file);
}

export function isZip(file: VFile): boolean {
  const ext = getFileExtension(file.name);
  return ext === 'zip' || file.mimeType === 'application/zip' || file.mimeType === 'application/x-zip-compressed';
}

export function isHtml(file: VFile): boolean {
  const ext = getFileExtension(file.name);
  return ext === 'html' || ext === 'htm' || file.mimeType === 'text/html';
}

export function isPdf(file: VFile): boolean {
  const ext = getFileExtension(file.name);
  return ext === 'pdf' || file.mimeType === 'application/pdf';
}

// Generate unique name if collision exists within the SAME folder (same parentId)
export function generateUniqueName(
  name: string, 
  allFiles: VFile[], 
  excludeId?: string,
  parentId?: string | null
): string {
  const targetParent = parentId !== undefined ? parentId : null;
  const siblings = allFiles.filter(
    f => f.id !== excludeId && !f.trashed && (f.parentId || null) === targetParent
  );
  const siblingNames = new Set(siblings.map(s => s.name.toLowerCase()));

  if (!siblingNames.has(name.toLowerCase())) {
    return name;
  }

  const dotIndex = name.lastIndexOf('.');
  const hasExt = dotIndex > 0;
  const base = hasExt ? name.substring(0, dotIndex) : name;
  const ext = hasExt ? name.substring(dotIndex) : '';

  let counter = 1;
  let candidate = `${base} (${counter})${ext}`;
  while (siblingNames.has(candidate.toLowerCase())) {
    counter++;
    candidate = `${base} (${counter})${ext}`;
  }

  return candidate;
}

/**
 * Ensures no two files/folders in the same folder share identical names.
 * Renames any duplicate files within each parent folder scope.
 */
export function ensureUniqueNamesPerFolder(files: VFile[]): { files: VFile[]; updated: VFile[] } {
  const seenByParent = new Map<string, Set<string>>();
  const updated: VFile[] = [];
  const result: VFile[] = [];

  for (const file of files) {
    if (file.trashed) {
      result.push(file);
      continue;
    }

    const parentKey = file.parentId || '__root__';
    if (!seenByParent.has(parentKey)) {
      seenByParent.set(parentKey, new Set());
    }
    const nameSet = seenByParent.get(parentKey)!;
    const lowerName = file.name.toLowerCase();

    if (nameSet.has(lowerName)) {
      const uniqueName = generateUniqueName(file.name, result, file.id, file.parentId || null);
      const updatedFile = { ...file, name: uniqueName, updatedAt: Date.now() };
      nameSet.add(uniqueName.toLowerCase());
      result.push(updatedFile);
      updated.push(updatedFile);
    } else {
      nameSet.add(lowerName);
      result.push(file);
    }
  }

  return { files: result, updated };
}

/**
 * Resolves a file name or relative path to matching VFile in flat store
 */
export function resolveVirtualPath(
  rawPath: string,
  allFiles: VFile[]
): VFile | null {
  if (!rawPath || rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
    return null;
  }

  const cleanPath = rawPath.split('?')[0].split('#')[0].trim();
  if (!cleanPath) return null;

  const targetName = cleanPath.split('/').pop()?.toLowerCase();
  if (!targetName) return null;

  const activeFiles = allFiles.filter(f => !f.trashed);
  return activeFiles.find(f => f.name.toLowerCase() === targetName) || null;
}

/**
 * Resolves relative assets in an HTML/CSS file (like <img src="logo.png">,
 * <link href="style.css">, <script src="app.js">)
 * by converting matching files from IndexedDB to live Blob URLs!
 */
export async function resolveHtmlRelativeAssets(
  htmlContent: string,
  allFiles: VFile[]
): Promise<{ resolvedHtml: string; blobUrls: string[] }> {
  const blobUrls: string[] = [];
  let processedHtml = htmlContent;

  const activeFiles = allFiles.filter(f => !f.trashed);

  const getBlobUrlForFile = (file: VFile): string | null => {
    let blob = file.blob;
    if (!blob && file.textContent !== undefined) {
      blob = new Blob([file.textContent], { type: file.mimeType || getMimeType(file.name) });
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      blobUrls.push(url);
      return url;
    }
    return null;
  };

  // 1. Resolve <img>, <script>, <source>, <video>, <audio>, <iframe>, <embed> src
  const srcRegex = /(<(?:img|script|source|video|audio|iframe|embed|track)\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*?>)/gi;
  processedHtml = processedHtml.replace(srcRegex, (match, prefix, srcVal, suffix) => {
    if (srcVal.startsWith('http://') || srcVal.startsWith('https://') || srcVal.startsWith('data:') || srcVal.startsWith('blob:') || srcVal.startsWith('//')) {
      return match;
    }
    const resolvedFile = resolveVirtualPath(srcVal, activeFiles);
    if (resolvedFile) {
      const blobUrl = getBlobUrlForFile(resolvedFile);
      if (blobUrl) {
        return `${prefix}${blobUrl}${suffix}`;
      }
    }
    return match;
  });

  // 2. Resolve <link ... href="...">
  const linkRegex = /(<link\b[^>]*?\bhref=["'])([^"']+)(["'][^>]*?>)/gi;
  processedHtml = processedHtml.replace(linkRegex, (match, prefix, hrefVal, suffix) => {
    if (hrefVal.startsWith('http://') || hrefVal.startsWith('https://') || hrefVal.startsWith('data:') || hrefVal.startsWith('blob:') || hrefVal.startsWith('//')) {
      return match;
    }
    const resolvedFile = resolveVirtualPath(hrefVal, activeFiles);
    if (resolvedFile) {
      const blobUrl = getBlobUrlForFile(resolvedFile);
      if (blobUrl) {
        return `${prefix}${blobUrl}${suffix}`;
      }
    }
    return match;
  });

  // 3. Resolve CSS url(...) rules
  const cssUrlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  processedHtml = processedHtml.replace(cssUrlRegex, (match, quote, urlVal) => {
    if (urlVal.startsWith('http://') || urlVal.startsWith('https://') || urlVal.startsWith('data:') || urlVal.startsWith('blob:') || urlVal.startsWith('//')) {
      return match;
    }
    const resolvedFile = resolveVirtualPath(urlVal, activeFiles);
    if (resolvedFile) {
      const blobUrl = getBlobUrlForFile(resolvedFile);
      if (blobUrl) {
        return `url("${blobUrl}")`;
      }
    }
    return match;
  });

  return { resolvedHtml: processedHtml, blobUrls };
}

export async function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function downloadVirtualFile(file: VFile): void {
  let blob = file.blob;
  if (!blob && file.textContent !== undefined) {
    blob = new Blob([file.textContent], { type: file.mimeType || getMimeType(file.name) });
  }
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getStarterContentForFile(fileName: string): string {
  const ext = getFileExtension(fileName).toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local Webpage</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello from LocalBox</h1>
  <p>Your static page is running locally.</p>
  <script src="app.js"></script>
</body>
</html>
`;
    case 'css':
      return `/* Stylesheet */
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
}
`;
    case 'js':
    case 'mjs':
      return `// JavaScript Module
console.log("App script running!");
`;
    case 'ts':
      return `// TypeScript Module
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
    case 'tsx':
    case 'jsx':
      return `import React from 'react';

export default function Component() {
  return (
    <div>
      <h2>Hello Component</h2>
    </div>
  );
}
`;
    case 'json':
      return `{\n  "name": "new-file",\n  "version": "1.0.0",\n  "data": []\n}\n`;
    case 'md':
      return `# Document Title\n\nWrite your thoughts here.\n`;
    case 'py':
      return `#!/usr/bin/env python3\n\ndef main():\n    print("Hello from LocalBox!")\n\nif __name__ == "__main__":\n    main()\n`;
    case 'sql':
      return `-- SQL Query\nSELECT * FROM items;\n`;
    case 'csv':
      return `id,name,status\n1,Sample Item,Active\n`;
    default:
      return ``;
  }
}

