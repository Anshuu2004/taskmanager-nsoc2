import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SHELL_CACHE_PREFIX,
  FONT_CACHE,
  shellCacheName,
  staleCacheNames,
  buildPrecacheList,
  decideStrategy,
  isCacheable,
  shouldPromptUpdate
} from './src/sw/swLogic.js';

const origin = 'https://tasks.example.app';
const precacheUrls = new Set([
  `${origin}/`,
  `${origin}/assets/index-abc123.js`,
  `${origin}/manifest.webmanifest`
]);
const ctx = { origin, precacheUrls };

test('shellCacheName puts the version in the name', () => {
  assert.equal(shellCacheName('6b35461046'), `${SHELL_CACHE_PREFIX}6b35461046`);
  assert.notEqual(shellCacheName('a'), shellCacheName('b'));
});

test('staleCacheNames only returns old shell caches', () => {
  const current = shellCacheName('new');
  const names = [shellCacheName('old1'), current, shellCacheName('old2'), FONT_CACHE, 'someone-elses-cache'];
  assert.deepEqual(staleCacheNames(names, current), [shellCacheName('old1'), shellCacheName('old2')]);
  assert.deepEqual(staleCacheNames([current], current), []);
});

test('buildPrecacheList maps index.html to the scope root and skips sw.js and maps', () => {
  const list = buildPrecacheList([
    'sw.js',
    'index.html',
    'assets/index-abc123.js',
    'assets/index-abc123.js.map',
    'assets/index-def456.css',
    'manifest.webmanifest',
    './icon-192.png'
  ]);
  assert.deepEqual(list, [
    './',
    'assets/index-abc123.js',
    'assets/index-def456.css',
    'icon-192.png',
    'manifest.webmanifest'
  ]);
});

test('buildPrecacheList handles windows separators and duplicates', () => {
  assert.deepEqual(buildPrecacheList(['assets\\a.js', 'assets/a.js']), ['assets/a.js']);
});

test('decideStrategy: precached same-origin files are cache first', () => {
  const req = { method: 'GET', url: `${origin}/assets/index-abc123.js`, mode: 'no-cors' };
  assert.equal(decideStrategy(req, ctx), 'precache');
  const withQuery = { method: 'GET', url: `${origin}/assets/index-abc123.js?v=2`, mode: 'no-cors' };
  assert.equal(decideStrategy(withQuery, ctx), 'precache');
});

test('decideStrategy: page loads are answered from the cached shell', () => {
  assert.equal(decideStrategy({ method: 'GET', url: `${origin}/`, mode: 'navigate' }, ctx), 'precache');
  assert.equal(decideStrategy({ method: 'GET', url: `${origin}/index.html`, mode: 'navigate' }, ctx), 'navigate');
  assert.equal(decideStrategy({ method: 'GET', url: `${origin}/some/deep/link`, mode: 'navigate' }, ctx), 'navigate');
});

test('decideStrategy: anything else is left to the network', () => {
  assert.equal(decideStrategy({ method: 'POST', url: `${origin}/`, mode: 'cors' }, ctx), 'network');
  assert.equal(decideStrategy({ method: 'GET', url: `${origin}/sw.js`, mode: 'same-origin' }, ctx), 'network');
  assert.equal(decideStrategy({ method: 'GET', url: `${origin}/api/unknown.json`, mode: 'cors' }, ctx), 'network');
  assert.equal(decideStrategy({ method: 'GET', url: 'https://other.example/x.js', mode: 'no-cors' }, ctx), 'network');
  assert.equal(decideStrategy({ method: 'GET', url: 'chrome-extension://abc/x.js', mode: 'no-cors' }, ctx), 'network');
  assert.equal(decideStrategy({ method: 'GET', url: 'not a url', mode: 'cors' }, ctx), 'network');
});

test('decideStrategy: google fonts use their own cache strategy', () => {
  const css = { method: 'GET', url: 'https://fonts.googleapis.com/css2?family=Instrument+Sans', mode: 'no-cors' };
  const file = { method: 'GET', url: 'https://fonts.gstatic.com/s/instrumentsans/v1/x.woff2', mode: 'cors' };
  assert.equal(decideStrategy(css, ctx), 'fonts');
  assert.equal(decideStrategy(file, ctx), 'fonts');
});

test('isCacheable accepts ok and opaque responses only', () => {
  assert.equal(isCacheable({ ok: true, type: 'basic' }), true);
  assert.equal(isCacheable({ ok: false, type: 'opaque' }), true);
  assert.equal(isCacheable({ ok: false, type: 'basic', status: 404 }), false);
  assert.equal(isCacheable(undefined), false);
});

test('shouldPromptUpdate: nothing waiting means no prompt', () => {
  assert.equal(shouldPromptUpdate(null, null), false);
  assert.equal(shouldPromptUpdate(null, 'v2'), false);
});

test('shouldPromptUpdate: Later only hides the version it was clicked on', () => {
  assert.equal(shouldPromptUpdate('v2', null), true);
  assert.equal(shouldPromptUpdate('v2', 'v2'), false);
  assert.equal(shouldPromptUpdate('v3', 'v2'), true);
  assert.equal(shouldPromptUpdate('v3', 'v3'), false);
});
