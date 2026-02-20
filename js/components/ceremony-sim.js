import { t, tr, loadJSON, shuffle, compareRomanianAnswer } from '../services/utils.js';
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
  let selectedCategories = new Set();
  let questionsPerSession = 10;

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

    // Category selection
    if (dialogueData && dialogueData.categories) {
      const catSection = document.createElement('div');
      catSection.className = 'category-select mt-20';

      const catLabel = document.createElement('h3');
      catLabel.style.marginBottom = '12px';
      catLabel.textContent = tr({ en: 'Select question categories:', uk: 'Оберіть категорії запитань:' });
      catSection.appendChild(catLabel);

      const catGrid = document.createElement('div');
      catGrid.className = 'category-grid';

      // Initialize with all categories selected
      if (selectedCategories.size === 0) {
        dialogueData.categories.forEach(c => selectedCategories.add(c.id));
      }

      dialogueData.categories.forEach(cat => {
        const catBtn = document.createElement('button');
        catBtn.className = 'category-chip' + (selectedCategories.has(cat.id) ? ' selected' : '');
        const catText = document.createElement('span');
        catText.textContent = cat.id + ': ' + tr(cat.name);
        catBtn.appendChild(catText);
        const catRange = document.createElement('span');
        catRange.className = 'chip-range';
        catRange.textContent = cat.range;
        catBtn.appendChild(catRange);
        catBtn.addEventListener('click', () => {
          if (selectedCategories.has(cat.id)) {
            selectedCategories.delete(cat.id);
            catBtn.classList.remove('selected');
          } else {
            selectedCategories.add(cat.id);
            catBtn.classList.add('selected');
          }
          updateCountLabel();
        });
        catGrid.appendChild(catBtn);
      });
      catSection.appendChild(catGrid);

      // Question count selector
      const countRow = document.createElement('div');
      countRow.className = 'count-row mt-16';
      const countLabel = document.createElement('label');
      countLabel.textContent = tr({ en: 'Questions per session:', uk: 'Запитань за сесію:' });
      countRow.appendChild(countLabel);

      const countSelect = document.createElement('select');
      countSelect.className = 'select-count';
      [5, 10, 15, 20, 30].forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = String(n);
        if (n === questionsPerSession) opt.selected = true;
        countSelect.appendChild(opt);
      });
      // Add "All" option
      const allOpt = document.createElement('option');
      allOpt.value = '0';
      allOpt.textContent = tr({ en: 'All', uk: 'Всі' });
      countSelect.appendChild(allOpt);
      countSelect.addEventListener('change', () => {
        questionsPerSession = parseInt(countSelect.value, 10);
        updateCountLabel();
      });
      countRow.appendChild(countSelect);
      catSection.appendChild(countRow);

      const availableLabel = document.createElement('div');
      availableLabel.className = 'text-secondary mt-8';
      availableLabel.style.fontSize = '0.8125rem';
      catSection.appendChild(availableLabel);

      function updateCountLabel() {
        const available = countAvailableQuestions();
        const using = questionsPerSession === 0 ? available : Math.min(questionsPerSession, available);
        availableLabel.textContent = tr({
          en: `${available} questions available, ${using} will be asked (random order)`,
          uk: `${available} запитань доступно, ${using} буде задано (випадковий порядок)`
        });
      }
      updateCountLabel();

      intro.appendChild(catSection);
    }

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary btn-lg mt-20';
    startBtn.textContent = t('ceremony.start');
    startBtn.addEventListener('click', () => {
      if (selectedCategories.size === 0) {
        // Select all if none selected
        dialogueData.categories.forEach(c => selectedCategories.add(c.id));
      }
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

  function countAvailableQuestions() {
    if (!dialogueData) return 0;
    return dialogueData.turns.filter(t => t.speaker === 'you' && selectedCategories.has(t.category)).length;
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
    // Filter by selected categories
    qaQuestions = dialogueData.turns.filter(t => t.speaker === 'you' && selectedCategories.has(t.category));
    // Shuffle
    qaQuestions = shuffle([...qaQuestions]);
    // Limit to session count (0 = all)
    if (questionsPerSession > 0) {
      qaQuestions = qaQuestions.slice(0, questionsPerSession);
    }
    qaIndex = 0;
  }

  function renderQA() {
    if (qaIndex >= qaQuestions.length) {
      renderResult();
      return;
    }

    const question = qaQuestions[qaIndex];
    // Find the official's question turn that precedes this player turn in the original data
    const origIndex = dialogueData.turns.indexOf(question);
    const prevTurn = origIndex > 0 ? dialogueData.turns[origIndex - 1] : null;
    const excellentOpt = question.options.find(o => o.quality === 'excellent') || question.options[0];
    const acceptableOpt = question.options.find(o => o.quality === 'acceptable');

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const timer = document.createElement('div');
    timer.className = 'ceremony-timer';
    const catInfo = dialogueData.categories ? dialogueData.categories.find(c => c.id === question.category) : null;
    const catName = catInfo ? ' [' + question.category + ']' : '';
    timer.textContent = `${tr({ en: 'Question', uk: 'Запитання' })} ${qaIndex + 1} / ${qaQuestions.length}${catName}`;
    view.appendChild(timer);

    // Official question bubble
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

    // Translation prompt — what to say in Ukrainian
    const promptBox = document.createElement('div');
    promptBox.className = 'translate-prompt mt-16';

    const promptLabel = document.createElement('div');
    promptLabel.className = 'prompt-label';
    promptLabel.textContent = t('dialogue.say_this');
    promptBox.appendChild(promptLabel);

    const promptText = document.createElement('div');
    promptText.className = 'prompt-text';
    promptText.textContent = tr(question.prompt);
    promptBox.appendChild(promptText);

    view.appendChild(promptBox);

    // Input area: textarea + mic/check row
    const inputWrap = document.createElement('div');
    inputWrap.style.marginTop = '12px';

    const inputMicWrap = document.createElement('div');
    inputMicWrap.className = 'textarea-mic-wrapper';

    const input = document.createElement('textarea');
    input.className = 'input';
    input.placeholder = t('dialogue.type_romanian');
    input.rows = 3;
    input.style.width = '100%';
    input.style.resize = 'vertical';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    inputMicWrap.appendChild(input);

    const micBtn = createMicButton(input, 'ro-RO', { mode: 'replace' });
    if (micBtn) inputMicWrap.appendChild(micBtn);

    inputWrap.appendChild(inputMicWrap);

    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn btn-primary';
    checkBtn.style.marginTop = '8px';
    checkBtn.style.width = '100%';
    checkBtn.textContent = t('quiz.check');
    inputWrap.appendChild(checkBtn);

    view.appendChild(inputWrap);

    // Feedback area
    const feedbackArea = document.createElement('div');
    view.appendChild(feedbackArea);

    let answered = false;

    function handleCheck() {
      if (answered) return;
      const userText = input.value.trim();
      if (!userText) return;
      answered = true;
      input.disabled = true;
      checkBtn.disabled = true;
      if (micBtn) micBtn.disabled = true;

      // Compare answer
      const result = compareRomanianAnswer(userText, excellentOpt.text);
      score += result.percentage;
      totalQuestions++;

      // Show word diff
      const diffLabel = document.createElement('div');
      diffLabel.style.fontSize = '0.8125rem';
      diffLabel.style.color = 'var(--color-text-secondary)';
      diffLabel.style.marginTop = '12px';
      diffLabel.style.fontWeight = '600';
      diffLabel.textContent = `${tr({ en: 'Your answer', uk: 'Ваша відповідь' })}: ${result.percentage}%`;
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

      // Show feedback
      const feedColor = result.percentage >= 80 ? 'success' : result.percentage >= 50 ? 'warning' : 'error';
      const feedback = document.createElement('div');
      feedback.className = 'dialogue-feedback';
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

      // Listen to correct answer
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
      nextBtn.textContent = qaIndex < qaQuestions.length - 1 ? t('common.next') : t('ceremony.result');
      nextBtn.addEventListener('click', () => {
        qaIndex++;
        renderQA();
      });
      feedbackArea.appendChild(nextBtn);
    }

    checkBtn.addEventListener('click', handleCheck);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCheck();
    });

    container.textContent = '';
    container.appendChild(view);

    input.focus();
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
