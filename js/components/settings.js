import { t, tr } from '../services/utils.js';
import { setLanguage, applyI18n } from '../services/utils.js';

export function Settings(container, store, router) {
  render();

  function render() {
    const state = store.getState();
    const settings = state.settings;

    const view = document.createElement('div');
    view.className = 'view fade-in';

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = t('settings.title');

    // Language
    view.appendChild(createGroupTitle(t('settings.language')));
    const langItem = createSettingsItem(t('settings.language'));
    const langSelect = createSegmented(
      [
        { value: 'uk', label: 'Українська' },
        { value: 'en', label: 'English' }
      ],
      settings.primaryLanguage,
      (val) => {
        store.update('settings.primaryLanguage', val);
        store.update('settings.secondaryLanguage', val === 'uk' ? 'en' : 'uk');
        setLanguage(val);
        render(); // re-render with new language
      }
    );
    langItem.appendChild(langSelect);
    view.appendChild(langItem);

    // Theme
    view.appendChild(createGroupTitle(t('settings.theme')));
    const themeItem = createSettingsItem(t('settings.theme'));
    const themeSelect = createSegmented(
      [
        { value: 'light', label: t('settings.theme_light') },
        { value: 'dark', label: t('settings.theme_dark') },
        { value: 'auto', label: t('settings.theme_auto') }
      ],
      settings.theme,
      (val) => {
        store.update('settings.theme', val);
        render();
      }
    );
    themeItem.appendChild(themeSelect);
    view.appendChild(themeItem);

    // Toggles
    view.appendChild(createGroupTitle(tr({ en: 'Learning', uk: 'Навчання' })));
    view.appendChild(createToggleItem(t('settings.pronunciation'), settings.showPronunciation, (val) => {
      store.update('settings.showPronunciation', val);
    }));
    view.appendChild(createToggleItem(t('settings.audio'), settings.autoPlayAudio, (val) => {
      store.update('settings.autoPlayAudio', val);
    }));
    view.appendChild(createToggleItem(t('settings.module_lock'), settings.moduleLocking, (val) => {
      store.update('settings.moduleLocking', val);
    }));

    // Data section
    view.appendChild(createGroupTitle(tr({ en: 'Data', uk: 'Дані' })));

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary btn-block mb-8';
    exportBtn.textContent = t('settings.export');
    exportBtn.addEventListener('click', () => {
      const data = store.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rom-tutor-progress.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    view.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary btn-block mb-8';
    importBtn.textContent = t('settings.import');
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const success = store.importData(ev.target.result);
          if (success) {
            render();
            showToast(tr({ en: 'Progress imported!', uk: 'Прогрес імпортовано!' }));
          } else {
            showToast(tr({ en: 'Import failed', uk: 'Помилка імпорту' }));
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });
    view.appendChild(importBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-danger btn-block mt-16';
    resetBtn.textContent = t('settings.reset');
    resetBtn.addEventListener('click', () => {
      if (confirm(t('settings.reset_confirm'))) {
        store.reset();
        setLanguage('uk');
        render();
        showToast(tr({ en: 'All data reset', uk: 'Всі дані скинуто' }));
      }
    });
    view.appendChild(resetBtn);

    container.textContent = '';
    container.appendChild(view);
  }

  function createGroupTitle(text) {
    const el = document.createElement('div');
    el.className = 'settings-group-title mt-20';
    el.textContent = text;
    return el;
  }

  function createSettingsItem(label) {
    const item = document.createElement('div');
    item.className = 'settings-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'flex-start';
    item.style.gap = '8px';
    item.style.borderRadius = 'var(--radius)';
    return item;
  }

  function createSegmented(options, current, onChange) {
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.style.width = '100%';
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = `segmented-btn ${opt.value === current ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => onChange(opt.value));
      seg.appendChild(btn);
    }
    return seg;
  }

  function createToggleItem(label, checked, onChange) {
    const item = document.createElement('div');
    item.className = 'settings-item';
    item.style.borderRadius = 'var(--radius)';
    item.style.marginBottom = '8px';
    const lab = document.createElement('span');
    lab.className = 'settings-label';
    lab.textContent = label;
    item.appendChild(lab);
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'toggle';
    toggle.checked = checked;
    toggle.addEventListener('change', () => onChange(toggle.checked));
    item.appendChild(toggle);
    return item;
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}
