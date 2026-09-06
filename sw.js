/* Cache the page on install so the deck opens with no network. Audio is
   cached as each word is first played -- 4 099 files is 39 MB and downloading
   it all up front would make the first visit unusable on mobile data. */
const SHELL = 'lexicon-shell-202609061316';
const MEDIA = 'lexicon-audio-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest',
               'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES))
                    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/audio/')) {
    e.respondWith(caches.open(MEDIA).then(c =>
      c.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        if (r.ok) c.put(e.request, r.clone());
        return r;
      }))));
    return;
  }
  // the page itself: network first so a redeploy is picked up, cache as backup
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) caches.open(SHELL).then(c => c.put(e.request, r.clone()));
    return r;
  }).catch(() => caches.match(e.request).then(h => h || caches.match('./'))));
});
