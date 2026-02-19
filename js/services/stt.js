// ── Speech-to-Text (Speech Recognition) ─────────────────────
// Uses the Web Speech API (SpeechRecognition) to convert
// spoken Romanian into text.  Chrome/Edge required.

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function isSTTSupported() {
  return !!SpeechRecognition;
}

let activeSession = null;

/**
 * Create a microphone button that inserts recognized speech
 * into a target <input> or <textarea>.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} target — the field to fill
 * @param {string} lang — BCP-47 language code (default 'ro-RO')
 * @param {object} opts
 * @param {'replace'|'append'} opts.mode — replace or append to existing text
 * @returns {HTMLButtonElement|null} — the mic button, or null if unsupported
 */
export function createMicButton(target, lang = 'ro-RO', opts = {}) {
  if (!isSTTSupported()) return null;

  const mode = opts.mode || 'append';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mic-btn';
  btn.setAttribute('aria-label', 'Dictate');
  btn.title = 'Dictate';

  // Mic icon (SVG)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  // Mic body
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '9');
  rect.setAttribute('y', '2');
  rect.setAttribute('width', '6');
  rect.setAttribute('height', '11');
  rect.setAttribute('rx', '3');
  svg.appendChild(rect);

  // Mic arc
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M19 10v1a7 7 0 01-14 0v-1');
  svg.appendChild(path1);

  // Mic stand
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '12');
  line.setAttribute('y1', '18');
  line.setAttribute('x2', '12');
  line.setAttribute('y2', '22');
  svg.appendChild(line);

  // Mic base
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M8 22h8');
  svg.appendChild(path2);

  btn.appendChild(svg);

  let isListening = false;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      stopListening();
      return;
    }

    // Stop any other active session first
    if (activeSession) {
      try { activeSession.abort(); } catch {}
      activeSession = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    activeSession = recognition;
    isListening = true;
    btn.classList.add('mic-listening');

    let finalTranscript = '';

    recognition.addEventListener('result', (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      // Show interim results in the field
      if (mode === 'replace') {
        target.value = finalTranscript + interim;
      } else {
        const before = target.dataset.preVoice || '';
        target.value = before + (before ? ' ' : '') + finalTranscript + interim;
      }

      // Trigger input event so any listeners know the value changed
      target.dispatchEvent(new Event('input', { bubbles: true }));
    });

    recognition.addEventListener('end', () => {
      stopListening();
    });

    recognition.addEventListener('error', (event) => {
      console.warn('Speech recognition error:', event.error);
      stopListening();
    });

    // Save current text for append mode
    if (mode === 'append') {
      target.dataset.preVoice = target.value;
    }

    recognition.start();
    target.focus();

    function stopListening() {
      isListening = false;
      btn.classList.remove('mic-listening');
      activeSession = null;
      try { recognition.stop(); } catch {}
      delete target.dataset.preVoice;
    }
  });

  return btn;
}

/**
 * Stop any active speech recognition session.
 */
export function stopSTT() {
  if (activeSession) {
    try { activeSession.abort(); } catch {}
    activeSession = null;
  }
}
