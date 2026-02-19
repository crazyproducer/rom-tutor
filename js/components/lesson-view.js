import { t, tr, loadJSON } from '../services/utils.js';

export function LessonView(container, store, router, moduleId) {
  render();

  async function render() {
    const modules = await loadJSON('./data/modules.json');
    if (!modules) { container.textContent = 'Failed to load.'; return; }

    let mod = null;
    for (const phase of modules.phases) {
      mod = phase.modules.find(m => m.id === moduleId);
      if (mod) break;
    }
    if (!mod) { container.textContent = 'Module not found.'; return; }

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = tr(mod.title);

    const state = store.getState();
    const progress = state.moduleProgress[moduleId] || {};

    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Module header
    const header = document.createElement('div');
    header.className = 'lesson-header';
    const h2 = document.createElement('h2');
    h2.textContent = `${mod.icon} ${tr(mod.title)}`;
    header.appendChild(h2);
    const desc = document.createElement('p');
    desc.textContent = tr(mod.description);
    header.appendChild(desc);
    view.appendChild(header);

    // Learning modes grid
    const modes = document.createElement('div');
    modes.className = 'lesson-modes';

    // Flashcards mode
    if (mod.vocabularyFile) {
      modes.appendChild(createModeCard(
        '🃏',
        tr({ en: 'Flashcards', uk: 'Картки' }),
        tr({ en: 'Study vocabulary with spaced repetition', uk: 'Вивчайте словник з інтервальним повторенням' }),
        `#/flashcards/${moduleId}`
      ));
    }

    // Quiz mode
    if (mod.vocabularyFile) {
      modes.appendChild(createModeCard(
        '❓',
        tr({ en: 'Quiz', uk: 'Тест' }),
        tr({ en: 'Test your knowledge', uk: 'Перевірте свої знання' }),
        `#/quiz/${moduleId}`
      ));
    }

    // Grammar mode
    if (mod.grammarFile) {
      modes.appendChild(createModeCard(
        '📐',
        tr({ en: 'Grammar', uk: 'Граматика' }),
        tr({ en: 'Learn grammar rules', uk: 'Вивчайте правила граматики' }),
        `#/grammar/${moduleId}`
      ));
    }

    // Dialogue mode
    if (mod.dialogueFile) {
      modes.appendChild(createModeCard(
        '💬',
        tr({ en: 'Dialogue', uk: 'Діалог' }),
        tr({ en: 'Practice conversations', uk: 'Практикуйте розмови' }),
        `#/dialogue/${mod.dialogueFile.replace('.json', '')}`
      ));
    }

    // Special: Oath trainer for module 15
    if (moduleId === 'mod-15') {
      modes.appendChild(createModeCard(
        '🇷🇴',
        tr({ en: 'Oath Trainer', uk: 'Тренажер присяги' }),
        tr({ en: 'Memorize the oath text', uk: 'Запам\'ятайте текст присяги' }),
        '#/oath'
      ));
    }

    // Special: Ceremony sim for module 16
    if (moduleId === 'mod-16') {
      modes.appendChild(createModeCard(
        '🎓',
        tr({ en: 'Ceremony Simulation', uk: 'Симуляція церемонії' }),
        tr({ en: 'Practice the full ceremony', uk: 'Практикуйте повну церемонію' }),
        '#/ceremony'
      ));
    }

    view.appendChild(modes);

    // Lessons list
    if (mod.lessons.length > 0) {
      const lessonsTitle = document.createElement('div');
      lessonsTitle.className = 'section-title mt-20';
      lessonsTitle.textContent = tr({ en: 'Lessons', uk: 'Уроки' });
      view.appendChild(lessonsTitle);

      for (const lesson of mod.lessons) {
        const isCompleted = progress.lessonsCompleted?.includes(lesson.id);
        const item = document.createElement('div');
        item.className = 'card mb-8';
        item.style.padding = '14px 16px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';

        const left = document.createElement('div');
        const name = document.createElement('div');
        name.style.fontWeight = '600';
        name.style.fontSize = '0.9375rem';
        name.textContent = tr(lesson.title);
        left.appendChild(name);
        const types = document.createElement('div');
        types.style.fontSize = '0.75rem';
        types.style.color = 'var(--color-text-secondary)';
        types.textContent = lesson.types.join(' · ');
        left.appendChild(types);
        item.appendChild(left);

        if (isCompleted) {
          const check = document.createElement('span');
          check.className = 'badge badge-success';
          check.textContent = '✓';
          item.appendChild(check);
        }

        view.appendChild(item);
      }
    }

    container.textContent = '';
    container.appendChild(view);
  }

  function createModeCard(icon, title, description, href) {
    const card = document.createElement('a');
    card.className = 'lesson-mode-card';
    card.href = href;

    const iconEl = document.createElement('div');
    iconEl.className = 'lesson-mode-icon';
    iconEl.textContent = icon;
    card.appendChild(iconEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'lesson-mode-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);

    const descEl = document.createElement('div');
    descEl.className = 'lesson-mode-description';
    descEl.textContent = description;
    card.appendChild(descEl);

    return card;
  }
}
