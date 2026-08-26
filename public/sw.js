// LocalCloud Offline & Virtual Static Web Server Service Worker
const CACHE_NAME = 'localcloud-offline-v7';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Helper: Open IndexedDB database 'LocalCloud_FS_DB'
function openFilesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LocalCloud_FS_DB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Helper: Read all files stored in IndexedDB
function getAllFilesFromDB() {
  return openFilesDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

// Helper: Map extension to proper MIME Type for virtual static web server
function getMimeTypeForPath(pathname, fallbackMime) {
  const ext = pathname.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': case 'htm': return 'text/html; charset=utf-8';
    case 'css': return 'text/css; charset=utf-8';
    case 'js': case 'mjs': case 'cjs': return 'application/javascript; charset=utf-8';
    case 'json': return 'application/json; charset=utf-8';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'ico': return 'image/x-icon';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'pdf': return 'application/pdf';
    case 'txt': case 'md': return 'text/plain; charset=utf-8';
    case 'wasm': return 'application/wasm';
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'ttf': return 'font/ttf';
    default: 
      if (fallbackMime && fallbackMime !== 'application/octet-stream' && fallbackMime !== 'text/plain') {
        return fallbackMime;
      }
      return fallbackMime || 'application/octet-stream';
  }
}

// Helper: Resolve relative virtual file path against IndexedDB hierarchy
function resolveVFileByPath(allFiles, rootFolderId, pathSegments) {
  const activeFiles = allFiles.filter(f => !f.trashed);

  // Normalize rootFolderId if it points to a file ID instead of a folder ID
  if (rootFolderId && rootFolderId !== '__root__' && rootFolderId !== 'null' && rootFolderId !== 'undefined') {
    const rootItem = activeFiles.find(f => f.id === rootFolderId);
    if (rootItem && rootItem.type !== 'folder') {
      rootFolderId = rootItem.parentId || '__root__';
    }
  }

  const isRoot = !rootFolderId || rootFolderId === '__root__' || rootFolderId === 'null' || rootFolderId === 'undefined';

  // Decode & sanitize segments
  const segments = pathSegments
    .map(s => {
      try {
        return decodeURIComponent(s).trim();
      } catch (e) {
        return s.trim();
      }
    })
    .filter(s => s.length > 0 && s !== '.');

  if (segments.length === 0) {
    segments.push('index.html');
  }

  // Get items directly under a given parent folder
  const getItemsUnder = (parentId) => {
    return activeFiles.filter(f => {
      if (parentId === null) {
        return !f.parentId || f.parentId === '__root__';
      }
      return f.parentId === parentId;
    });
  };

  // Strategy 1: Hierarchical tree walk starting at rootFolderId
  let currentParentId = isRoot ? null : rootFolderId;
  let currentMatch = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].toLowerCase();
    const isLast = i === segments.length - 1;
    const items = getItemsUnder(currentParentId);

    const found = items.find(f => f.name.toLowerCase() === seg);
    if (!found) {
      currentMatch = null;
      break;
    }

    if (isLast) {
      if (found.type !== 'folder') {
        currentMatch = found;
      } else {
        // If last segment is a folder, check for index.html inside it
        const folderItems = activeFiles.filter(f => f.parentId === found.id);
        currentMatch = folderItems.find(f => f.name.toLowerCase() === 'index.html') || null;
      }
    } else {
      if (found.type === 'folder') {
        currentParentId = found.id;
      } else {
        currentMatch = null;
        break;
      }
    }
  }

  if (currentMatch) {
    return currentMatch;
  }

  // Strategy 2: Flexible fallback search within the root folder's tree or active files
  const targetFileName = segments[segments.length - 1].toLowerCase();

  if (isRoot) {
    return activeFiles.find(f => f.type !== 'folder' && f.name.toLowerCase() === targetFileName) || null;
  } else {
    // Collect all descendant folder IDs starting from rootFolderId
    const descendantFolderIds = new Set([rootFolderId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of activeFiles) {
        if (f.type === 'folder' && f.parentId && descendantFolderIds.has(f.parentId) && !descendantFolderIds.has(f.id)) {
          descendantFolderIds.add(f.id);
          added = true;
        }
      }
    }

    const fileInSubtree = activeFiles.find(f => 
      f.type !== 'folder' && 
      f.parentId && 
      descendantFolderIds.has(f.parentId) && 
      f.name.toLowerCase() === targetFileName
    );

    if (fileInSubtree) return fileInSubtree;

    // Ultimate fallback: search across any active file matching name
    return activeFiles.find(f => f.type !== 'folder' && f.name.toLowerCase() === targetFileName) || null;
  }
}

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('Pre-cache initial warning:', err);
      }
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for message events (e.g. SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Check if request is for virtual static web server (either by pathname or referrer)
  let isVsiteRequest = url.pathname.startsWith('/__vsite__/');
  let rootFolderId = null;
  let pathSegments = [];

  if (isVsiteRequest) {
    const pathParts = url.pathname.replace('/__vsite__/', '').split('/');
    rootFolderId = pathParts[0];
    pathSegments = pathParts.slice(1);
  } else if (
    request.referrer && 
    url.origin === self.location.origin && 
    !url.pathname.startsWith('/@') && 
    !url.pathname.includes('/.vite/') && 
    !url.pathname.includes('hot-update') &&
    !url.pathname.startsWith('/__vite')
  ) {
    try {
      const refUrl = new URL(request.referrer);
      if (refUrl.pathname.startsWith('/__vsite__/')) {
        const refParts = refUrl.pathname.replace('/__vsite__/', '').split('/');
        rootFolderId = refParts[0];
        pathSegments = url.pathname.split('/').filter(Boolean);
        isVsiteRequest = true;
      }
    } catch (e) {
      // Ignore URL parse errors
    }
  }

  // 1. Handle Virtual Static Web Server requests (GET, POST, OPTIONS, etc.)
  if (isVsiteRequest && rootFolderId) {
    // Handle CORS preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      event.respondWith(
        new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': '*',
          },
        })
      );
      return;
    }

    event.respondWith(
      (async () => {
        try {
          const allFiles = await getAllFilesFromDB();
          const targetFile = resolveVFileByPath(allFiles, rootFolderId, pathSegments);

          if (!targetFile) {
            return new Response(`404 - Virtual File Not Found: ${url.pathname}`, {
              status: 404,
              headers: { 
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }

          let bodyBlob = targetFile.blob;
          if (!bodyBlob) {
            const textContent = targetFile.textContent ?? '';
            const contentType = getMimeTypeForPath(targetFile.name, targetFile.mimeType);
            bodyBlob = new Blob([textContent], { type: contentType });
          }

          const mimeType = getMimeTypeForPath(targetFile.name, targetFile.mimeType);

          return new Response(bodyBlob, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Cache-Control': 'no-cache',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
              'Access-Control-Allow-Headers': '*',
            },
          });
        } catch (err) {
          console.error('Error serving virtual site file:', err);
          return new Response(`500 - Error serving virtual file: ${err.message}`, {
            status: 500,
            headers: { 
              'Content-Type': 'text/plain; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      })()
    );
    return;
  }

  // Skip non-GET, chrome-extension, internal, and WebSocket requests for standard caching
  if (
    request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // Bypass service worker cache for Vite dev server internals
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/.vite/') ||
    url.pathname.includes('hot-update') ||
    url.pathname.startsWith('/__vite') ||
    url.pathname.startsWith('/__aistudio') ||
    url.pathname.includes('node_modules')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Navigation requests (HTML document loads for the main app shell)
      if (request.mode === 'navigate') {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(() => {});
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            cache.put('/', networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          const cached =
            (await cache.match(request)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/'));
          if (cached) return cached;
          return new Response('Offline: Page not cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      }

      // Static & dynamic assets
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return (
          (await cache.match('/manifest.json')) ||
          new Response('Resource offline unavailable', { status: 408 })
        );
      }
    })()
  );
});
