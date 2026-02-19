const STORAGE_KEY = 'rom-tutor-state';

const DEFAULT_STATE = {
  version: 1,
  settings: {
    theme: 'light',
    primaryLanguage: 'uk',
    secondaryLanguage: 'en',
    dailyGoalMinutes: 15,
    showPronunciation: true,
    autoPlayAudio: false,
    moduleLocking: true
  },
  profile: {
    startDate: new Date().toISOString().split('T')[0],
    totalXP: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalStudyMinutes: 0,
    sessionsCompleted: 0
  },
  moduleProgress: {},
  srsCards: {},
  achievements: [],
  oathProgress: {
    segmentsMastered: [],
    fullRecitationAttempts: 0,
    bestScore: 0
  },
  dailyLog: {}
};

class Store {
  #state;
  #listeners;

  constructor() {
    this.#listeners = new Set();
    this.#state = this.#load();
  }

  getState() {
    return JSON.parse(JSON.stringify(this.#state));
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.#state);
  }

  update(path, value) {
    const keys = path.split('.');
    let obj = this.#state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.#persist();
    this.#notify();
  }

  merge(path, partial) {
    const current = this.get(path) || {};
    this.update(path, { ...current, ...partial });
  }

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  reset() {
    this.#state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.#state.profile.startDate = new Date().toISOString().split('T')[0];
    this.#persist();
    this.#notify();
  }

  exportData() {
    return JSON.stringify(this.#state, null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.version) {
        this.#state = data;
        this.#persist();
        this.#notify();
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  }

  #load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return this.#migrate(parsed);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  #migrate(state) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (state.settings) Object.assign(merged.settings, state.settings);
    if (state.profile) Object.assign(merged.profile, state.profile);
    if (state.moduleProgress) merged.moduleProgress = state.moduleProgress;
    if (state.srsCards) merged.srsCards = state.srsCards;
    if (state.achievements) merged.achievements = state.achievements;
    if (state.oathProgress) Object.assign(merged.oathProgress, state.oathProgress);
    if (state.dailyLog) merged.dailyLog = state.dailyLog;
    merged.version = DEFAULT_STATE.version;
    return merged;
  }

  #persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#state));
    } catch (e) {
      console.error('Failed to persist state:', e);
    }
  }

  #notify() {
    const state = this.getState();
    this.#listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error('Listener error:', e); }
    });
  }
}

export const store = new Store();
