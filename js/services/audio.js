let supported = null;

function isSupported() {
  if (supported === null) {
    supported = 'speechSynthesis' in window;
  }
  return supported;
}

export function speak(text, lang = 'ro-RO') {
  if (!isSupported() || !text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const roVoice = voices.find(v => v.lang.startsWith('ro'));
  if (roVoice) {
    utterance.voice = roVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stop() {
  if (isSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakButton(text, lang = 'ro-RO') {
  return `<button class="speak-btn" data-speak="${text.replace(/"/g, '&quot;')}" data-lang="${lang}" aria-label="Listen" title="Listen">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 010 14.14"/>
      <path d="M15.54 8.46a5 5 0 010 7.07"/>
    </svg>
  </button>`;
}

export function attachSpeakListeners(container) {
  container.querySelectorAll('.speak-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.dataset.speak;
      const lang = btn.dataset.lang || 'ro-RO';
      speak(text, lang);
    });
  });
}

// Pre-load voices
if (isSupported()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}
