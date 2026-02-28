import { loadJSON, t, tr } from '../services/utils.js';

export function GrammarRef(container, store, router, scrollToPatternId = null) {
  // Clear container (no innerHTML — use DOM removal)
  while (container.firstChild) container.removeChild(container.firstChild);

  const view = document.createElement('div');
  view.className = 'view-container';
  container.appendChild(view);

  // Loading state
  const loadingMsg = document.createElement('p');
  loadingMsg.textContent = '...';
  view.appendChild(loadingMsg);

  loadJSON('./data/grammar/patterns.json').then(data => {
    view.removeChild(loadingMsg);
    if (!data || !data.patterns) {
      const err = document.createElement('p');
      err.textContent = 'Failed to load grammar patterns.';
      view.appendChild(err);
      return;
    }
    renderPatterns(view, data.patterns);
    // If navigated via deep link, scroll to the specified pattern
    if (scrollToPatternId) {
      scrollToPattern(scrollToPatternId);
    }
  });

  function renderPatterns(parent, patterns) {
    // Title
    const title = document.createElement('h2');
    title.textContent = t('grammar.reference');
    parent.appendChild(title);

    // Group by category
    const categories = [
      { key: 'verb-conjugation', labelKey: 'grammar.verb_conjugation', emoji: '🔴' },
      { key: 'reflexive-verbs', labelKey: 'grammar.reflexive_verbs', emoji: '🔴' },
      { key: 'other', labelKey: 'grammar.other_patterns', emoji: '' }
    ];

    for (const cat of categories) {
      const catPatterns = patterns.filter(p => p.category === cat.key);
      if (catPatterns.length === 0) continue;

      // Sort by priority (1 first)
      catPatterns.sort((a, b) => a.priority - b.priority);

      const section = document.createElement('div');
      section.className = 'grammar-category';

      const heading = document.createElement('h3');
      heading.textContent = (cat.emoji ? cat.emoji + ' ' : '') + t(cat.labelKey);
      section.appendChild(heading);

      for (const pattern of catPatterns) {
        section.appendChild(renderPatternCard(pattern));
      }

      parent.appendChild(section);
    }
  }

  function renderPatternCard(pattern) {
    const card = document.createElement('div');
    card.className = 'grammar-pattern-card';
    card.id = pattern.id; // anchor ID for deep linking

    const details = document.createElement('details');

    const summary = document.createElement('summary');
    summary.className = 'grammar-pattern-summary';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'grammar-pattern-name';
    nameSpan.textContent = tr(pattern.name);
    summary.appendChild(nameSpan);

    const prioritySpan = document.createElement('span');
    prioritySpan.className = 'grammar-priority-badge';
    const priorityEmojis = { 1: '🔴', 2: '🟡', 3: '🟢' };
    const priorityKeys = { 1: 'grammar.priority1', 2: 'grammar.priority2', 3: 'grammar.priority3' };
    prioritySpan.textContent = (priorityEmojis[pattern.priority] || '') + ' ' + t(priorityKeys[pattern.priority] || 'grammar.priority3');
    summary.appendChild(prioritySpan);

    details.appendChild(summary);

    // Description
    if (pattern.description) {
      const desc = document.createElement('div');
      desc.className = 'grammar-pattern-description';
      // Description may contain \n for line breaks — split and create elements
      const descText = tr(pattern.description);
      const lines = descText.split('\n');
      for (const line of lines) {
        if (line.trim() === '') {
          desc.appendChild(document.createElement('br'));
        } else {
          const p = document.createElement('p');
          p.textContent = line;
          desc.appendChild(p);
        }
      }
      details.appendChild(desc);
    }

    // Examples
    if (pattern.examples && pattern.examples.length > 0) {
      const exSection = document.createElement('div');
      exSection.className = 'grammar-examples';
      const exLabel = document.createElement('p');
      exLabel.className = 'grammar-examples-label';
      exLabel.textContent = t('grammar.examples');
      exSection.appendChild(exLabel);

      const ul = document.createElement('ul');
      for (const ex of pattern.examples) {
        const li = document.createElement('li');
        li.textContent = ex;
        li.style.fontStyle = 'italic';
        ul.appendChild(li);
      }
      exSection.appendChild(ul);
      details.appendChild(exSection);
    }

    card.appendChild(details);
    return card;
  }

  function scrollToPattern(patternId) {
    const el = document.getElementById(patternId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Also open the <details> element
      const details = el.querySelector('details');
      if (details) details.open = true;
    }
  }
}
