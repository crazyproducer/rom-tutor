import { t, tr, loadJSON, shuffle } from '../services/utils.js';
import { speak } from '../services/audio.js';
import { awardXP, logStudyActivity, updateStreak, checkAchievements } from '../services/gamification.js';
import { createMicButton } from '../services/stt.js';

export function CeremonySim(container, store, router) {
  let started = false;
  let oathData = null;
  let ceremonyQuestions = null;
  let dialogueData = null;
  let currentPhase = 'intro'; // intro, oath, qa, result
  let qaIndex = 0;
  let qaQuestions = [];
  let score = 0;
  let totalQuestions = 0;
  let startTime = null;

  loadAll();

  async function loadAll() {
    oathData = await loadJSON('./data/oath.json');
    ceremonyQuestions = await loadJSON('./data/vocabulary/16-ceremony-qa.json');
    dialogueData = await loadJSON('./data/dialogues/08-ceremony-interview.json');

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = t('ceremony.title');

    renderIntro();
  }

  function renderIntro() {
    const view = document.createElement('div');
    view.className = 'view fade-in';

    const intro = document.createElement('div');
    intro.className = 'ceremony-intro';

    const icon = document.createElement('div');
    icon.style.fontSize = '4rem';
    icon.style.marginBottom = '16px';
    icon.textContent = '🏛️';
    intro.appendChild(icon);

    const h2 = document.createElement('h2');
    h2.textContent = t('ceremony.title');
    intro.appendChild(h2);

    const desc = document.createElement('p');
    desc.textContent = tr({
      en: 'This simulation recreates the oath ceremony experience. You will:\n1. Recite the oath of allegiance\n2. Answer questions from the official\n\nTake your time and answer in complete Romanian sentences.',
      uk: 'Ця симуляція відтворює досвід церемонії присяги. Вам потрібно:\n1. Прочитати присягу на вірність\n2. Відповісти на запитання офіціала\n\nНе поспішайте і відповідайте повними реченнями румунською.'
    });
    desc.style.whiteSpace = 'pre-line';
    intro.appendChild(desc);

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary btn-lg mt-20';
    startBtn.textContent = t('ceremony.start');
    startBtn.addEventListener('click', () => {
      started = true;
      startTime = Date.now();
      currentPhase = 'oath';
      renderOathPhase();
    });
    intro.appendChild(startBtn);

    view.appendChild(intro);
    container.textContent = '';
    container.appendChild(view);
  }

  function renderOathPhase() {
    const view = document.createElement('div');
    view.className = 'view fade-in';

    const timer = document.createElement('div');
    timer.className = 'ceremony-timer';
    timer.textContent = tr({ en: 'Ceremony in progress...', uk: 'Церемонія триває...' });
    view.appendChild(timer);

    // Official asks to recite oath
    const officialBubble = document.createElement('div');
    officialBubble.className = 'dialogue-bubble official';
    const name = document.createElement('div');
    name.className = 'dialogue-bubble-name';
    name.textContent = 'Oficial ANC';
    officialBubble.appendChild(name);
    const text = document.createElement('div');
    text.className = 'dialogue-bubble-text';
    text.textContent = 'Bună ziua. Vă rog să depuneți jurământul de credință.';
    officialBubble.appendChild(text);
    const trans = document.createElement('div');
    trans.className = 'dialogue-bubble-translation';
    trans.textContent = tr({
      en: 'Good day. Please take the oath of allegiance.',
      uk: 'Добрий день. Будь ласка, складіть присягу на вірність.'
    });
    officialBubble.appendChild(trans);
    view.appendChild(officialBubble);

    speak('Bună ziua. Vă rog să depuneți jurământul de credință.');

    // Oath text area
    const oathLabel = document.createElement('p');
    oathLabel.className = 'text-secondary mt-16 mb-8';
    oathLabel.textContent = tr({ en: 'Type the oath from memory:', uk: 'Напишіть присягу напам\'ять:' });
    view.appendChild(oathLabel);

    const textareaWrapper = document.createElement('div');
    textareaWrapper.className = 'textarea-mic-wrapper';
    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.placeholder = t('oath.your_text');
    textarea.rows = 4;
    textareaWrapper.appendChild(textarea);
    const micBtn = createMicButton(textarea, 'ro-RO', { mode: 'append' });
    if (micBtn) textareaWrapper.appendChild(micBtn);
    view.appendChild(textareaWrapper);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary btn-block mt-12';
    submitBtn.textContent = t('oath.check_recitation');
    submitBtn.addEventListener('click', () => {
      const userText = textarea.value.trim();
      if (!userText) return;

      // Score the oath
      const original = oathData.fullText.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
      const user = userText.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
      const origWords = original.split(' ');
      const userWords = user.split(' ');
      let correct = 0;
      for (let i = 0; i < Math.min(origWords.length, userWords.length); i++) {
        if (origWords[i] === userWords[i]) correct++;
      }
      const oathPct = Math.round(correct / origWords.length * 100);
      score += oathPct;
      totalQuestions++;

      // Update oath progress
      const currentBest = store.get('oathProgress.bestScore') || 0;
      if (oathPct > currentBest) store.update('oathProgress.bestScore', oathPct);

      // Show feedback briefly, then move to QA
      const feedback = document.createElement('div');
      feedback.className = `quiz-feedback mt-12 ${oathPct >= 80 ? 'correct' : 'incorrect'}`;
      feedback.textContent = `${tr({ en: 'Oath score', uk: 'Оцінка присяги' })}: ${oathPct}%`;
      view.appendChild(feedback);

      submitBtn.remove();

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-primary btn-block mt-8';
      nextBtn.textContent = tr({ en: 'Continue to questions', uk: 'Перейти до запитань' });
      nextBtn.addEventListener('click', () => {
        currentPhase = 'qa';
        prepareQA();
        renderQA();
      });
      view.appendChild(nextBtn);
    });
    view.appendChild(submitBtn);

    container.textContent = '';
    container.appendChild(view);
  }

  function prepareQA() {
    if (!dialogueData) return;
    // Use dialogue turns that are player turns as QA
    qaQuestions = dialogueData.turns.filter(t => t.speaker === 'you');
    // Take up to 5 questions
    qaQuestions = qaQuestions.slice(0, 5);
    qaIndex = 0;
  }

  function renderQA() {
    if (qaIndex >= qaQuestions.length) {
      renderResult();
      return;
    }

    const question = qaQuestions[qaIndex];
    const prevTurn = dialogueData.turns[dialogueData.turns.indexOf(question) - 1];

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const timer = document.createElement('div');
    timer.className = 'ceremony-timer';
    timer.textContent = `${tr({ en: 'Question', uk: 'Запитання' })} ${qaIndex + 1} / ${qaQuestions.length}`;
    view.appendChild(timer);

    // Official question
    if (prevTurn) {
      const bubble = document.createElement('div');
      bubble.className = 'dialogue-bubble official';
      const name = document.createElement('div');
      name.className = 'dialogue-bubble-name';
      name.textContent = 'Oficial ANC';
      bubble.appendChild(name);
      const text = document.createElement('div');
      text.className = 'dialogue-bubble-text';
      text.textContent = prevTurn.text.ro;
      bubble.appendChild(text);
      const trans = document.createElement('div');
      trans.className = 'dialogue-bubble-translation';
      trans.textContent = tr(prevTurn.translation);
      bubble.appendChild(trans);
      view.appendChild(bubble);
      speak(prevTurn.text.ro);
    }

    // Options
    const optLabel = document.createElement('div');
    optLabel.className = 'dialogue-option-label mt-16';
    optLabel.textContent = tr(question.prompt);
    view.appendChild(optLabel);

    const options = document.createElement('div');
    options.className = 'dialogue-options';

    let answered = false;
    for (const opt of question.options) {
      const optBtn = document.createElement('button');
      optBtn.className = 'dialogue-option';
      optBtn.textContent = opt.text;
      optBtn.addEventListener('click', () => {
        if (answered) return;
        answered = true;

        if (opt.quality === 'excellent') score += 100;
        else if (opt.quality === 'acceptable') score += 70;
        else score += 30;
        totalQuestions++;

        // Show quality
        for (const btn of options.children) {
          const matchOpt = question.options.find(o => o.text === btn.textContent);
          if (matchOpt) btn.classList.add(matchOpt.quality);
          btn.style.pointerEvents = 'none';
        }

        // Feedback
        const feedback = document.createElement('div');
        feedback.className = 'dialogue-feedback';
        feedback.style.background = opt.quality === 'excellent' ? 'var(--color-success-light)' : opt.quality === 'acceptable' ? 'var(--color-warning-light)' : 'var(--color-error-light)';
        feedback.style.color = opt.quality === 'excellent' ? 'var(--color-success)' : opt.quality === 'acceptable' ? 'var(--color-warning)' : 'var(--color-error)';
        feedback.style.padding = '12px';
        feedback.style.borderRadius = '8px';
        feedback.style.marginTop = '12px';
        feedback.style.fontSize = '0.8125rem';
        feedback.textContent = tr(opt.feedback);
        view.appendChild(feedback);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary btn-block mt-12';
        nextBtn.textContent = qaIndex < qaQuestions.length - 1 ? t('common.next') : t('ceremony.result');
        nextBtn.addEventListener('click', () => {
          qaIndex++;
          renderQA();
        });
        view.appendChild(nextBtn);
      });
      options.appendChild(optBtn);
    }
    view.appendChild(options);

    container.textContent = '';
    container.appendChild(view);
  }

  function renderResult() {
    const elapsed = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const avgScore = totalQuestions > 0 ? Math.round(score / totalQuestions) : 0;
    const passed = avgScore >= 60;

    const xp = awardXP(avgScore >= 90 ? 'quizExcellent' : 'quizPass');
    logStudyActivity('lesson', 1);
    updateStreak();
    checkAchievements();

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const result = document.createElement('div');
    result.className = 'ceremony-intro';

    const icon = document.createElement('div');
    icon.style.fontSize = '4rem';
    icon.style.marginBottom = '16px';
    icon.textContent = passed ? '🎉' : '📚';
    result.appendChild(icon);

    const h2 = document.createElement('h2');
    h2.textContent = passed ?
      tr({ en: 'Ceremony Passed!', uk: 'Церемонію пройдено!' }) :
      tr({ en: 'Keep Practicing', uk: 'Продовжуйте практикувати' });
    result.appendChild(h2);

    const scoreText = document.createElement('div');
    scoreText.style.fontSize = '2rem';
    scoreText.style.fontWeight = '700';
    scoreText.style.color = passed ? 'var(--color-success)' : 'var(--color-warning)';
    scoreText.style.margin = '16px 0';
    scoreText.textContent = `${avgScore}%`;
    result.appendChild(scoreText);

    const details = document.createElement('div');
    details.className = 'text-secondary';
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    details.textContent = `${tr({ en: 'Time', uk: 'Час' })}: ${mins}:${String(secs).padStart(2, '0')} | +${xp} XP`;
    result.appendChild(details);

    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-8 justify-center mt-24';

    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn btn-secondary';
    homeBtn.textContent = tr({ en: 'Home', uk: 'Головна' });
    homeBtn.addEventListener('click', () => { location.hash = '#/'; });
    btnRow.appendChild(homeBtn);

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary';
    retryBtn.textContent = tr({ en: 'Try again', uk: 'Спробувати знову' });
    retryBtn.addEventListener('click', () => {
      started = false;
      currentPhase = 'intro';
      qaIndex = 0;
      qaQuestions = [];
      score = 0;
      totalQuestions = 0;
      startTime = null;
      renderIntro();
    });
    btnRow.appendChild(retryBtn);

    result.appendChild(btnRow);
    view.appendChild(result);

    container.textContent = '';
    container.appendChild(view);
  }
}
