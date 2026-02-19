import { t, tr, loadJSON } from '../services/utils.js';
import { speak } from '../services/audio.js';
import { awardXP, logStudyActivity, updateStreak } from '../services/gamification.js';

export function Grammar(container, store, router, moduleId) {
  let grammarData = null;

  loadGrammar().then(() => {
    if (grammarData) {
      render();
    } else {
      renderEmpty();
    }
  });

  async function loadGrammar() {
    const modules = await loadJSON('./data/modules.json');
    if (!modules) return;

    let grammarFile = null;
    for (const phase of modules.phases) {
      const mod = phase.modules.find(m => m.id === moduleId);
      if (mod?.grammarFile) { grammarFile = mod.grammarFile; break; }
    }
    if (!grammarFile) return;

    grammarData = await loadJSON(`./data/grammar/${grammarFile}`);
  }

  function render() {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = tr(grammarData.title);

    const view = document.createElement('div');
    view.className = 'view fade-in';

    // Title section
    const titleSection = document.createElement('div');
    titleSection.className = 'lesson-header';
    const h2 = document.createElement('h2');
    h2.textContent = tr(grammarData.title);
    titleSection.appendChild(h2);
    view.appendChild(titleSection);

    // Render each section
    for (const section of grammarData.sections) {
      const sectionEl = renderSection(section);
      if (sectionEl) view.appendChild(sectionEl);
    }

    // Mark as complete button
    const completeRow = document.createElement('div');
    completeRow.style.textAlign = 'center';
    completeRow.style.margin = '24px 0 40px';

    const completeBtn = document.createElement('button');
    completeBtn.className = 'btn btn-primary';
    completeBtn.style.minWidth = '200px';
    completeBtn.textContent = tr({ en: 'Mark as complete', uk: 'Позначити як завершене' });
    completeBtn.addEventListener('click', () => handleComplete(completeBtn));
    completeRow.appendChild(completeBtn);
    view.appendChild(completeRow);

    container.textContent = '';
    container.appendChild(view);
  }

  function renderSection(section) {
    switch (section.type) {
      case 'explanation':
        return renderExplanation(section);
      case 'table':
        return renderTable(section);
      case 'comparison':
        return renderComparison(section);
      case 'practice':
        return renderPractice(section);
      default:
        return null;
    }
  }

  function renderExplanation(section) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card mb-16';
    wrapper.style.padding = '20px';

    const text = document.createElement('p');
    text.style.lineHeight = '1.6';
    text.style.margin = '0';
    text.textContent = tr(section.content);
    wrapper.appendChild(text);

    return wrapper;
  }

  function renderTable(section) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card mb-16';
    wrapper.style.padding = '20px';
    wrapper.style.overflowX = 'auto';

    if (section.title) {
      const title = document.createElement('h3');
      title.style.margin = '0 0 12px';
      title.style.fontSize = '1rem';
      title.style.fontWeight = '600';
      title.textContent = tr(section.title);
      wrapper.appendChild(title);
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '0.875rem';

    if (!section.rows || section.rows.length === 0) return wrapper;

    // Build header from the keys of the first row
    const columns = Object.keys(section.rows[0]);
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    for (const col of columns) {
      const th = document.createElement('th');
      th.style.textAlign = 'left';
      th.style.padding = '10px 12px';
      th.style.borderBottom = '2px solid var(--color-border, #e5e7eb)';
      th.style.fontWeight = '600';
      th.style.fontSize = '0.8125rem';
      th.style.color = 'var(--color-text-secondary)';
      th.textContent = formatColumnHeader(col);
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Build body
    const tbody = document.createElement('tbody');
    for (const row of section.rows) {
      const tableRow = document.createElement('tr');

      for (const col of columns) {
        const td = document.createElement('td');
        td.style.padding = '10px 12px';
        td.style.borderBottom = '1px solid var(--color-border, #e5e7eb)';
        td.style.verticalAlign = 'top';

        const cellValue = row[col];
        if (cellValue && typeof cellValue === 'object' && (cellValue.en || cellValue.uk)) {
          td.textContent = tr(cellValue);
        } else {
          td.textContent = String(cellValue ?? '');
        }

        tableRow.appendChild(td);
      }

      tbody.appendChild(tableRow);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function formatColumnHeader(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, c => c.toUpperCase());
  }

  function renderComparison(section) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card mb-16';
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = 'var(--color-warning-bg, #fefce8)';
    wrapper.style.borderLeft = '4px solid var(--color-warning, #eab308)';

    if (section.title) {
      const title = document.createElement('h3');
      title.style.margin = '0 0 10px';
      title.style.fontSize = '1rem';
      title.style.fontWeight = '600';
      title.textContent = tr(section.title);
      wrapper.appendChild(title);
    }

    const text = document.createElement('p');
    text.style.lineHeight = '1.6';
    text.style.margin = '0';
    text.textContent = tr(section.content);
    wrapper.appendChild(text);

    return wrapper;
  }

  function renderPractice(section) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card mb-16';
    wrapper.style.padding = '20px';

    const title = document.createElement('h3');
    title.style.margin = '0 0 16px';
    title.style.fontSize = '1rem';
    title.style.fontWeight = '600';
    title.textContent = tr({ en: 'Practice', uk: 'Практика' });
    wrapper.appendChild(title);

    for (let i = 0; i < section.exercises.length; i++) {
      const exercise = section.exercises[i];
      const exerciseEl = renderExercise(exercise, i);
      wrapper.appendChild(exerciseEl);
    }

    return wrapper;
  }

  function renderExercise(exercise, index) {
    const exerciseWrapper = document.createElement('div');
    exerciseWrapper.style.marginBottom = '16px';
    exerciseWrapper.style.paddingBottom = '16px';
    exerciseWrapper.style.borderBottom = '1px solid var(--color-border, #e5e7eb)';

    // Exercise number and prompt
    const promptEl = document.createElement('div');
    promptEl.style.fontWeight = '500';
    promptEl.style.marginBottom = '10px';

    const numberSpan = document.createElement('span');
    numberSpan.style.color = 'var(--color-primary)';
    numberSpan.style.fontWeight = '600';
    numberSpan.textContent = `${index + 1}. `;
    promptEl.appendChild(numberSpan);

    const promptText = document.createTextNode(tr(exercise.prompt));
    promptEl.appendChild(promptText);
    exerciseWrapper.appendChild(promptEl);

    // Input and check button row
    const inputRow = document.createElement('div');
    inputRow.style.display = 'flex';
    inputRow.style.gap = '8px';

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

    exerciseWrapper.appendChild(inputRow);

    // Feedback area
    const feedbackEl = document.createElement('div');
    feedbackEl.style.marginTop = '8px';
    exerciseWrapper.appendChild(feedbackEl);

    let isAnswered = false;

    function handleCheck() {
      if (isAnswered) return;
      isAnswered = true;

      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = exercise.answer.toLowerCase();
      const isCorrect = userAnswer === correctAnswer;

      input.disabled = true;
      checkBtn.disabled = true;

      if (isCorrect) {
        input.style.borderColor = 'var(--color-success, #22c55e)';
        feedbackEl.style.color = 'var(--color-success, #22c55e)';
        feedbackEl.style.fontWeight = '600';
        feedbackEl.textContent = `✓ ${t('common.correct')}`;
      } else {
        input.style.borderColor = 'var(--color-error, #ef4444)';
        feedbackEl.style.color = 'var(--color-error, #ef4444)';
        feedbackEl.style.fontWeight = '600';

        const wrongText = document.createTextNode(`✗ ${t('common.incorrect')} — `);
        feedbackEl.textContent = '';
        feedbackEl.appendChild(wrongText);

        const correctEl = document.createElement('strong');
        correctEl.textContent = exercise.answer;
        feedbackEl.appendChild(correctEl);
      }
    }

    checkBtn.addEventListener('click', handleCheck);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCheck();
    });

    return exerciseWrapper;
  }

  function handleComplete(btn) {
    btn.disabled = true;
    btn.textContent = tr({ en: 'Completed!', uk: 'Завершено!' });
    btn.style.backgroundColor = 'var(--color-success, #22c55e)';
    btn.style.borderColor = 'var(--color-success, #22c55e)';

    // Update module progress
    const progress = store.get(`moduleProgress.${moduleId}`) || {};
    if (!progress.grammarCompleted) {
      store.update(`moduleProgress.${moduleId}`, {
        ...progress,
        grammarCompleted: true,
        grammarCompletedDate: new Date().toISOString().split('T')[0]
      });
    }

    awardXP('lessonComplete');
    logStudyActivity('lesson', 1);
    updateStreak();
  }

  function renderEmpty() {
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = tr({ en: 'Grammar', uk: 'Граматика' });

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '📐';
    empty.appendChild(icon);

    const h3 = document.createElement('h3');
    h3.textContent = tr({ en: 'No grammar lesson', uk: 'Урок граматики відсутній' });
    empty.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = tr({
      en: 'This module does not have a grammar lesson yet.',
      uk: 'Цей модуль ще не має уроку граматики.'
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
