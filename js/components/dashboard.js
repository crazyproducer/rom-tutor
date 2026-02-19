import { t, tr, loadJSON, escapeHtml } from '../services/utils.js';
import { getDueCards, getCardStats } from '../services/srs.js';
import { getLevelTitle, getLevelProgress, updateHeaderDisplay } from '../services/gamification.js';

export function Dashboard(container, store, router) {
  render();
  updateHeaderDisplay();

  async function render() {
    const state = store.getState();
    const modules = await loadJSON('./data/modules.json');
    const dueCount = getDueCards(state.srsCards).length;
    const streak = state.profile.currentStreak || 0;
    const totalXP = state.profile.totalXP || 0;
    const level = state.profile.currentLevel || 1;
    const levelTitle = getLevelTitle(level, state.settings.primaryLanguage);
    const oathScore = state.oathProgress.bestScore || 0;
    const circumference = 2 * Math.PI * 30;
    const oathOffset = circumference * (1 - oathScore / 100);

    // Build view using safe DOM construction
    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Greeting
    const greeting = document.createElement('div');
    greeting.className = 'dashboard-greeting';
    greeting.textContent = 'Bună ziua!';
    view.appendChild(greeting);

    const subtitle = document.createElement('div');
    subtitle.className = 'dashboard-subtitle';
    subtitle.textContent = `${t('dashboard.study_day')} #${streak || 1}`;
    view.appendChild(subtitle);

    // Stats grid
    const stats = document.createElement('div');
    stats.className = 'dashboard-stats';
    stats.appendChild(createStatCard(`🔥 ${streak}`, t('common.streak'), 'var(--color-warning)'));
    stats.appendChild(createStatCard(`⭐ ${totalXP}`, t('common.xp'), 'var(--color-secondary)'));
    stats.appendChild(createStatCard(String(level), escapeHtml(levelTitle), 'var(--color-primary)'));
    view.appendChild(stats);

    // Review card
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';
    if (dueCount > 0) {
      const info = document.createElement('div');
      info.className = 'review-card-info';
      const h3 = document.createElement('h3');
      h3.textContent = t('dashboard.daily_review');
      const p = document.createElement('p');
      p.textContent = `${dueCount} ${t('common.cards_due')}`;
      info.appendChild(h3);
      info.appendChild(p);
      reviewCard.appendChild(info);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = t('common.start');
      btn.addEventListener('click', () => { location.hash = '#/flashcards'; });
      reviewCard.appendChild(btn);
    } else {
      reviewCard.style.background = 'var(--color-success)';
      const info = document.createElement('div');
      info.className = 'review-card-info';
      const h3 = document.createElement('h3');
      h3.textContent = t('common.well_done');
      const p = document.createElement('p');
      p.textContent = t('common.no_cards');
      info.appendChild(h3);
      info.appendChild(p);
      reviewCard.appendChild(info);
    }
    view.appendChild(reviewCard);

    // Oath readiness
    const oath = document.createElement('div');
    oath.className = 'oath-readiness';
    oath.style.cursor = 'pointer';
    oath.addEventListener('click', () => { location.hash = '#/oath'; });

    const svgNS = 'http://www.w3.org/2000/svg';
    const circProg = document.createElement('div');
    circProg.className = 'circular-progress';
    circProg.style.width = '70px';
    circProg.style.height = '70px';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '70');
    svg.setAttribute('height', '70');
    svg.setAttribute('viewBox', '0 0 70 70');
    const bgCircle = document.createElementNS(svgNS, 'circle');
    bgCircle.setAttribute('cx', '35');
    bgCircle.setAttribute('cy', '35');
    bgCircle.setAttribute('r', '30');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', 'var(--color-surface-alt)');
    bgCircle.setAttribute('stroke-width', '6');
    svg.appendChild(bgCircle);
    const fgCircle = document.createElementNS(svgNS, 'circle');
    fgCircle.setAttribute('cx', '35');
    fgCircle.setAttribute('cy', '35');
    fgCircle.setAttribute('r', '30');
    fgCircle.setAttribute('fill', 'none');
    fgCircle.setAttribute('stroke', oathScore >= 90 ? 'var(--color-success)' : 'var(--color-primary)');
    fgCircle.setAttribute('stroke-width', '6');
    fgCircle.setAttribute('stroke-dasharray', String(circumference));
    fgCircle.setAttribute('stroke-dashoffset', String(oathOffset));
    fgCircle.setAttribute('stroke-linecap', 'round');
    svg.appendChild(fgCircle);
    circProg.appendChild(svg);
    const circText = document.createElement('span');
    circText.className = 'circular-progress-text';
    circText.style.fontSize = '1rem';
    circText.textContent = `${oathScore}%`;
    circProg.appendChild(circText);
    oath.appendChild(circProg);

    const oathInfo = document.createElement('div');
    oathInfo.className = 'oath-readiness-info';
    const oathH3 = document.createElement('h3');
    oathH3.textContent = t('dashboard.oath_readiness');
    oathInfo.appendChild(oathH3);
    const oathP = document.createElement('p');
    if (oathScore < 50) {
      oathP.textContent = tr({ en: 'Keep practicing the oath text', uk: 'Продовжуйте практикувати текст присяги' });
    } else if (oathScore < 90) {
      oathP.textContent = tr({ en: 'Almost there! Practice recitation', uk: 'Майже готово! Практикуйте відтворення' });
    } else {
      oathP.textContent = tr({ en: 'Oath mastered!', uk: 'Присягу опановано!' });
    }
    oathInfo.appendChild(oathP);
    oath.appendChild(oathInfo);
    view.appendChild(oath);

    // Module grid
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = t('dashboard.modules');
    view.appendChild(sectionTitle);

    const grid = document.createElement('div');
    grid.className = 'module-grid';
    if (modules) {
      for (const phase of modules.phases) {
        for (const mod of phase.modules) {
          grid.appendChild(createModuleCard(mod, phase, state));
        }
      }
    }
    view.appendChild(grid);

    container.textContent = '';
    container.appendChild(view);
  }

  function createStatCard(value, label, color) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const val = document.createElement('div');
    val.className = 'stat-value';
    val.style.color = color;
    val.textContent = value;
    const lab = document.createElement('div');
    lab.className = 'stat-label';
    lab.textContent = label;
    card.appendChild(val);
    card.appendChild(lab);
    return card;
  }

  function createModuleCard(mod, phase, state) {
    const progress = state.moduleProgress[mod.id];
    const lessonCount = mod.lessons.length || 1;
    const completedCount = progress?.lessonsCompleted?.length || 0;
    const pct = Math.round(completedCount / lessonCount * 100);
    const isComingSoon = mod.comingSoon;
    const isCompleted = pct === 100 && mod.lessons.length > 0;

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

    const sub = document.createElement('div');
    sub.className = 'module-card-subtitle';
    sub.textContent = phase.level;
    card.appendChild(sub);

    if (isComingSoon) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-secondary module-card-badge';
      badge.textContent = t('common.coming_soon');
      card.appendChild(badge);
    } else if (isCompleted) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-success module-card-badge';
      badge.textContent = t('common.completed');
      card.appendChild(badge);
    } else {
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      const fill = document.createElement('div');
      fill.className = 'progress-bar-fill';
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);
      card.appendChild(bar);
    }

    return card;
  }
}
