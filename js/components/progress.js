import { t, tr, loadJSON } from '../services/utils.js';
import { getLevelTitle, getLevelProgress, getXPForLevel } from '../services/gamification.js';

export function Progress(container, store, router) {
  render();

  async function render() {
    const state = store.getState();
    const achievementsData = await loadJSON('./data/achievements.json');
    const level = state.profile.currentLevel || 1;
    const totalXP = state.profile.totalXP || 0;
    const streak = state.profile.currentStreak || 0;
    const longestStreak = state.profile.longestStreak || 0;
    const cardsLearned = Object.keys(state.srsCards).length;
    const sessionsCompleted = state.profile.sessionsCompleted || 0;
    const levelTitle = getLevelTitle(level, state.settings.primaryLanguage);
    const levelProgress = getLevelProgress(totalXP);
    const nextLevelXP = getXPForLevel(level + 1);
    const earnedAchievements = state.achievements || [];

    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Profile header
    const header = document.createElement('div');
    header.className = 'profile-header';

    const levelCircle = document.createElement('div');
    levelCircle.className = 'profile-level';
    levelCircle.textContent = String(level);
    header.appendChild(levelCircle);

    const title = document.createElement('div');
    title.className = 'profile-level-title';
    title.textContent = levelTitle;
    header.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'profile-level-subtitle';
    sub.textContent = `${totalXP} / ${nextLevelXP} XP`;
    header.appendChild(sub);

    const bar = document.createElement('div');
    bar.className = 'progress-bar mt-8';
    bar.style.maxWidth = '200px';
    bar.style.margin = '8px auto 0';
    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill secondary';
    fill.style.width = `${Math.round(levelProgress * 100)}%`;
    bar.appendChild(fill);
    header.appendChild(bar);

    view.appendChild(header);

    // Stats grid
    const grid = document.createElement('div');
    grid.className = 'profile-stats-grid';
    grid.appendChild(createStatCard(`🔥 ${streak}`, tr({ en: 'Current streak', uk: 'Поточний стрік' })));
    grid.appendChild(createStatCard(`🏆 ${longestStreak}`, tr({ en: 'Best streak', uk: 'Найкращий стрік' })));
    grid.appendChild(createStatCard(`📝 ${cardsLearned}`, tr({ en: 'Words learned', uk: 'Слів вивчено' })));
    grid.appendChild(createStatCard(`⭐ ${totalXP}`, tr({ en: 'Total XP', uk: 'Загальний XP' })));
    view.appendChild(grid);

    // Settings link
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn btn-secondary btn-block mb-20';
    settingsBtn.textContent = tr({ en: 'Settings', uk: 'Налаштування' });
    settingsBtn.addEventListener('click', () => { location.hash = '#/settings'; });
    view.appendChild(settingsBtn);

    // Achievements
    const achTitle = document.createElement('div');
    achTitle.className = 'section-title';
    achTitle.textContent = t('progress.achievements');
    view.appendChild(achTitle);

    const achGrid = document.createElement('div');
    achGrid.className = 'achievement-grid';

    if (achievementsData?.achievements) {
      for (const ach of achievementsData.achievements) {
        const earned = earnedAchievements.includes(ach.id);
        const achCard = document.createElement('div');
        achCard.className = `achievement ${earned ? 'earned' : ''}`;

        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = earned ? ach.icon : '🔒';
        achCard.appendChild(icon);

        const name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = tr(ach.title);
        achCard.appendChild(name);

        achGrid.appendChild(achCard);
      }
    }

    view.appendChild(achGrid);

    container.textContent = '';
    container.appendChild(view);
  }

  function createStatCard(value, label) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const val = document.createElement('div');
    val.className = 'stat-value';
    val.style.fontSize = '1.25rem';
    val.textContent = value;
    card.appendChild(val);
    const lab = document.createElement('div');
    lab.className = 'stat-label';
    lab.textContent = label;
    card.appendChild(lab);
    return card;
  }
}
