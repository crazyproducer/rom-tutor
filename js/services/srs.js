import { today } from './utils.js';

/**
 * SM-2 Spaced Repetition Algorithm
 * Quality ratings: 0-5
 * UI mapping: Again=0, Hard=2, Good=4, Easy=5
 */

export function calculateSRS(card, quality) {
  let { interval = 0, repetitions = 0, easeFactor = 2.5 } = card;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const todayDate = new Date(today());
  todayDate.setDate(todayDate.getDate() + interval);
  const nextReview = todayDate.toISOString().split('T')[0];

  return {
    interval,
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReview,
    lastReview: today(),
    quality
  };
}

export function isDue(card) {
  if (!card.nextReview) return true;
  return card.nextReview <= today();
}

export function getDueCards(srsCards) {
  return Object.entries(srsCards)
    .filter(([_, card]) => isDue(card))
    .sort((a, b) => {
      const aOverdue = daysOverdue(a[1]);
      const bOverdue = daysOverdue(b[1]);
      return bOverdue - aOverdue;
    })
    .map(([id, card]) => ({ id, ...card }));
}

function daysOverdue(card) {
  if (!card.nextReview) return 999;
  const due = new Date(card.nextReview);
  const now = new Date(today());
  return Math.max(0, (now - due) / (1000 * 60 * 60 * 24));
}

export function initCard(wordId) {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    nextReview: today(),
    lastReview: null,
    quality: null
  };
}

export function getCardStats(srsCards) {
  const cards = Object.values(srsCards);
  const due = cards.filter(c => isDue(c)).length;
  const learning = cards.filter(c => c.interval > 0 && c.interval < 7).length;
  const mature = cards.filter(c => c.interval >= 7).length;
  const newCards = cards.filter(c => c.repetitions === 0).length;
  return { total: cards.length, due, learning, mature, new: newCards };
}
