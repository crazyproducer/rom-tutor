import { t, tr, loadJSON } from '../services/utils.js';

export function LessonList(container, store, router) {
  render();

  async function render() {
    const state = store.getState();
    const modules = await loadJSON('./data/modules.json');
    if (!modules) {
      container.textContent = 'Failed to load modules.';
      return;
    }

    const view = document.createElement('div');
    view.className = 'view fade-in';

    for (const phase of modules.phases) {
      const phaseSection = document.createElement('div');
      phaseSection.className = 'mb-24';

      const phaseTitle = document.createElement('div');
      phaseTitle.className = 'section-title';
      const badge = document.createElement('span');
      badge.className = 'badge badge-primary';
      badge.textContent = phase.level;
      phaseTitle.textContent = tr(phase.title) + ' ';
      phaseTitle.appendChild(badge);
      phaseSection.appendChild(phaseTitle);

      const grid = document.createElement('div');
      grid.className = 'module-grid';

      for (const mod of phase.modules) {
        const progress = state.moduleProgress[mod.id];
        const lessonCount = mod.lessons.length || 1;
        const completedCount = progress?.lessonsCompleted?.length || 0;
        const pct = Math.round(completedCount / lessonCount * 100);
        const isComingSoon = mod.comingSoon;

        const card = document.createElement('a');
        card.className = `module-card ${isComingSoon ? 'coming-soon' : ''}`;
        if (isComingSoon) {
          card.href = '#';
          card.addEventListener('click', (e) => e.preventDefault());
        } else {
          card.href = `#/lessons/${mod.id}`;
        }

        const icon = document.createElement('div');
        icon.className = 'module-card-icon';
        icon.textContent = mod.icon;
        card.appendChild(icon);

        const title = document.createElement('div');
        title.className = 'module-card-title';
        title.textContent = tr(mod.title);
        card.appendChild(title);

        const desc = document.createElement('div');
        desc.className = 'module-card-subtitle';
        desc.textContent = tr(mod.description);
        card.appendChild(desc);

        if (isComingSoon) {
          const b = document.createElement('span');
          b.className = 'badge badge-secondary module-card-badge';
          b.textContent = t('common.coming_soon');
          card.appendChild(b);
        } else {
          const bar = document.createElement('div');
          bar.className = 'progress-bar';
          const fill = document.createElement('div');
          fill.className = 'progress-bar-fill';
          fill.style.width = `${pct}%`;
          bar.appendChild(fill);
          card.appendChild(bar);
        }

        grid.appendChild(card);
      }
      phaseSection.appendChild(grid);
      view.appendChild(phaseSection);
    }

    container.textContent = '';
    container.appendChild(view);
  }
}
