const CACHE_NAME = 'rom-tutor-v7';

const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/services/srs.js',
  './js/services/gamification.js',
  './js/services/audio.js',
  './js/services/stt.js',
  './js/services/utils.js',
  './js/components/dashboard.js',
  './js/components/lesson-list.js',
  './js/components/lesson-view.js',
  './js/components/flashcard.js',
  './js/components/quiz.js',
  './js/components/dialogue.js',
  './js/components/grammar.js',
  './js/components/oath-trainer.js',
  './js/components/ceremony-sim.js',
  './js/components/progress.js',
  './js/components/settings.js',
  './js/components/nav.js',
  './js/components/header.js',
  './data/modules.json',
  './data/oath.json',
  './data/achievements.json',
  './data/vocabulary/01-basics.json',
  './data/vocabulary/02-greetings.json',
  './data/vocabulary/15-oath-anthem.json',
  './data/vocabulary/16-ceremony-qa.json',
  './data/grammar/01-alphabet.json',
  './data/grammar/02-nouns-articles.json',
  './data/dialogues/01-meeting-someone.json',
  './data/dialogues/07-ceremony-arrival.json',
  './data/dialogues/08-ceremony-interview.json',
  './data/dialogues/09-history-quiz.json',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }))
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});
