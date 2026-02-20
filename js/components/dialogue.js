import { t, tr, loadJSON, compareRomanianAnswer } from '../services/utils.js';
import { speak } from '../services/audio.js';
import { awardXP, logStudyActivity, updateStreak, checkAchievements } from '../services/gamification.js';
import { createMicButton } from '../services/stt.js';

export function Dialogue(container, store, router, dialogueId) {
  let dialogueData = null;
  let currentTurn = 0;
  let messages = [];
  let score = 0;
  let totalPlayerTurns = 0;
  let answered = false;

  loadDialogue();

  async function loadDialogue() {
    const data = await loadJSON(`./data/dialogues/${dialogueId}.json`);
    if (data) {
      dialogueData = data;
    }

    if (!dialogueData) {
      const view = document.createElement('div');
      view.className = 'view';
      view.textContent = 'Dialogue not found.';
      container.textContent = '';
      container.appendChild(view);
      return;
    }

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = tr(dialogueData.title);

    renderDialogue();
  }

  function renderDialogue() {
    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Context box
    const ctx = document.createElement('div');
    ctx.className = 'dialogue-context';
    ctx.textContent = tr(dialogueData.context);
    view.appendChild(ctx);

    // Messages container
    const msgContainer = document.createElement('div');
    msgContainer.className = 'dialogue-messages';
    msgContainer.id = 'dialogue-messages';
    view.appendChild(msgContainer);

    // Options container
    const optContainer = document.createElement('div');
    optContainer.id = 'dialogue-options';
    view.appendChild(optContainer);

    container.textContent = '';
    container.appendChild(view);

    showNextTurn();
  }

  function showNextTurn() {
    if (currentTurn >= dialogueData.turns.length) {
      showResult();
      return;
    }

    const turn = dialogueData.turns[currentTurn];
    const msgContainer = document.getElementById('dialogue-messages');
    const optContainer = document.getElementById('dialogue-options');

    if (turn.speaker === 'you') {
      // Player's turn — show translation prompt + input field
      totalPlayerTurns++;
      answered = false;
      optContainer.textContent = '';

      const excellentOpt = turn.options.find(o => o.quality === 'excellent') || turn.options[0];

      // Prompt box: what to say in Ukrainian/English
      const promptBox = document.createElement('div');
      promptBox.className = 'translate-prompt';

      const promptLabel = document.createElement('div');
      promptLabel.className = 'prompt-label';
      promptLabel.textContent = t('dialogue.say_this');
      promptBox.appendChild(promptLabel);

      const promptText = document.createElement('div');
      promptText.className = 'prompt-text';
      promptText.textContent = tr(turn.prompt);
      promptBox.appendChild(promptText);

      optContainer.appendChild(promptBox);

      // Input row: text field + mic + check button
      const inputRow = document.createElement('div');
      inputRow.style.display = 'flex';
      inputRow.style.gap = '8px';
      inputRow.style.marginTop = '12px';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input';
      input.placeholder = t('dialogue.type_romanian');
      input.style.flex = '1';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      inputRow.appendChild(input);

      const micBtn = createMicButton(input, 'ro-RO', { mode: 'replace' });
      if (micBtn) inputRow.appendChild(micBtn);

      const checkBtn = document.createElement('button');
      checkBtn.className = 'btn btn-primary';
      checkBtn.textContent = t('quiz.check');
      inputRow.appendChild(checkBtn);

      optContainer.appendChild(inputRow);

      // Feedback area
      const feedbackArea = document.createElement('div');
      feedbackArea.id = 'dialogue-feedback-area';
      optContainer.appendChild(feedbackArea);

      function handleCheck() {
        if (answered) return;
        const userText = input.value.trim();
        if (!userText) return;
        answered = true;
        input.disabled = true;
        checkBtn.disabled = true;
        if (micBtn) micBtn.disabled = true;

        handleTranslationAnswer(userText, turn, feedbackArea);
      }

      checkBtn.addEventListener('click', handleCheck);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCheck();
      });

      // Focus input
      input.focus();

    } else {
      // NPC turn — show message bubble
      const bubble = createBubble(turn.speaker, turn.text.ro, tr(turn.translation), dialogueData.characters.find(c => c.id === turn.speaker)?.name || 'NPC');
      msgContainer.appendChild(bubble);

      // Auto-speak Romanian text
      speak(turn.text.ro);

      currentTurn++;
      setTimeout(() => showNextTurn(), 500);
    }
  }

  function handleTranslationAnswer(userText, turn, feedbackArea) {
    const msgContainer = document.getElementById('dialogue-messages');
    const optContainer = document.getElementById('dialogue-options');

    const excellentOpt = turn.options.find(o => o.quality === 'excellent') || turn.options[0];
    const acceptableOpt = turn.options.find(o => o.quality === 'acceptable');

    // Compare user answer with the expected excellent answer
    const result = compareRomanianAnswer(userText, excellentOpt.text);

    // Show player's bubble with their actual text
    const bubble = createBubble('you', userText, '', 'You');
    msgContainer.appendChild(bubble);

    // Map percentage to score (0-3)
    if (result.percentage >= 80) score += 3;
    else if (result.percentage >= 50) score += 2;
    else score += 1;

    // Show word diff (your answer colored)
    const diffLabel = document.createElement('div');
    diffLabel.style.fontSize = '0.8125rem';
    diffLabel.style.color = 'var(--color-text-secondary)';
    diffLabel.style.marginTop = '12px';
    diffLabel.style.fontWeight = '600';
    diffLabel.textContent = `${t('dialogue.your_turn')} ${result.percentage}%`;
    feedbackArea.appendChild(diffLabel);
    feedbackArea.appendChild(result.diffElement);

    // Show expected correct answer
    const expectedBox = document.createElement('div');
    expectedBox.className = 'expected-answer-box';

    const expectedLabel = document.createElement('div');
    expectedLabel.className = 'expected-label';
    expectedLabel.textContent = t('dialogue.expected');
    expectedBox.appendChild(expectedLabel);

    const expectedText = document.createElement('div');
    expectedText.className = 'expected-text';
    expectedText.textContent = excellentOpt.text;
    expectedBox.appendChild(expectedText);

    feedbackArea.appendChild(expectedBox);

    // Show feedback from the excellent option
    const feedback = document.createElement('div');
    feedback.className = 'dialogue-feedback';
    const feedColor = result.percentage >= 80 ? 'success' : result.percentage >= 50 ? 'warning' : 'error';
    feedback.style.background = `var(--color-${feedColor}-light)`;
    feedback.style.color = `var(--color-${feedColor})`;
    feedback.style.padding = '12px';
    feedback.style.borderRadius = '8px';
    feedback.style.marginTop = '8px';
    feedback.style.fontSize = '0.8125rem';
    feedback.textContent = tr(excellentOpt.feedback);
    feedbackArea.appendChild(feedback);

    // Show also acceptable answer
    if (acceptableOpt) {
      const alsoBox = document.createElement('div');
      alsoBox.className = 'also-acceptable';
      const alsoLabel = document.createElement('div');
      alsoLabel.className = 'acceptable-label';
      alsoLabel.textContent = t('dialogue.also_acceptable');
      alsoBox.appendChild(alsoLabel);
      const alsoText = document.createElement('div');
      alsoText.textContent = acceptableOpt.text;
      alsoBox.appendChild(alsoText);
      feedbackArea.appendChild(alsoBox);
    }

    // Listen button for expected answer
    const listenBtn = document.createElement('button');
    listenBtn.className = 'speak-btn mt-8';
    listenBtn.style.display = 'inline-flex';
    listenBtn.style.alignItems = 'center';
    listenBtn.style.gap = '4px';
    listenBtn.style.padding = '6px 12px';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', '11 5 6 9 2 9 2 15 6 15 11 19 11 5');
    svg.appendChild(poly);
    const path1 = document.createElementNS(svgNS, 'path');
    path1.setAttribute('d', 'M19.07 4.93a10 10 0 010 14.14');
    svg.appendChild(path1);
    const path2 = document.createElementNS(svgNS, 'path');
    path2.setAttribute('d', 'M15.54 8.46a5 5 0 010 7.07');
    svg.appendChild(path2);
    listenBtn.appendChild(svg);

    const listenText = document.createTextNode(tr({ en: ' Listen', uk: ' Прослухати' }));
    listenBtn.appendChild(listenText);
    listenBtn.addEventListener('click', () => speak(excellentOpt.text));
    feedbackArea.appendChild(listenBtn);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary btn-block mt-12';
    nextBtn.textContent = t('common.next');
    nextBtn.addEventListener('click', () => {
      currentTurn++;
      optContainer.textContent = '';
      showNextTurn();
    });
    feedbackArea.appendChild(nextBtn);

    // Scroll to bottom
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function createBubble(speaker, text, translation, name) {
    const bubble = document.createElement('div');
    bubble.className = `dialogue-bubble ${speaker === 'you' ? 'player' : 'official'} fade-in`;

    const nameEl = document.createElement('div');
    nameEl.className = 'dialogue-bubble-name';
    nameEl.textContent = name;
    bubble.appendChild(nameEl);

    const textEl = document.createElement('div');
    textEl.className = 'dialogue-bubble-text';
    textEl.textContent = text;
    bubble.appendChild(textEl);

    if (translation) {
      const transEl = document.createElement('div');
      transEl.className = 'dialogue-bubble-translation';
      transEl.textContent = translation;
      bubble.appendChild(transEl);
    }

    return bubble;
  }

  function showResult() {
    const optContainer = document.getElementById('dialogue-options');
    if (!optContainer) return;
    optContainer.textContent = '';

    const maxScore = totalPlayerTurns * 3;
    const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;

    const xp = awardXP('dialogueComplete');
    logStudyActivity('lesson', 1);
    updateStreak();
    checkAchievements();

    const result = document.createElement('div');
    result.className = 'session-summary mt-20';

    const h2 = document.createElement('h2');
    h2.textContent = pct >= 80 ? tr({ en: 'Excellent!', uk: 'Чудово!' }) : pct >= 50 ? tr({ en: 'Good job!', uk: 'Непогано!' }) : tr({ en: 'Keep practicing!', uk: 'Практикуйте далі!' });
    result.appendChild(h2);

    const emoji = document.createElement('div');
    emoji.style.fontSize = '3rem';
    emoji.style.margin = '12px 0';
    emoji.textContent = pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪';
    result.appendChild(emoji);

    const scoreText = document.createElement('div');
    scoreText.style.fontSize = '1.25rem';
    scoreText.style.fontWeight = '700';
    scoreText.textContent = `${t('common.score')}: ${pct}%`;
    result.appendChild(scoreText);

    const xpText = document.createElement('div');
    xpText.style.color = 'var(--color-secondary)';
    xpText.style.fontWeight = '600';
    xpText.style.marginTop = '8px';
    xpText.textContent = `+${xp} ${t('common.xp')}`;
    result.appendChild(xpText);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-8 justify-center mt-20';

    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn btn-secondary';
    homeBtn.textContent = tr({ en: 'Home', uk: 'Головна' });
    homeBtn.addEventListener('click', () => { location.hash = '#/'; });
    btnRow.appendChild(homeBtn);

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary';
    retryBtn.textContent = tr({ en: 'Try again', uk: 'Спробувати знову' });
    retryBtn.addEventListener('click', () => {
      currentTurn = 0;
      messages = [];
      score = 0;
      totalPlayerTurns = 0;
      answered = false;
      renderDialogue();
    });
    btnRow.appendChild(retryBtn);

    result.appendChild(btnRow);
    optContainer.appendChild(result);
  }
}
