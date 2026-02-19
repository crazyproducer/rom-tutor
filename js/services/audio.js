import { store } from '../store.js';

// ── Engine: Google Translate TTS ────────────────────────────
// Uses the public Google Translate TTS endpoint via <audio>.
// Excellent Romanian pronunciation, no API key needed.
// May be rate-limited under heavy use.

let currentAudio = null;

function getGoogleTTSUrl(text, lang) {
  const langCode = lang.split('-')[0]; // 'ro-RO' → 'ro'
  const encoded = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encoded}`;
}

function speakGoogle(text, lang) {
  stopAudio();

  // Google TTS has a ~200 char limit per request.
  // For longer texts, split into sentences and chain playback.
  const chunks = splitIntoChunks(text, 180);

  let index = 0;

  function playNext() {
    if (index >= chunks.length) {
      currentAudio = null;
      return;
    }
    const url = getGoogleTTSUrl(chunks[index], lang);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.playbackRate = 0.9;
    audio.addEventListener('ended', () => {
      index++;
      playNext();
    });
    audio.addEventListener('error', () => {
      // If Google TTS fails, fall back to Web Speech API
      console.warn('Google TTS failed, falling back to Web Speech API');
      currentAudio = null;
      speakWebSpeech(chunks.slice(index).join(' '), lang);
    });
    audio.play().catch(() => {
      // Autoplay blocked or network error — fall back
      currentAudio = null;
      speakWebSpeech(chunks.slice(index).join(' '), lang);
    });
  }

  playNext();
}

function splitIntoChunks(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  // Split on sentence boundaries first
  const sentences = text.split(/(?<=[.!?;])\s+/);

  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 <= maxLen) {
      current = current ? current + ' ' + sentence : sentence;
    } else {
      if (current) chunks.push(current);
      // If a single sentence exceeds maxLen, split on commas/spaces
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
    // 'google' — with automatic fallback to browser on failure
    speakGoogle(text, lang);
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
  // Not used — the app creates speak buttons via DOM methods.
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
