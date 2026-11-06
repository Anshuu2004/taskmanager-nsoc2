// Pure helpers for the service worker. No browser globals in here, so they
// can be unit tested with node:test (see test-sw-logic.js).

export const SHELL_CACHE_PREFIX = 'taskmanager-shell-';
export const FONT_CACHE = 'taskmanager-fonts';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

export function shellCacheName(version) {
  return `${SHELL_CACHE_PREFIX}${version}`;
}

// Old app shell caches to delete on activate. The font cache and anything
// that is not ours are left alone.
export function staleCacheNames(allNames, currentShellCache) {
  return allNames.filter(
    name => name.startsWith(SHELL_CACHE_PREFIX) && name !== currentShellCache
  );
}

// Turns the list of files in dist/ (paths relative to the site root) into the
// list of URLs the worker precaches, relative to the worker scope.
export function buildPrecacheList(files) {
  const urls = new Set();
  for (const raw of files) {
    const file = raw.replace(/\\/g, '/').replace(/^\.?\//, '');
    if (file === 'sw.js' || file.endsWith('.map')) continue;
    urls.add(file === 'index.html' ? './' : file);
  }
  return [...urls].sort();
}

// Decides how a request is answered.
//   'precache' same-origin file that is in the precache list, cache first
//   'navigate' page load for any other same-origin URL, serve the cached shell
//   'fonts'    Google Fonts, stale while revalidate
//   'network'  leave it to the browser
// precacheUrls is a Set of absolute URLs, no query string.
export function decideStrategy(request, { origin, precacheUrls }) {
  if (request.method !== 'GET') return 'network';

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return 'network';
  }
  if (!/^https?:$/.test(url.protocol)) return 'network';

  if (FONT_HOSTS.includes(url.hostname)) return 'fonts';
  if (url.origin !== origin) return 'network';

  if (precacheUrls.has(url.origin + url.pathname)) return 'precache';
  if (request.mode === 'navigate') return 'navigate';
  return 'network';
}

export function isCacheable(response) {
  return !!response && (response.ok || response.type === 'opaque');
}

// "Later" only counts for the version it was clicked on, so a newer waiting
// version gets the prompt again.
export function shouldPromptUpdate(waitingVersion, dismissedVersion) {
  return Boolean(waitingVersion) && waitingVersion !== dismissedVersion;
}
