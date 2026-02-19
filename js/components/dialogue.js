import { t, tr, loadJSON } from '../services/utils.js';
import { speak } from '../services/audio.js';
import { awardXP, logStudyActivity, updateStreak, checkAchievements } from '../services/gamification.js';

export function Dialogue(container, store, router, dialogueId) {
  let dialogueData = null;
  let currentTurn = 0;
  let messages = []; // rendered messages
  let score = 0;
  let totalPlayerTurns = 0;
  let answered = false;

  loadDialogue();

  async function loadDialogue() {
    // Try loading dialogue file directly by dialogueId (filename without .json)
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

    // Start the dialogue
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
      // Player's turn - show options
      totalPlayerTurns++;
      answered = false;
      optContainer.textContent = '';

      const label = document.createElement('div');
      label.className = 'dialogue-option-label';
      label.textContent = tr(turn.prompt);
      optContainer.appendChild(label);

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'dialogue-options';

      for (const opt of turn.options) {
        const optBtn = document.createElement('button');
        optBtn.className = 'dialogue-option';
        optBtn.textContent = opt.text;
        optBtn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          handlePlayerChoice(opt, turn, optionsDiv);
        });
        optionsDiv.appendChild(optBtn);
      }

      optContainer.appendChild(optionsDiv);
    } else {
      // NPC turn - show message bubble
      const bubble = createBubble(turn.speaker, turn.text.ro, tr(turn.translation), dialogueData.characters.find(c => c.id === turn.speaker)?.name || 'NPC');
      msgContainer.appendChild(bubble);

      // Auto-speak Romanian text
      speak(turn.text.ro);

      currentTurn++;
      // Small delay before showing next turn
      setTimeout(() => showNextTurn(), 500);
    }
  }

  function handlePlayerChoice(option, turn, optionsDiv) {
    const msgContainer = document.getElementById('dialogue-messages');
    const optContainer = document.getElementById('dialogue-options');

    // Show player's message
    const bubble = createBubble('you', option.text, '', 'You');
    msgContainer.appendChild(bubble);

    // Show quality feedback
    if (option.quality === 'excellent') score += 3;
    else if (option.quality === 'acceptable') score += 2;
    else score += 1;

    // Color all options based on quality
    const allOpts = optionsDiv.querySelectorAll('.dialogue-option');
    allOpts.forEach(btn => {
      const opt = turn.options.find(o => o.text === btn.textContent);
      if (opt) btn.classList.add(opt.quality);
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
    });

    // Show feedback
    const feedback = document.createElement('div');
    feedback.className = 'dialogue-feedback';
    feedback.style.background = option.quality === 'excellent' ? 'var(--color-success-light)' :
                                 option.quality === 'acceptable' ? 'var(--color-warning-light)' : 'var(--color-error-light)';
    feedback.style.color = option.quality === 'excellent' ? 'var(--color-success)' :
                           option.quality === 'acceptable' ? 'var(--color-warning)' : 'var(--color-error)';
    feedback.style.padding = '12px';
    feedback.style.borderRadius = '8px';
    feedback.style.marginTop = '8px';
    feedback.style.fontSize = '0.8125rem';
    feedback.textContent = tr(option.feedback);
    optContainer.appendChild(feedback);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary btn-block mt-12';
    nextBtn.textContent = t('common.next');
    nextBtn.addEventListener('click', () => {
      currentTurn++;
      optContainer.textContent = '';
      showNextTurn();
    });
    optContainer.appendChild(nextBtn);

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
