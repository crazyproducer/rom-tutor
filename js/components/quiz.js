import { t, tr, loadJSON, shuffle, escapeHtml } from '../services/utils.js';
import { awardXP, logStudyActivity, updateStreak, checkAchievements } from '../services/gamification.js';

const QUESTION_COUNT = 10;
const MULTIPLE_CHOICE_RATIO = 0.7;
const XP_THRESHOLD_PASS = 70;
const XP_THRESHOLD_EXCELLENT = 90;
const DISTRACTOR_COUNT = 3;

export function Quiz(container, store, router, moduleId) {
  let words = [];
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;

  loadQuiz().then(() => {
    if (questions.length > 0) {
      renderQuestion();
    } else {
      renderEmpty();
    }
  });

  async function loadQuiz() {
    const modules = await loadJSON('./data/modules.json');
    if (!modules) return;

    let vocabFile = null;
    for (const phase of modules.phases) {
      const mod = phase.modules.find(m => m.id === moduleId);
      if (mod?.vocabularyFile) { vocabFile = mod.vocabularyFile; break; }
    }
    if (!vocabFile) return;

    const vocab = await loadJSON(`./data/vocabulary/${vocabFile}`);
    if (!vocab?.words || vocab.words.length < 4) return;

    words = vocab.words;

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = tr({ en: 'Quiz', uk: 'Тест' });

    questions = generateQuestions();
  }

  function generateQuestions() {
    const count = Math.min(QUESTION_COUNT, words.length);
    const selected = shuffle(words).slice(0, count);
    const state = store.getState();
    const lang = state.settings.primaryLanguage;

    return selected.map((word, i) => {
      const isMultipleChoice = i < Math.round(count * MULTIPLE_CHOICE_RATIO);

      if (isMultipleChoice) {
        return createMultipleChoiceQuestion(word, lang);
      }
      return createFillInBlankQuestion(word, lang);
    });
  }

  function createMultipleChoiceQuestion(word, lang) {
    const translation = getTranslation(word, lang);
    const distractors = shuffle(words.filter(w => w.id !== word.id))
      .slice(0, DISTRACTOR_COUNT)
      .map(w => getTranslation(w, lang));

    const options = shuffle([translation, ...distractors]);

    return {
      type: 'multiple-choice',
      prompt: word.ro,
      correctAnswer: translation,
      options,
      word
    };
  }

  function createFillInBlankQuestion(word, lang) {
    const hasExample = word.example && word.example.ro;

    if (hasExample) {
      const sentence = word.example.ro;
      const blanked = sentence.replace(
        new RegExp(escapeRegex(word.ro), 'i'),
        '___'
      );

      if (blanked !== sentence) {
        return {
          type: 'fill-blank',
          prompt: blanked,
          hint: getTranslation(word, lang),
          correctAnswer: word.ro.toLowerCase(),
          word
        };
      }
    }

    return {
      type: 'fill-blank',
      prompt: tr({
        en: `Type the Romanian word for: ${getTranslation(word, lang)}`,
        uk: `Введіть румунське слово для: ${getTranslation(word, lang)}`
      }),
      hint: null,
      correctAnswer: word.ro.toLowerCase(),
      word
    };
  }

  function getTranslation(word, lang) {
    if (lang === 'uk') return word.uk || word.en;
    return word.en || word.uk;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function renderQuestion() {
    const question = questions[currentIndex];
    if (!question) { renderResults(); return; }

    answered = false;

    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Progress indicator
    const progress = document.createElement('div');
    progress.className = 'flashcard-progress';
    progress.textContent = `${t('quiz.question')} ${currentIndex + 1} ${t('flashcard.of')} ${questions.length}`;
    view.appendChild(progress);

    // Progress bar
    const bar = document.createElement('div');
    bar.className = 'progress-bar mb-16';
    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill';
    fill.style.width = `${(currentIndex / questions.length) * 100}%`;
    bar.appendChild(fill);
    view.appendChild(bar);

    // Question card
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '24px 20px';

    if (question.type === 'multiple-choice') {
      renderMultipleChoice(card, question);
    } else {
      renderFillInBlank(card, question);
    }

    view.appendChild(card);
    container.textContent = '';
    container.appendChild(view);
  }

  function renderMultipleChoice(card, question) {
    const promptEl = document.createElement('div');
    promptEl.style.fontSize = '1.5rem';
    promptEl.style.fontWeight = '700';
    promptEl.style.textAlign = 'center';
    promptEl.style.marginBottom = '8px';
    promptEl.textContent = question.prompt;
    card.appendChild(promptEl);

    const instruction = document.createElement('div');
    instruction.style.textAlign = 'center';
    instruction.style.color = 'var(--color-text-secondary)';
    instruction.style.fontSize = '0.875rem';
    instruction.style.marginBottom = '20px';
    instruction.textContent = tr({
      en: 'Select the correct translation',
      uk: 'Оберіть правильний переклад'
    });
    card.appendChild(instruction);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '10px';

    const feedbackArea = document.createElement('div');
    feedbackArea.style.marginTop = '16px';
    feedbackArea.style.textAlign = 'center';

    for (const option of question.options) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '14px 16px';
      btn.textContent = option;

      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;

        const isCorrect = option === question.correctAnswer;
        if (isCorrect) score++;

        // Highlight all buttons
        for (const child of optionsContainer.children) {
          child.disabled = true;
          const childText = child.textContent;
          if (childText === question.correctAnswer) {
            child.style.backgroundColor = 'var(--color-success, #22c55e)';
            child.style.color = '#fff';
            child.style.borderColor = 'var(--color-success, #22c55e)';
          } else if (child === btn && !isCorrect) {
            child.style.backgroundColor = 'var(--color-error, #ef4444)';
            child.style.color = '#fff';
            child.style.borderColor = 'var(--color-error, #ef4444)';
          }
        }

        showFeedback(feedbackArea, isCorrect, question.correctAnswer);
        showNextButton(card);
      });

      optionsContainer.appendChild(btn);
    }

    card.appendChild(optionsContainer);
    card.appendChild(feedbackArea);
  }

  function renderFillInBlank(card, question) {
    const promptEl = document.createElement('div');
    promptEl.style.fontSize = '1.125rem';
    promptEl.style.fontWeight = '600';
    promptEl.style.textAlign = 'center';
    promptEl.style.marginBottom = '8px';
    promptEl.textContent = question.prompt;
    card.appendChild(promptEl);

    if (question.hint) {
      const hint = document.createElement('div');
      hint.style.textAlign = 'center';
      hint.style.color = 'var(--color-text-secondary)';
      hint.style.fontSize = '0.875rem';
      hint.style.marginBottom = '16px';
      hint.textContent = `(${question.hint})`;
      card.appendChild(hint);
    }

    const inputRow = document.createElement('div');
    inputRow.style.display = 'flex';
    inputRow.style.gap = '8px';
    inputRow.style.marginTop = '16px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.placeholder = t('quiz.type_answer');
    input.style.flex = '1';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    inputRow.appendChild(input);

    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn btn-primary';
    checkBtn.textContent = t('quiz.check');
    inputRow.appendChild(checkBtn);

    card.appendChild(inputRow);

    const feedbackArea = document.createElement('div');
    feedbackArea.style.marginTop = '16px';
    feedbackArea.style.textAlign = 'center';
    card.appendChild(feedbackArea);

    function handleCheck() {
      if (answered) return;
      answered = true;

      const userAnswer = input.value.trim().toLowerCase();
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) score++;

      input.disabled = true;
      checkBtn.disabled = true;

      if (isCorrect) {
        input.style.borderColor = 'var(--color-success, #22c55e)';
      } else {
        input.style.borderColor = 'var(--color-error, #ef4444)';
      }

      showFeedback(feedbackArea, isCorrect, question.word.ro);
      showNextButton(card);
    }

    checkBtn.addEventListener('click', handleCheck);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCheck();
    });

    // Auto-focus the input
    requestAnimationFrame(() => input.focus());
  }

  function showFeedback(feedbackArea, isCorrect, correctAnswer) {
    feedbackArea.textContent = '';

    const feedback = document.createElement('div');
    feedback.style.fontWeight = '600';
    feedback.style.fontSize = '1rem';
    feedback.style.padding = '8px 0';

    if (isCorrect) {
      feedback.style.color = 'var(--color-success, #22c55e)';
      feedback.textContent = `✓ ${t('common.correct')}`;
    } else {
      feedback.style.color = 'var(--color-error, #ef4444)';
      feedback.textContent = `✗ ${t('common.incorrect')}`;

      const answer = document.createElement('div');
      answer.style.marginTop = '4px';
      answer.style.fontSize = '0.875rem';
      answer.style.color = 'var(--color-text-secondary)';

      const label = document.createTextNode(
        tr({ en: 'Correct answer: ', uk: 'Правильна відповідь: ' })
      );
      answer.appendChild(label);

      const strong = document.createElement('strong');
      strong.textContent = correctAnswer;
      answer.appendChild(strong);

      feedbackArea.appendChild(answer);
    }

    feedbackArea.insertBefore(feedback, feedbackArea.firstChild);
  }

  function showNextButton(card) {
    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '20px';
    btnRow.style.textAlign = 'center';

    const isLast = currentIndex >= questions.length - 1;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.textContent = isLast ? t('common.finish') : t('common.next');
    nextBtn.addEventListener('click', () => {
      currentIndex++;
      renderQuestion();
    });
    btnRow.appendChild(nextBtn);

    card.appendChild(btnRow);
  }

  function renderResults() {
    const percentage = Math.round((score / questions.length) * 100);

    // Award XP based on performance
    let xpEarned = 0;
    if (percentage >= XP_THRESHOLD_EXCELLENT) {
      xpEarned = awardXP('quizExcellent');
    } else if (percentage >= XP_THRESHOLD_PASS) {
      xpEarned = awardXP('quizPass');
    }

    logStudyActivity('lesson', 1);
    updateStreak();
    checkAchievements();

    // Update module progress
    const progress = store.get(`moduleProgress.${moduleId}`) || {};
    if (!progress.quizBestScore || percentage > progress.quizBestScore) {
      store.update(`moduleProgress.${moduleId}`, {
        ...progress,
        quizBestScore: percentage,
        lastQuizDate: new Date().toISOString().split('T')[0]
      });
    }

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const summary = document.createElement('div');
    summary.className = 'session-summary';

    const h2 = document.createElement('h2');
    h2.textContent = tr({ en: 'Quiz Complete!', uk: 'Тест завершено!' });
    summary.appendChild(h2);

    const emoji = document.createElement('div');
    emoji.style.fontSize = '3rem';
    emoji.style.margin = '12px 0';
    if (percentage >= XP_THRESHOLD_EXCELLENT) {
      emoji.textContent = '🎉';
    } else if (percentage >= XP_THRESHOLD_PASS) {
      emoji.textContent = '👍';
    } else {
      emoji.textContent = '💪';
    }
    summary.appendChild(emoji);

    // Stats row
    const stats = document.createElement('div');
    stats.className = 'session-summary-stats';
    stats.appendChild(createStat(`${score}/${questions.length}`, t('common.score')));
    stats.appendChild(createStat(`${percentage}%`, t('common.correct')));
    stats.appendChild(createStat(`+${xpEarned}`, t('common.xp')));
    summary.appendChild(stats);

    // Message based on score
    const message = document.createElement('p');
    message.style.textAlign = 'center';
    message.style.color = 'var(--color-text-secondary)';
    message.style.margin = '12px 0';
    if (percentage >= XP_THRESHOLD_EXCELLENT) {
      message.textContent = tr({ en: 'Excellent work!', uk: 'Чудова робота!' });
    } else if (percentage >= XP_THRESHOLD_PASS) {
      message.textContent = tr({ en: 'Good job! Keep practicing.', uk: 'Гарна робота! Продовжуйте практикувати.' });
    } else {
      message.textContent = tr({ en: 'Keep studying, you will improve!', uk: 'Продовжуйте вчити, ви покращитесь!' });
    }
    summary.appendChild(message);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-8 justify-center mt-20';

    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn btn-secondary';
    homeBtn.textContent = tr({ en: 'Home', uk: 'Головна' });
    homeBtn.addEventListener('click', () => { location.hash = '#/'; });
    btnRow.appendChild(homeBtn);

    const moduleBtn = document.createElement('button');
    moduleBtn.className = 'btn btn-primary';
    moduleBtn.textContent = tr({ en: 'Back to module', uk: 'До модуля' });
    moduleBtn.addEventListener('click', () => { location.hash = `#/lessons/${moduleId}`; });
    btnRow.appendChild(moduleBtn);

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
    icon.textContent = '❓';
    empty.appendChild(icon);

    const h3 = document.createElement('h3');
    h3.textContent = tr({ en: 'No quiz available', uk: 'Тест недоступний' });
    empty.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = tr({
      en: 'This module needs at least 4 vocabulary words for a quiz.',
      uk: 'Для тесту потрібно щонайменше 4 слова у словнику модуля.'
    });
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
