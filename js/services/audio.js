import { store } from '../store.js';

// ── Engine: Lingva Translate TTS ────────────────────────────
// Open-source Google Translate proxy with CORS support.
// Returns Google's high-quality Romanian pronunciation.
// Multiple instances for reliability.

const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud'
];

let currentAudio = null;
let activeInstance = 0; // index into LINGVA_INSTANCES

async function fetchLingvaAudio(text, lang) {
  const langCode = lang.split('-')[0]; // 'ro-RO' → 'ro'
  const encoded = encodeURIComponent(text);

  for (let i = 0; i < LINGVA_INSTANCES.length; i++) {
    const idx = (activeInstance + i) % LINGVA_INSTANCES.length;
    const base = LINGVA_INSTANCES[idx];
    try {
      const resp = await fetch(`${base}/api/v1/audio/${langCode}/${encoded}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!data.audio || !data.audio.length) continue;
      // Remember which instance worked
      activeInstance = idx;
      const bytes = new Uint8Array(data.audio);
      return new Blob([bytes], { type: 'audio/mpeg' });
    } catch {
      // Try next instance
    }
  }
  return null;
}

async function speakLingva(text, lang) {
  stopAudio();

  const chunks = splitIntoChunks(text, 180);
  let index = 0;

  async function playNext() {
    if (index >= chunks.length) {
      currentAudio = null;
      return;
    }

    const blob = await fetchLingvaAudio(chunks[index], lang);
    if (!blob) {
      // All Lingva instances failed — fall back to Web Speech API
      console.warn('Lingva TTS failed, falling back to Web Speech API');
      currentAudio = null;
      speakWebSpeech(chunks.slice(index).join(' '), lang);
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.playbackRate = 0.9;
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
      index++;
      playNext();
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      speakWebSpeech(chunks.slice(index).join(' '), lang);
    });
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      currentAudio = null;
      speakWebSpeech(chunks.slice(index).join(' '), lang);
    });
  }

  playNext();
}

function splitIntoChunks(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  const sentences = text.split(/(?<=[.!?;])\s+/);

  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 <= maxLen) {
      current = current ? current + ' ' + sentence : sentence;
    } else {
      if (current) chunks.push(current);
      if (sentence.length > maxLen) {
        const words = sentence.split(/\s+/);
        current = '';
        for (const word of words) {
          if (current.length + word.length + 1 <= maxLen) {
            current = current ? current + ' ' + word : word;
          } else {
            if (current) chunks.push(current);
            current = word;
          }
        }
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}


// ── Engine: Web Speech API (browser built-in) ──────────────
// Works offline, but Romanian pronunciation quality varies by
// browser/OS.  Some systems have no Romanian voice at all.

let webSpeechSupported = null;

function isWebSpeechSupported() {
  if (webSpeechSupported === null) {
    webSpeechSupported = 'speechSynthesis' in window;
  }
  return webSpeechSupported;
}

function speakWebSpeech(text, lang) {
  if (!isWebSpeechSupported()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const langCode = lang.split('-')[0];
  const voice = voices.find(v => v.lang.startsWith(langCode));
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}


// ── Public API ──────────────────────────────────────────────

function getEngine() {
  try {
    return store.get('settings.ttsEngine') || 'google';
  } catch {
    return 'google';
  }
}

export function speak(text, lang = 'ro-RO') {
  if (!text) return;

  const engine = getEngine();

  if (engine === 'browser') {
    speakWebSpeech(text, lang);
  } else {
    // 'google' — Lingva proxy with automatic fallback to browser
    speakLingva(text, lang);
  }
}

export function stop() {
  stopAudio();
  if (isWebSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}


// ── Unused legacy helpers (kept for compat) ─────────────────

export function speakButton(text, lang = 'ro-RO') {
  return '';
}

export function attachSpeakListeners(container) {
  container.querySelectorAll('.speak-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = btn.dataset.speak;
      const l = btn.dataset.lang || 'ro-RO';
      speak(t, l);
    });
  });
}


// ── Pre-load Web Speech voices ──────────────────────────────
if (isWebSpeechSupported()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}
