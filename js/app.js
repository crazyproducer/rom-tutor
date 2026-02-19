import { Router } from './router.js';
import { store } from './store.js';
import { setLanguage, applyI18n } from './services/utils.js';
import { updateHeaderDisplay, updateStreak } from './services/gamification.js';
import { Dashboard } from './components/dashboard.js';
import { LessonList } from './components/lesson-list.js';
import { LessonView } from './components/lesson-view.js';
import { Flashcard } from './components/flashcard.js';
import { Quiz } from './components/quiz.js';
import { Dialogue } from './components/dialogue.js';
import { Grammar } from './components/grammar.js';
import { OathTrainer } from './components/oath-trainer.js';
import { CeremonySim } from './components/ceremony-sim.js';
import { Progress } from './components/progress.js';
import { Settings } from './components/settings.js';

function initTheme() {
  const theme = store.get('settings.theme') || 'light';
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function initLanguage() {
  const lang = store.get('settings.primaryLanguage') || 'uk';
  setLanguage(lang);
  applyI18n();
}

function showBackButton(show = false) {
  const btn = document.getElementById('header-back');
  btn.classList.toggle('hidden', !show);
}

function setHeaderTitle(title) {
  document.getElementById('header-title').textContent = title;
}

function initRouter() {
  const container = document.getElementById('app-content');
  const router = new Router(container);

  router.add('/', (el) => {
    showBackButton(false);
    setHeaderTitle('ROM Tutor');
    return Dashboard(el, store, router);
  });

  router.add('/lessons', (el) => {
    showBackButton(false);
    setHeaderTitle('ROM Tutor');
    return LessonList(el, store, router);
  });

  router.add('/lessons/:moduleId', (el, params) => {
    showBackButton(true);
    return LessonView(el, store, router, params.moduleId);
  });

  router.add('/flashcards', (el) => {
    showBackButton(false);
    setHeaderTitle('ROM Tutor');
    return Flashcard(el, store, router);
  });

  router.add('/flashcards/:moduleId', (el, params) => {
    showBackButton(true);
    return Flashcard(el, store, router, params.moduleId);
  });

  router.add('/quiz/:moduleId', (el, params) => {
    showBackButton(true);
    return Quiz(el, store, router, params.moduleId);
  });

  router.add('/grammar/:moduleId', (el, params) => {
    showBackButton(true);
    return Grammar(el, store, router, params.moduleId);
  });

  router.add('/dialogue/:dialogueId', (el, params) => {
    showBackButton(true);
    return Dialogue(el, store, router, params.dialogueId);
  });

  router.add('/oath', (el) => {
    showBackButton(false);
    setHeaderTitle('ROM Tutor');
    return OathTrainer(el, store, router);
  });

  router.add('/ceremony', (el) => {
    showBackButton(true);
    return CeremonySim(el, store, router);
  });

  router.add('/profile', (el) => {
    showBackButton(false);
    setHeaderTitle('ROM Tutor');
    return Progress(el, store, router);
  });

  router.add('/settings', (el) => {
    showBackButton(true);
    setHeaderTitle('ROM Tutor');
    return Settings(el, store, router);
  });

  // Back button
  document.getElementById('header-back').addEventListener('click', () => {
    window.history.back();
  });

  router.start();
  return router;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  }
}

function init() {
  initTheme();
  initLanguage();
  updateHeaderDisplay();
  updateStreak();
  initRouter();
  registerServiceWorker();

  // Listen for theme changes
  store.subscribe((state) => {
    initTheme();
    updateHeaderDisplay();
  });

  // System theme change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (store.get('settings.theme') === 'auto') {
      initTheme();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
