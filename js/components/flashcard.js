import { t, tr, loadJSON, shuffle } from '../services/utils.js';
import { calculateSRS, getDueCards, initCard } from '../services/srs.js';
import { awardXP, logStudyActivity, checkAchievements, updateStreak } from '../services/gamification.js';
import { speak } from '../services/audio.js';
import { store } from '../store.js';

function createSpeakIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  const poly = document.createElementNS(svgNS, 'polygon');
  poly.setAttribute('points', '11 5 6 9 2 9 2 15 6 15 11 19 11 5');
  svg.appendChild(poly);
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M15.54 8.46a5 5 0 010 7.07');
  svg.appendChild(path);
  return svg;
}

export function Flashcard(container, storeRef, router, moduleId) {
  let cards = [];
  let currentIndex = 0;
  let isFlipped = false;
  let sessionStats = { reviewed: 0, correct: 0, xpEarned: 0 };

  loadCards().then(() => {
    if (cards.length > 0) {
      renderCard();
    } else {
      renderEmpty();
    }
  });

  async function loadCards() {
    if (moduleId) {
      const modules = await loadJSON('./data/modules.json');
      let vocabFile = null;
      if (modules) {
        for (const phase of modules.phases) {
          const mod = phase.modules.find(m => m.id === moduleId);
          if (mod?.vocabularyFile) { vocabFile = mod.vocabularyFile; break; }
        }
      }
      if (vocabFile) {
        const vocab = await loadJSON(`./data/vocabulary/${vocabFile}`);
        if (vocab?.words) {
          const state = storeRef.getState();
          cards = vocab.words.map(w => {
            const srsData = state.srsCards[w.id] || initCard(w.id);
            return { ...w, srs: srsData };
          });
          cards.sort((a, b) => {
            const aNew = a.srs.repetitions === 0 ? 0 : 1;
            const bNew = b.srs.repetitions === 0 ? 0 : 1;
            if (aNew !== bNew) return aNew - bNew;
            return (a.srs.nextReview || '').localeCompare(b.srs.nextReview || '');
          });
          cards = cards.slice(0, 20);
        }
      }
      const headerTitle = document.getElementById('header-title');
      if (headerTitle) headerTitle.textContent = tr({ en: 'Flashcards', uk: 'Картки' });
    } else {
      const state = storeRef.getState();
      const dueCards = getDueCards(state.srsCards);
      if (dueCards.length === 0) { cards = []; return; }

      const modules = await loadJSON('./data/modules.json');
      const allWords = {};
      if (modules) {
        for (const phase of modules.phases) {
          for (const mod of phase.modules) {
            if (mod.vocabularyFile && !mod.comingSoon) {
              const vocab = await loadJSON(`./data/vocabulary/${mod.vocabularyFile}`);
              if (vocab?.words) {
                for (const w of vocab.words) allWords[w.id] = w;
              }
            }
          }
        }
      }
      cards = dueCards.filter(dc => allWords[dc.id]).map(dc => ({ ...allWords[dc.id], srs: dc })).slice(0, 20);
    }
  }

  function renderCard() {
    const card = cards[currentIndex];
    if (!card) { renderSummary(); return; }

    const state = storeRef.getState();
    const lang = state.settings.primaryLanguage;
    const showPron = state.settings.showPronunciation;

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const progress = document.createElement('div');
    progress.className = 'flashcard-progress';
    progress.textContent = `${currentIndex + 1} ${t('flashcard.of')} ${cards.length}`;
    view.appendChild(progress);

    const bar = document.createElement('div');
    bar.className = 'progress-bar mb-16';
    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill';
    fill.style.width = `${(currentIndex / cards.length) * 100}%`;
    bar.appendChild(fill);
    view.appendChild(bar);

    const fc = document.createElement('div');
    fc.className = 'flashcard-container';

    const wrapper = document.createElement('div');
    wrapper.className = 'flashcard-wrapper';

    const inner = document.createElement('div');
    inner.className = `flashcard-inner ${isFlipped ? 'flipped' : ''}`;

    // Front side
    const front = document.createElement('div');
    front.className = 'flashcard-front';

    const word = document.createElement('div');
    word.className = 'flashcard-word';
    word.textContent = card.ro;
    front.appendChild(word);

    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.setAttribute('aria-label', 'Listen');
    speakBtn.addEventListener('click', (e) => { e.stopPropagation(); speak(card.ro); });
    speakBtn.appendChild(createSpeakIcon());
    front.appendChild(speakBtn);

    if (showPron && card.pronunciation) {
      const pron = document.createElement('div');
      pron.className = 'flashcard-pronunciation';
      pron.textContent = card.pronunciation;
      front.appendChild(pron);
    }

    if (card.partOfSpeech) {
      const pos = document.createElement('div');
      pos.className = 'flashcard-part-of-speech';
      pos.textContent = card.partOfSpeech;
      front.appendChild(pos);
    }

    const hint = document.createElement('div');
    hint.className = 'flashcard-hint';
    hint.textContent = t('flashcard.flip');
    front.appendChild(hint);
    inner.appendChild(front);

    // Back side
    const back = document.createElement('div');
    back.className = 'flashcard-back';

    const roBack = document.createElement('div');
    roBack.className = 'flashcard-word';
    roBack.style.fontSize = '1.25rem';
    roBack.textContent = card.ro;
    back.appendChild(roBack);

    const trans1 = document.createElement('div');
    trans1.className = 'flashcard-translation';
    trans1.textContent = lang === 'uk' ? (card.uk || card.en) : (card.en || card.uk);
    back.appendChild(trans1);

    const trans2 = document.createElement('div');
    trans2.className = 'flashcard-translation-secondary';
    trans2.textContent = lang === 'uk' ? (card.en || '') : (card.uk || '');
    back.appendChild(trans2);

    if (card.example) {
      const exDiv = document.createElement('div');
      exDiv.className = 'flashcard-example';
      const exRo = document.createElement('div');
      exRo.className = 'flashcard-example-ro';
      exRo.textContent = card.example.ro;
      exDiv.appendChild(exRo);
      const exTrans = document.createElement('div');
      exTrans.className = 'flashcard-example-translation';
      exTrans.textContent = lang === 'uk' ? (card.example.uk || card.example.en) : (card.example.en || card.example.uk);
      exDiv.appendChild(exTrans);
      back.appendChild(exDiv);
    }

    if (card.notes) {
      const note = document.createElement('div');
      note.className = 'mt-8';
      note.style.fontSize = '0.8125rem';
      note.style.color = 'var(--color-text-secondary)';
      note.textContent = tr(card.notes);
      back.appendChild(note);
    }

    inner.appendChild(back);
    wrapper.appendChild(inner);

    wrapper.addEventListener('click', () => {
      if (!isFlipped) {
        isFlipped = true;
        inner.classList.add('flipped');
        buttons.style.display = 'grid';
      }
    });

    fc.appendChild(wrapper);

    // Answer buttons
    const buttons = document.createElement('div');
    buttons.className = 'flashcard-buttons';
    buttons.style.display = isFlipped ? 'grid' : 'none';

    const qualities = [
      { label: t('flashcard.again'), cls: 'again', quality: 0 },
      { label: t('flashcard.hard'), cls: 'hard', quality: 2 },
      { label: t('flashcard.good'), cls: 'good', quality: 4 },
      { label: t('flashcard.easy'), cls: 'easy', quality: 5 }
    ];

    for (const q of qualities) {
      const btn = document.createElement('button');
      btn.className = `flashcard-btn ${q.cls}`;
      btn.textContent = q.label;
      btn.addEventListener('click', () => answerCard(q.quality));
      buttons.appendChild(btn);
    }

    fc.appendChild(buttons);
    view.appendChild(fc);

    container.textContent = '';
    container.appendChild(view);
  }

  function answerCard(quality) {
    const card = cards[currentIndex];
    const newSRS = calculateSRS(card.srs, quality);
    storeRef.update(`srsCards.${card.id}`, newSRS);

    sessionStats.reviewed++;
    if (quality >= 3) sessionStats.correct++;

    logStudyActivity('cards', 1);
    updateStreak();

    currentIndex++;
    isFlipped = false;

    if (currentIndex >= cards.length) {
      const xp = awardXP('flashcardSession');
      sessionStats.xpEarned += xp;
      checkAchievements();
      renderSummary();
    } else {
      renderCard();
    }
  }

  function renderSummary() {
    const view = document.createElement('div');
    view.className = 'view fade-in';
    const summary = document.createElement('div');
    summary.className = 'session-summary';

    const h2 = document.createElement('h2');
    h2.textContent = t('flashcard.session_complete');
    summary.appendChild(h2);

    const emoji = document.createElement('div');
    emoji.style.fontSize = '3rem';
    emoji.style.margin = '12px 0';
    const ratio = sessionStats.reviewed > 0 ? sessionStats.correct / sessionStats.reviewed : 0;
    emoji.textContent = ratio >= 0.8 ? '🎉' : ratio >= 0.5 ? '👍' : '💪';
    summary.appendChild(emoji);

    const stats = document.createElement('div');
    stats.className = 'session-summary-stats';
    stats.appendChild(createStat(String(sessionStats.reviewed), t('flashcard.cards_reviewed')));
    stats.appendChild(createStat(`${Math.round(ratio * 100)}%`, t('common.correct')));
    stats.appendChild(createStat(`+${sessionStats.xpEarned}`, t('common.xp')));
    summary.appendChild(stats);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-8 justify-center mt-20';
    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn btn-secondary';
    homeBtn.textContent = tr({ en: 'Home', uk: 'Головна' });
    homeBtn.addEventListener('click', () => { location.hash = '#/'; });
    btnRow.appendChild(homeBtn);

    if (moduleId) {
      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-primary';
      backBtn.textContent = tr({ en: 'Back to module', uk: 'До модуля' });
      backBtn.addEventListener('click', () => { location.hash = `#/lessons/${moduleId}`; });
      btnRow.appendChild(backBtn);
    }

    summary.appendChild(btnRow);
    view.appendChild(summary);
    container.textContent = '';
    container.appendChild(view);
  }

  function createStat(value, label) {
    const stat = document.createElement('div');
    stat.className = 'session-summary-stat';
    const val = document.createElement('div');
    val.className = 'session-summary-stat-value';
    val.textContent = value;
    stat.appendChild(val);
    const lab = document.createElement('div');
    lab.className = 'session-summary-stat-label';
    lab.textContent = label;
    stat.appendChild(lab);
    return stat;
  }

  function renderEmpty() {
    const view = document.createElement('div');
    view.className = 'view fade-in';
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '✨';
    empty.appendChild(icon);

    const h3 = document.createElement('h3');
    h3.textContent = t('common.well_done');
    empty.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = t('common.no_cards');
    empty.appendChild(p);

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = tr({ en: 'Go to lessons', uk: 'До уроків' });
    btn.addEventListener('click', () => { location.hash = '#/lessons'; });
    empty.appendChild(btn);

    view.appendChild(empty);
    container.textContent = '';
    container.appendChild(view);
  }
}
