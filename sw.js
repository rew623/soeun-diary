// ★ 파일을 바꿔 올릴 때마다 아래 VERSION만 바꾸면 앱에 "새 버전 있음"이 떠요
const VERSION = '2026.09.25-3';
const SHELL = ['./', './index.html', './app.js', './config.js', './manifest.webmanifest',
  './hospitals.js', './map-key.js', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const SHELL_CACHE = 'shell-' + VERSION, LIB = 'lib-v1', PHOTO = 'photo-v1', DATA = 'data-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shell-') && k !== SHELL_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

async function trim(name, max) {
  const c = await caches.open(name), ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 병원·약국 정보: 인터넷에서 먼저 받고, 안 되면 마지막으로 받은 것 (VERSION이 바뀌어도 지우지 않아요)
  const dataFile = url.origin === location.origin && /\/(hospitals|pharmacies)\.json$/.exec(url.pathname);
  if (dataFile) {
    e.respondWith((async () => {
      const c = await caches.open(DATA), key = new URL(dataFile[1] + '.json', self.registration.scope).href;
      try {
        const res = await fetch(req);
        if (res.ok) { c.put(key, res.clone()); return res; }
        return (await c.match(key)) || res;
      } catch (x) {
        const hit = await c.match(key);
        if (hit) return hit;
        throw x;
      }
    })());
    return;
  }
  // 앱 화면: 폰에 저장된 것부터 바로 (새 버전은 VERSION이 바뀔 때 받아요)
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL_CACHE);
      const hit = await c.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true });
      return hit || fetch(req);
    })());
    return;
  }
  // 사진: 한 번 받은 건 폰에 보관 (사진 주소는 바뀌지 않아요)
  // 사진 올리기·주소 받기 요청은 로그인 정보가 필요하니 건드리지 않아요
  if (url.hostname === 'firebasestorage.googleapis.com' && url.searchParams.get('alt') === 'media' && url.searchParams.has('token')) {
    e.respondWith((async () => {
      const c = await caches.open(PHOTO), hit = await c.match(req.url);
      if (hit) return hit;
      try {
        const res = await fetch(req.url, { mode: 'cors' });
        if (res.ok) { c.put(req.url, res.clone()); trim(PHOTO, 600); }
        return res;
      } catch (x) { return fetch(req); }
    })());
    return;
  }
  // 글꼴, Firebase 라이브러리: 저장본 먼저 보여 주고 뒤에서 새로 받기
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(LIB), hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
