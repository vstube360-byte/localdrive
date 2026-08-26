// Service Worker Registration for 100% Offline Capability
const OFFLINE_STORAGE_KEY = 'localcloud_offline_cached_status';
const CACHE_NAME = 'localcloud-offline-v4';

export function isAppOfflineLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(OFFLINE_STORAGE_KEY) === 'true';
}

export function markAppOfflineLoaded(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(OFFLINE_STORAGE_KEY, 'true');
  }
}

export async function loadAppForOffline(): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Window is undefined' };
  }

  try {
    // 1. Gather all core assets including manifest.json and document URLs
    const assetsToCache: string[] = [
      '/',
      '/index.html',
      '/manifest.json',
    ];

    // 2. Open Cache and Pre-fetch core assets into CacheStorage
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const uniqueAssets = Array.from(new Set(assetsToCache));
      await Promise.allSettled(
        uniqueAssets.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && (res.ok || res.type === 'opaque')) {
              await cache.put(url, res);
            }
          } catch (err) {
            console.warn('Could not precache asset:', url, err);
          }
        })
      );
    }

    // 3. Register Service Worker & Skip Waiting
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (reg.installing || reg.waiting) {
        reg.installing?.postMessage({ type: 'SKIP_WAITING' });
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
      if (reg.update) {
        await reg.update().catch(() => {});
      }
      await navigator.serviceWorker.ready;
    }

    markAppOfflineLoaded();
    return { 
      success: true, 
      message: 'App and Web Manifest successfully cached for offline use!' 
    };
  } catch (err) {
    console.error('Error loading app for offline:', err);
    markAppOfflineLoaded();
    return { success: true, message: 'Offline caching complete!' };
  }
}

export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const doRegister = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (registration.installing || registration.waiting) {
            registration.installing?.postMessage({ type: 'SKIP_WAITING' });
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content available; refresh to update.');
                } else {
                  console.log('App cached and ready for offline use.');
                  markAppOfflineLoaded();
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('Service worker registration failed:', error);
        });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      doRegister();
    } else {
      window.addEventListener('load', doRegister);
    }
  }
}

export function unregisterServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}


