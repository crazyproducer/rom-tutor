export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function daysAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pickRandom(array, count = 1) {
  const shuffled = shuffle(array);
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
}

export async function loadJSON(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error(`Failed to load ${path}:`, e);
    return null;
  }
}

const i18nStrings = {
  uk: {
    'nav.home': 'Головна',
    'nav.lessons': 'Уроки',
    'nav.review': 'Повторення',
    'nav.oath': 'Присяга',
    'nav.profile': 'Профіль',
    'common.start': 'Почати',
    'common.continue': 'Продовжити',
    'common.back': 'Назад',
    'common.next': 'Далі',
    'common.finish': 'Завершити',
    'common.close': 'Закрити',
    'common.correct': 'Правильно!',
    'common.incorrect': 'Неправильно',
    'common.score': 'Результат',
    'common.xp': 'XP',
    'common.level': 'Рівень',
    'common.streak': 'Стрік',
    'common.cards_due': 'карток на повторення',
    'common.no_cards': 'Немає карток на повторення',
    'common.well_done': 'Чудово!',
    'common.coming_soon': 'Скоро',
    'common.locked': 'Заблоковано',
    'common.completed': 'Завершено',
    'dashboard.greeting': 'Bună ziua!',
    'dashboard.study_day': 'День навчання',
    'dashboard.daily_review': 'Щоденне повторення',
    'dashboard.continue_learning': 'Продовжити навчання',
    'dashboard.oath_readiness': 'Готовність до присяги',
    'dashboard.modules': 'Модулі',
    'flashcard.again': 'Знову',
    'flashcard.hard': 'Важко',
    'flashcard.good': 'Добре',
    'flashcard.easy': 'Легко',
    'flashcard.flip': 'Перевернути',
    'flashcard.of': 'з',
    'flashcard.session_complete': 'Сесію завершено!',
    'flashcard.cards_reviewed': 'Карток переглянуто',
    'quiz.check': 'Перевірити',
    'quiz.question': 'Питання',
    'quiz.type_answer': 'Введіть відповідь...',
    'quiz.match_pairs': 'З\'єднайте пари',
    'oath.learn': 'Вчити',
    'oath.build': 'Збирати',
    'oath.recite': 'Відтворити',
    'oath.full_text': 'Повний текст',
    'oath.segment': 'Сегмент',
    'oath.check_recitation': 'Перевірити',
    'oath.your_text': 'Напишіть текст присяги напам\'ять...',
    'ceremony.title': 'Симуляція церемонії',
    'ceremony.start': 'Розпочати церемонію',
    'ceremony.result': 'Результат',
    'dialogue.your_turn': 'Ваша черга відповідати:',
    'dialogue.translate': 'Перекладіть румунською:',
    'dialogue.say_this': 'Перекладіть румунською:',
    'dialogue.expected': 'Правильна відповідь:',
    'dialogue.also_acceptable': 'Також прийнятно:',
    'dialogue.type_romanian': 'Введіть або продиктуйте румунською...',
    'settings.title': 'Налаштування',
    'settings.language': 'Мова інтерфейсу',
    'settings.theme': 'Тема',
    'settings.theme_light': 'Світла',
    'settings.theme_dark': 'Темна',
    'settings.theme_auto': 'Авто',
    'settings.daily_goal': 'Щоденна ціль (хв)',
    'settings.pronunciation': 'Показувати вимову',
    'settings.audio': 'Автовідтворення аудіо',
    'settings.tts_engine': 'Озвучення румунської',
    'settings.tts_google': 'Google (точна вимова)',
    'settings.tts_browser': 'Браузер (офлайн)',
    'settings.module_lock': 'Послідовне відкриття модулів',
    'settings.export': 'Експортувати прогрес',
    'settings.import': 'Імпортувати прогрес',
    'settings.reset': 'Скинути все',
    'settings.reset_confirm': 'Ви впевнені? Це видалить весь прогрес!',
    'progress.title': 'Ваш прогрес',
    'progress.total_xp': 'Загальний XP',
    'progress.study_time': 'Час навчання',
    'progress.words_learned': 'Слів вивчено',
    'progress.achievements': 'Досягнення',
    'progress.minutes': 'хв',
    'progress.hours': 'год'
  },
  en: {
    'nav.home': 'Home',
    'nav.lessons': 'Lessons',
    'nav.review': 'Review',
    'nav.oath': 'Oath',
    'nav.profile': 'Profile',
    'common.start': 'Start',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.finish': 'Finish',
    'common.close': 'Close',
    'common.correct': 'Correct!',
    'common.incorrect': 'Incorrect',
    'common.score': 'Score',
    'common.xp': 'XP',
    'common.level': 'Level',
    'common.streak': 'Streak',
    'common.cards_due': 'cards due for review',
    'common.no_cards': 'No cards due for review',
    'common.well_done': 'Well done!',
    'common.coming_soon': 'Coming soon',
    'common.locked': 'Locked',
    'common.completed': 'Completed',
    'dashboard.greeting': 'Bună ziua!',
    'dashboard.study_day': 'Study day',
    'dashboard.daily_review': 'Daily review',
    'dashboard.continue_learning': 'Continue learning',
    'dashboard.oath_readiness': 'Oath readiness',
    'dashboard.modules': 'Modules',
    'flashcard.again': 'Again',
    'flashcard.hard': 'Hard',
    'flashcard.good': 'Good',
    'flashcard.easy': 'Easy',
    'flashcard.flip': 'Flip',
    'flashcard.of': 'of',
    'flashcard.session_complete': 'Session complete!',
    'flashcard.cards_reviewed': 'Cards reviewed',
    'quiz.check': 'Check',
    'quiz.question': 'Question',
    'quiz.type_answer': 'Type your answer...',
    'quiz.match_pairs': 'Match the pairs',
    'oath.learn': 'Learn',
    'oath.build': 'Build',
    'oath.recite': 'Recite',
    'oath.full_text': 'Full text',
    'oath.segment': 'Segment',
    'oath.check_recitation': 'Check',
    'oath.your_text': 'Write the oath text from memory...',
    'ceremony.title': 'Ceremony Simulation',
    'ceremony.start': 'Start ceremony',
    'ceremony.result': 'Result',
    'dialogue.your_turn': 'Your turn to respond:',
    'dialogue.translate': 'Translate to Romanian:',
    'dialogue.say_this': 'Translate to Romanian:',
    'dialogue.expected': 'Correct answer:',
    'dialogue.also_acceptable': 'Also acceptable:',
    'dialogue.type_romanian': 'Type or dictate in Romanian...',
    'settings.title': 'Settings',
    'settings.language': 'Interface language',
    'settings.theme': 'Theme',
    'settings.theme_light': 'Light',
    'settings.theme_dark': 'Dark',
    'settings.theme_auto': 'Auto',
    'settings.daily_goal': 'Daily goal (min)',
    'settings.pronunciation': 'Show pronunciation',
    'settings.audio': 'Auto-play audio',
    'settings.tts_engine': 'Romanian pronunciation',
    'settings.tts_google': 'Google (accurate)',
    'settings.tts_browser': 'Browser (offline)',
    'settings.module_lock': 'Sequential module unlock',
    'settings.export': 'Export progress',
    'settings.import': 'Import progress',
    'settings.reset': 'Reset all',
    'settings.reset_confirm': 'Are you sure? This will delete all progress!',
    'progress.title': 'Your Progress',
    'progress.total_xp': 'Total XP',
    'progress.study_time': 'Study time',
    'progress.words_learned': 'Words learned',
    'progress.achievements': 'Achievements',
    'progress.minutes': 'min',
    'progress.hours': 'hrs'
  }
};

let currentLang = 'uk';

export function setLanguage(lang) {
  currentLang = lang;
  applyI18n();
}

export function t(key) {
  return i18nStrings[currentLang]?.[key] || i18nStrings['en']?.[key] || key;
}

export function tr(obj) {
  if (!obj) return '';
  return obj[currentLang] || obj['uk'] || obj['en'] || obj['ro'] || '';
}

export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

export function getLang() {
  return currentLang;
}

/**
 * Compare user's Romanian answer against expected text.
 * Returns { percentage, correctCount, totalExpected, diffElement }.
 * diffElement is a DOM node with colored words (green/red/gray).
 * Placeholders like [Nume], [X], [Oraș] auto-match any user word.
 */
export function compareRomanianAnswer(userText, expectedText) {
  const normalize = s => s.toLowerCase().replace(/[.,!?;:„"""''()]/g, '').replace(/\s+/g, ' ').trim();

  const expectedNorm = normalize(expectedText);
  const userNorm = normalize(userText);

  const expectedWords = expectedNorm.split(' ').filter(w => w);
  const userWords = userNorm.split(' ').filter(w => w);

  const isPlaceholder = w => /^\[.*\]$/.test(w);

  let correctCount = 0;
  const maxLen = Math.max(expectedWords.length, userWords.length);

  // Build diff element
  const diffEl = document.createElement('div');
  diffEl.className = 'answer-diff';

  for (let i = 0; i < maxLen; i++) {
    const expected = expectedWords[i];
    const user = userWords[i];

    const span = document.createElement('span');

    if (!expected) {
      // User typed extra words
      span.className = 'word-extra';
      span.textContent = user;
    } else if (!user) {
      // User missed this word
      span.className = 'word-missing';
      span.textContent = expected;
    } else if (isPlaceholder(expected)) {
      // Placeholder — auto-match
      span.className = 'word-correct';
      span.textContent = user;
      correctCount++;
    } else if (normalize(user) === normalize(expected)) {
      span.className = 'word-correct';
      span.textContent = user;
      correctCount++;
    } else {
      span.className = 'word-wrong';
      span.textContent = user;
    }

    if (i > 0) {
      diffEl.appendChild(document.createTextNode(' '));
    }
    diffEl.appendChild(span);
  }

  const totalExpected = expectedWords.length || 1;
  const percentage = Math.round(correctCount / totalExpected * 100);

  return { percentage, correctCount, totalExpected, diffElement: diffEl };
}
