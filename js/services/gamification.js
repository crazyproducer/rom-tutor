import { store } from '../store.js';
import { today } from './utils.js';

const XP_AWARDS = {
  flashcardSession: 20,
  lessonComplete: 30,
  quizPass: 25,
  quizExcellent: 40,
  dialogueComplete: 35,
  oathSegment: 15,
  oathFull: 50,
  dailyLogin: 10
};

const LEVEL_TITLES = {
  uk: [
    { min: 1, max: 3, title: 'Початківець' },
    { min: 4, max: 7, title: 'Учень' },
    { min: 8, max: 12, title: 'Мовець' },
    { min: 13, max: 18, title: 'Знавець' },
    { min: 19, max: 24, title: 'Просунутий' },
    { min: 25, max: 30, title: 'Громадянин' }
  ],
  en: [
    { min: 1, max: 3, title: 'Beginner' },
    { min: 4, max: 7, title: 'Student' },
    { min: 8, max: 12, title: 'Speaker' },
    { min: 13, max: 18, title: 'Knower' },
    { min: 19, max: 24, title: 'Advanced' },
    { min: 25, max: 30, title: 'Citizen' }
  ],
  ro: [
    { min: 1, max: 3, title: 'Începător' },
    { min: 4, max: 7, title: 'Elev' },
    { min: 8, max: 12, title: 'Vorbitor' },
    { min: 13, max: 18, title: 'Cunoscător' },
    { min: 19, max: 24, title: 'Avansat' },
    { min: 25, max: 30, title: 'Cetățean' }
  ]
};

export function awardXP(action, extra = 0) {
  const xp = (XP_AWARDS[action] || 0) + extra;
  if (xp <= 0) return 0;

  const currentXP = store.get('profile.totalXP') || 0;
  const newXP = currentXP + xp;
  store.update('profile.totalXP', newXP);

  const newLevel = calculateLevel(newXP);
  store.update('profile.currentLevel', newLevel);

  logDailyXP(xp);
  updateHeaderDisplay();
  return xp;
}

export function calculateLevel(xp) {
  return Math.min(30, Math.floor(Math.sqrt(xp / 50)) + 1);
}

export function getLevelTitle(level, lang = 'uk') {
  const titles = LEVEL_TITLES[lang] || LEVEL_TITLES['uk'];
  const tier = titles.find(t => level >= t.min && level <= t.max);
  return tier ? tier.title : titles[0].title;
}

export function getXPForLevel(level) {
  return (level - 1) * (level - 1) * 50;
}

export function getLevelProgress(xp) {
  const level = calculateLevel(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const progress = (xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
  return Math.min(1, Math.max(0, progress));
}

export function updateStreak() {
  const lastDate = store.get('profile.lastStudyDate');
  const todayStr = today();

  if (lastDate === todayStr) return;

  const current = store.get('profile.currentStreak') || 0;
  const longest = store.get('profile.longestStreak') || 0;

  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date(todayStr);
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      const newStreak = current + 1;
      store.update('profile.currentStreak', newStreak);
      store.update('profile.longestStreak', Math.max(longest, newStreak));
    } else if (diffDays > 1) {
      store.update('profile.currentStreak', 1);
    }
  } else {
    store.update('profile.currentStreak', 1);
  }

  store.update('profile.lastStudyDate', todayStr);
  updateHeaderDisplay();
}

export function checkAchievements() {
  const state = store.getState();
  const earned = state.achievements || [];
  const newAchievements = [];

  const checks = [
    { id: 'first-lesson', check: () => state.profile.sessionsCompleted >= 1 },
    { id: 'first-10-words', check: () => Object.keys(state.srsCards).length >= 10 },
    { id: 'streak-7', check: () => state.profile.currentStreak >= 7 },
    { id: 'streak-30', check: () => state.profile.currentStreak >= 30 },
    { id: 'oath-memorized', check: () => state.oathProgress.bestScore >= 90 },
    { id: 'vocab-100', check: () => Object.keys(state.srsCards).length >= 100 },
    { id: 'vocab-500', check: () => Object.keys(state.srsCards).length >= 500 },
    { id: 'level-10', check: () => state.profile.currentLevel >= 10 },
    { id: 'level-20', check: () => state.profile.currentLevel >= 20 },
  ];

  for (const { id, check } of checks) {
    if (!earned.includes(id) && check()) {
      newAchievements.push(id);
    }
  }

  if (newAchievements.length > 0) {
    store.update('achievements', [...earned, ...newAchievements]);
  }

  return newAchievements;
}

function logDailyXP(xp) {
  const todayStr = today();
  const log = store.get('dailyLog') || {};
  const dayLog = log[todayStr] || { minutesStudied: 0, xpEarned: 0, cardsReviewed: 0, lessonsCompleted: 0 };
  dayLog.xpEarned += xp;
  store.update(`dailyLog.${todayStr}`, dayLog);
}

export function logStudyActivity(type, count = 1) {
  const todayStr = today();
  const log = store.get('dailyLog') || {};
  const dayLog = log[todayStr] || { minutesStudied: 0, xpEarned: 0, cardsReviewed: 0, lessonsCompleted: 0 };

  if (type === 'cards') dayLog.cardsReviewed += count;
  if (type === 'lesson') dayLog.lessonsCompleted += count;
  if (type === 'minutes') dayLog.minutesStudied += count;

  store.update(`dailyLog.${todayStr}`, dayLog);
  updateStreak();
}

export function updateHeaderDisplay() {
  const streakEl = document.getElementById('streak-count');
  const xpEl = document.getElementById('xp-count');
  if (streakEl) streakEl.textContent = store.get('profile.currentStreak') || 0;
  if (xpEl) xpEl.textContent = store.get('profile.totalXP') || 0;
}
