import { t, tr, loadJSON, shuffle } from '../services/utils.js';
import { speak } from '../services/audio.js';
import { awardXP, logStudyActivity, updateStreak, checkAchievements } from '../services/gamification.js';
import { store } from '../store.js';
import { createMicButton } from '../services/stt.js';

export function OathTrainer(container, storeRef, router) {
  let oathData = null;
  let activeTab = 'learn';

  loadData();

  async function loadData() {
    oathData = await loadJSON('./data/oath.json');
    if (!oathData) {
      container.textContent = 'Failed to load oath data.';
      return;
    }
    renderView();
  }

  function renderView() {
    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'oath-tabs';
    const tabDefs = [
      { id: 'learn', label: t('oath.learn') },
      { id: 'build', label: t('oath.build') },
      { id: 'recite', label: t('oath.recite') }
    ];
    for (const td of tabDefs) {
      const btn = document.createElement('button');
      btn.className = `oath-tab ${td.id === activeTab ? 'active' : ''}`;
      btn.textContent = td.label;
      btn.addEventListener('click', () => {
        activeTab = td.id;
        renderView();
      });
      tabs.appendChild(btn);
    }
    view.appendChild(tabs);

    // Full text display
    const fullText = document.createElement('div');
    fullText.className = 'oath-full-text';
    fullText.textContent = oathData.fullText;
    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn mt-8';
    speakBtn.textContent = '🔊 ' + tr({ en: 'Listen', uk: 'Прослухати' });
    speakBtn.style.display = 'block';
    speakBtn.addEventListener('click', () => speak(oathData.fullText));
    fullText.appendChild(speakBtn);
    view.appendChild(fullText);

    // Tab content
    const content = document.createElement('div');
    content.id = 'oath-content';

    if (activeTab === 'learn') renderLearn(content);
    else if (activeTab === 'build') renderBuild(content);
    else if (activeTab === 'recite') renderRecite(content);

    view.appendChild(content);

    container.textContent = '';
    container.appendChild(view);
  }

  function renderLearn(content) {
    const state = storeRef.getState();
    const lang = state.settings.primaryLanguage;

    for (let i = 0; i < oathData.segments.length; i++) {
      const seg = oathData.segments[i];
      const mastered = state.oathProgress.segmentsMastered?.includes(i);

      const card = document.createElement('div');
      card.className = 'oath-segment';
      if (mastered) card.style.borderLeft = '4px solid var(--color-success)';

      const roText = document.createElement('div');
      roText.className = 'oath-segment-ro';
      roText.textContent = seg.ro;

      const segSpeakBtn = document.createElement('button');
      segSpeakBtn.className = 'speak-btn';
      segSpeakBtn.setAttribute('aria-label', 'Listen');
      segSpeakBtn.textContent = '🔊';
      segSpeakBtn.addEventListener('click', () => speak(seg.ro));
      roText.appendChild(segSpeakBtn);
      card.appendChild(roText);

      const trans = document.createElement('div');
      trans.className = 'oath-segment-translation';
      trans.textContent = lang === 'uk' ? seg.uk : seg.en;
      card.appendChild(trans);

      if (seg.pronunciation) {
        const pron = document.createElement('div');
        pron.className = 'oath-segment-pronunciation';
        pron.textContent = seg.pronunciation;
        card.appendChild(pron);
      }

      if (seg.grammar) {
        const gram = document.createElement('div');
        gram.className = 'oath-segment-grammar';
        gram.textContent = tr(seg.grammar);
        card.appendChild(gram);
      }

      // Mark mastered button
      if (!mastered) {
        const markBtn = document.createElement('button');
        markBtn.className = 'btn btn-sm btn-success mt-8';
        markBtn.textContent = tr({ en: 'Mark as learned', uk: 'Позначити як вивчено' });
        markBtn.addEventListener('click', () => {
          const current = storeRef.get('oathProgress.segmentsMastered') || [];
          if (!current.includes(i)) {
            storeRef.update('oathProgress.segmentsMastered', [...current, i]);
            awardXP('oathSegment');
            updateStreak();
            checkAchievements();
            renderView();
          }
        });
        card.appendChild(markBtn);
      }

      content.appendChild(card);
    }

    // Anthem section
    if (oathData.anthem) {
      const anthemTitle = document.createElement('div');
      anthemTitle.className = 'section-title mt-24';
      anthemTitle.textContent = tr(oathData.anthem.title);
      content.appendChild(anthemTitle);

      const anthemInfo = document.createElement('div');
      anthemInfo.className = 'text-secondary mb-12';
      anthemInfo.style.fontSize = '0.8125rem';
      anthemInfo.textContent = `${oathData.anthem.lyricist} / ${oathData.anthem.composer} (${oathData.anthem.year})`;
      content.appendChild(anthemInfo);

      for (const stanza of oathData.anthem.stanzas) {
        const card = document.createElement('div');
        card.className = 'oath-segment';

        const roText = document.createElement('div');
        roText.className = 'oath-segment-ro';
        roText.style.fontSize = '1rem';
        roText.style.whiteSpace = 'pre-line';
        roText.textContent = stanza.ro;
        card.appendChild(roText);

        const trans = document.createElement('div');
        trans.className = 'oath-segment-translation mt-8';
        trans.style.whiteSpace = 'pre-line';
        const lang = storeRef.get('settings.primaryLanguage');
        trans.textContent = lang === 'uk' ? stanza.uk : stanza.en;
        card.appendChild(trans);

        content.appendChild(card);
      }
    }
  }

  function renderBuild(content) {
    const words = oathData.fullText.replace(/[.,]/g, '').split(/\s+/);
    const shuffled = shuffle([...words]);
    let placed = [];

    const instructions = document.createElement('p');
    instructions.className = 'text-secondary mb-12';
    instructions.style.textAlign = 'center';
    instructions.textContent = tr({ en: 'Tap words in the correct order to build the oath', uk: 'Натискайте слова у правильному порядку, щоб скласти присягу' });
    content.appendChild(instructions);

    // Target area
    const target = document.createElement('div');
    target.className = 'oath-build-target';
    target.id = 'oath-target';
    content.appendChild(target);

    // Word bank
    const bank = document.createElement('div');
    bank.className = 'oath-word-bank';
    bank.id = 'oath-bank';

    for (let i = 0; i < shuffled.length; i++) {
      const wordBtn = document.createElement('button');
      wordBtn.className = 'oath-word';
      wordBtn.textContent = shuffled[i];
      wordBtn.dataset.index = String(i);
      wordBtn.addEventListener('click', () => {
        if (wordBtn.classList.contains('placed')) return;
        placed.push({ word: shuffled[i], btnIndex: i });
        wordBtn.classList.add('placed');

        const placedWord = document.createElement('span');
        placedWord.className = 'oath-word in-target';
        placedWord.textContent = shuffled[i];
        placedWord.addEventListener('click', () => {
          // Remove from placed
          placed = placed.filter(p => p.btnIndex !== i);
          wordBtn.classList.remove('placed');
          placedWord.remove();
        });
        target.appendChild(placedWord);

        // Check if complete
        if (placed.length === words.length) {
          checkBuild(words, placed, target);
        }
      });
      bank.appendChild(wordBtn);
    }
    content.appendChild(bank);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-secondary btn-block mt-16';
    resetBtn.textContent = tr({ en: 'Reset', uk: 'Скинути' });
    resetBtn.addEventListener('click', () => {
      placed = [];
      renderView();
    });
    content.appendChild(resetBtn);
  }

  function checkBuild(words, placed, target) {
    const placedWords = placed.map(p => p.word);
    let correct = 0;
    for (let i = 0; i < words.length; i++) {
      if (placedWords[i] === words[i]) correct++;
    }
    const pct = Math.round(correct / words.length * 100);

    // Color placed words
    const placedEls = target.querySelectorAll('.oath-word');
    placedEls.forEach((el, i) => {
      if (placedWords[i] === words[i]) {
        el.classList.add('correct');
        el.classList.remove('in-target');
      } else {
        el.classList.add('incorrect');
        el.classList.remove('in-target');
      }
    });

    const oathContent = document.getElementById('oath-content');
    const result = document.createElement('div');
    result.className = 'quiz-feedback mt-12';
    result.classList.add(pct >= 80 ? 'correct' : 'incorrect');
    result.textContent = `${t('common.score')}: ${pct}%`;
    oathContent.appendChild(result);

    if (pct >= 80) {
      awardXP('oathSegment');
      updateStreak();
    }
  }

  function renderRecite(content) {
    const instructions = document.createElement('p');
    instructions.className = 'text-secondary mb-12';
    instructions.style.textAlign = 'center';
    instructions.textContent = tr({ en: 'Type the oath text from memory', uk: 'Напишіть текст присяги напам\'ять' });
    content.appendChild(instructions);

    const textareaWrapper = document.createElement('div');
    textareaWrapper.className = 'textarea-mic-wrapper';
    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.placeholder = t('oath.your_text');
    textarea.rows = 5;
    textareaWrapper.appendChild(textarea);
    const micBtn = createMicButton(textarea, 'ro-RO', { mode: 'append' });
    if (micBtn) textareaWrapper.appendChild(micBtn);
    content.appendChild(textareaWrapper);

    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn btn-primary btn-block mt-12';
    checkBtn.textContent = t('oath.check_recitation');
    checkBtn.addEventListener('click', () => {
      const userText = textarea.value.trim();
      if (!userText) return;
      checkRecitation(userText, content);
    });
    content.appendChild(checkBtn);
  }

  function checkRecitation(userText, content) {
    const original = oathData.fullText.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
    const user = userText.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

    const origWords = original.split(' ');
    const userWords = user.split(' ');

    let correct = 0;
    const maxLen = Math.max(origWords.length, userWords.length);

    const diffDiv = document.createElement('div');
    diffDiv.className = 'oath-diff mt-16';

    for (let i = 0; i < maxLen; i++) {
      const span = document.createElement('span');
      if (i < origWords.length && i < userWords.length) {
        if (origWords[i] === userWords[i]) {
          span.className = 'oath-diff-correct';
          span.textContent = origWords[i];
          correct++;
        } else {
          span.className = 'oath-diff-incorrect';
          span.textContent = userWords[i];
          const expected = document.createElement('span');
          expected.className = 'oath-diff-missing';
          expected.textContent = ` [${origWords[i]}]`;
          span.appendChild(expected);
        }
      } else if (i < origWords.length) {
        span.className = 'oath-diff-missing';
        span.textContent = origWords[i];
      }

      diffDiv.appendChild(span);
      diffDiv.appendChild(document.createTextNode(' '));
    }

    const pct = Math.round(correct / origWords.length * 100);

    // Remove old results
    const oldResult = content.querySelector('.oath-diff');
    if (oldResult) oldResult.remove();
    const oldFeedback = content.querySelector('.quiz-feedback');
    if (oldFeedback) oldFeedback.remove();

    content.appendChild(diffDiv);

    const feedback = document.createElement('div');
    feedback.className = `quiz-feedback mt-12 ${pct >= 80 ? 'correct' : 'incorrect'}`;
    feedback.textContent = `${t('common.score')}: ${pct}%`;
    content.appendChild(feedback);

    // Update oath progress
    const currentBest = storeRef.get('oathProgress.bestScore') || 0;
    const attempts = (storeRef.get('oathProgress.fullRecitationAttempts') || 0) + 1;
    storeRef.update('oathProgress.fullRecitationAttempts', attempts);
    if (pct > currentBest) {
      storeRef.update('oathProgress.bestScore', pct);
    }

    if (pct >= 80) {
      awardXP('oathFull');
      updateStreak();
      checkAchievements();
    }
  }
}
