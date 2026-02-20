# ROM Tutor — Technical Specification

## Overview

ROM Tutor is a Progressive Web App (PWA) for learning Romanian in preparation for the Romanian citizenship oath ceremony (jurământul de credință). The app targets Ukrainian/English speakers at beginner Romanian level who need to:

- Memorize and recite the citizenship oath
- Answer officials' questions in Romanian at the ceremony
- Build foundational Romanian language skills (A1 → B1)

**Live:** https://rom-tutor.vercel.app
**Repo:** https://github.com/crazyproducer/rom-tutor

---

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Vanilla JS (ES Modules) | Zero build step, opens from `index.html`, small bundle |
| Routing | Hash-based SPA (`#/path`) | Works with `file://` protocol, no server required |
| State | Custom Store + localStorage | Single-user app, no backend needed |
| SRS | SM-2 (SuperMemo 2) | Proven spaced repetition algorithm |
| Styling | CSS Custom Properties | Light/dark themes without preprocessors |
| Offline | Service Worker (cache-first) | All static assets cached on first load |
| TTS | Lingva Translate API (primary) + Web Speech API (fallback) | Google-quality Romanian pronunciation via open-source CORS proxy |
| STT | Web Speech API (`SpeechRecognition`) | Romanian speech-to-text input (Chrome/Edge) |
| Hosting | Vercel (static) | Auto-deploy, global CDN |
| i18n | Custom `t(key)` / `tr(obj)` | UI in Ukrainian + English; content trilingual (ro/uk/en) |

---

## File Structure

```
rom-tutor/
├── index.html                        # App shell (header, main, bottom nav)
├── manifest.json                     # PWA manifest
├── sw.js                             # Service Worker — cache-first strategy
├── spec.md                           # This file
├── .gitignore
├── icons/
│   ├── icon-192.svg                  # PWA icon 192x192
│   └── icon-512.svg                  # PWA icon 512x512
├── css/
│   └── styles.css                    # All styles, themes, responsive
├── js/
│   ├── app.js                        # Entry point, init, router setup, SW registration
│   ├── router.js                     # Hash-based SPA router with parameterized routes
│   ├── store.js                      # Centralized state + localStorage persistence
│   ├── components/
│   │   ├── dashboard.js              # Home screen (stats, review card, oath meter, modules)
│   │   ├── lesson-list.js            # Module grid grouped by phase
│   │   ├── lesson-view.js            # Module detail with learning mode cards
│   │   ├── flashcard.js              # SRS flashcards with 3D flip animation
│   │   ├── quiz.js                   # Auto-generated quizzes (MC + fill-blank + mic)
│   │   ├── grammar.js                # Grammar viewer (tables, comparisons, exercises + mic)
│   │   ├── dialogue.js               # Active translation dialogues (type/speak Romanian)
│   │   ├── oath-trainer.js           # Oath: learn / build / recite modes (+ mic)
│   │   ├── ceremony-sim.js           # Full ceremony simulation (oath + active Q&A)
│   │   ├── progress.js               # Profile, stats, achievements
│   │   ├── settings.js               # Language, theme, toggles, export/import
│   │   ├── nav.js                    # Bottom navigation (stub)
│   │   └── header.js                 # Top header (stub)
│   └── services/
│       ├── srs.js                    # SM-2 algorithm implementation
│       ├── gamification.js           # XP, levels, streaks, achievements
│       ├── audio.js                  # TTS: Lingva Translate API + Web Speech fallback
│       ├── stt.js                    # STT: Web Speech Recognition mic buttons
│       └── utils.js                  # Helpers, i18n strings, loadJSON, answer comparison
└── data/
    ├── modules.json                  # Full 16-module curriculum structure
    ├── oath.json                     # Oath text (5 segments) + anthem (2 stanzas)
    ├── achievements.json             # 9 achievement definitions
    ├── vocabulary/
    │   ├── 01-basics.json            # ~50 words: alphabet, pronouns, basic verbs
    │   ├── 02-greetings.json         # ~30 phrases: formal/informal greetings
    │   ├── 15-oath-anthem.json       # ~20 words: oath-specific vocabulary
    │   └── 16-ceremony-qa.json       # ~35 phrases: ceremony questions/answers
    ├── grammar/
    │   ├── 01-alphabet.json          # Alphabet, special chars, Ukrainian comparison
    │   └── 02-nouns-articles.json    # Nouns, articles, gender/number
    └── dialogues/
        ├── 01-meeting-someone.json   # Introduction dialogue (6 turns)
        ├── 07-ceremony-arrival.json  # Arriving at the ceremony
        ├── 08-ceremony-interview.json # Full ceremony interview Q&A
        └── 09-history-quiz.json      # Romanian history & geography Q&A
```

---

## Architecture

### App Shell (`index.html`)

Single HTML file with three persistent regions:
- **Header** (`#app-header`): Back button, title, streak counter, XP counter
- **Main** (`#app-content`): Dynamic view container rendered by router
- **Nav** (`#app-nav`): 5 bottom tabs — Home, Lessons, Review, Oath, Profile

### Router (`js/router.js`)

Hash-based SPA router supporting parameterized routes.

**Routes:**

| Hash | Component | Description |
|------|-----------|-------------|
| `#/` | Dashboard | Home screen |
| `#/lessons` | LessonList | Module grid |
| `#/lessons/:moduleId` | LessonView | Module detail |
| `#/flashcards` | Flashcard | All due cards review |
| `#/flashcards/:moduleId` | Flashcard | Module-specific cards |
| `#/quiz/:moduleId` | Quiz | Auto-generated quiz |
| `#/grammar/:moduleId` | Grammar | Grammar viewer |
| `#/dialogue/:dialogueId` | Dialogue | Interactive dialogue |
| `#/oath` | OathTrainer | Oath learn/build/recite |
| `#/ceremony` | CeremonySim | Full ceremony simulation |
| `#/profile` | Progress | Stats and achievements |
| `#/settings` | Settings | App settings |

Each route handler receives `(container, params)` and may return a cleanup function called on route change.

### State Management (`js/store.js`)

Singleton `Store` class with:
- Private `#state` object persisted to `localStorage` under key `rom-tutor-state`
- `get(path)` — dot-notation access (e.g., `store.get('profile.totalXP')`)
- `update(path, value)` — set value at path, auto-persist, notify subscribers
- `merge(path, partial)` — shallow merge at path
- `subscribe(fn)` — listener called on every state change, returns unsubscribe function
- `exportData()` / `importData(json)` — full state backup/restore
- `reset()` — restore defaults
- `#migrate(state)` — merges saved state with `DEFAULT_STATE` for forward compatibility

**Default state shape:**

```js
{
  version: 1,
  settings: {
    theme: 'light',              // 'light' | 'dark' | 'auto'
    primaryLanguage: 'uk',       // 'uk' | 'en'
    secondaryLanguage: 'en',
    dailyGoalMinutes: 15,
    showPronunciation: true,
    autoPlayAudio: false,
    ttsEngine: 'google',         // 'google' (Lingva proxy) | 'browser' (Web Speech API)
    moduleLocking: true
  },
  profile: {
    startDate: '2025-01-01',
    totalXP: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalStudyMinutes: 0,
    sessionsCompleted: 0
  },
  moduleProgress: {},            // { 'mod-01': { completedLessons: [...], ... } }
  srsCards: {},                  // { 'v-0101': { interval, repetitions, easeFactor, nextReview, ... } }
  achievements: [],              // ['first-lesson', 'streak-7', ...]
  oathProgress: {
    segmentsMastered: [],
    fullRecitationAttempts: 0,
    bestScore: 0
  },
  dailyLog: {}                   // { '2025-01-01': { minutesStudied, xpEarned, cardsReviewed, lessonsCompleted } }
}
```

---

## Components

### Component Pattern

All components follow the same signature:

```js
export function ComponentName(container, store, router, ...params) {
  // 1. Build DOM using createElement (NO innerHTML — enforced by security hook)
  // 2. Append to container
  // 3. Load data via loadJSON() if needed
  // 4. Return optional cleanup function
}
```

**Security constraint:** No `innerHTML` usage anywhere. All DOM is constructed with `document.createElement()`, `textContent`, `appendChild`, and `document.createElementNS()` for SVG elements.

### Dashboard (`dashboard.js`)

- Greeting in Romanian ("Bună ziua!")
- Stats grid: study day count, current streak, total XP, current level
- Daily review card showing due SRS card count with link to flashcard review
- Oath readiness meter: SVG circular progress (0-100%) based on `oathProgress.bestScore`
- Module grid: first 4 active modules as cards with progress indicators

### Lesson List (`lesson-list.js`)

- Modules grouped by phase (Foundation A1, Expansion A2, Civic Knowledge B1, Ceremony B1)
- Each module card shows: emoji icon, title, description, progress bar
- "Coming soon" badge for modules without content (mod-03 through mod-14)
- Module locking: modules unlock sequentially when `settings.moduleLocking` is enabled

### Lesson View (`lesson-view.js`)

- Module title and description
- Learning mode cards: Flashcards, Quiz, Grammar, Dialogue (shown based on module's available types)
- Special cards for mod-15 (Oath Trainer) and mod-16 (Ceremony Simulation)
- Each card navigates to the corresponding component route

### Flashcard (`flashcard.js`)

- Loads vocabulary from module's JSON file
- Initializes SRS card state for new words via `initCard()`
- Card display: Romanian word on front, translation + pronunciation + example on back
- 3D flip animation on click/tap
- Speaker button (SVG via `createElementNS`) triggers TTS pronunciation
- 4 SRS answer buttons: Again (quality=0), Hard (quality=2), Good (quality=4), Easy (quality=5)
- Progress bar showing position in session
- Session summary at end: cards reviewed count, XP earned
- Awards XP via `awardXP('flashcardSession')`

### Quiz (`quiz.js`)

- Auto-generates 10 questions from module vocabulary
- ~70% multiple choice, ~30% fill-in-the-blank
- Multiple choice: 4 options (1 correct + 3 distractors from same module)
- Fill-in-the-blank: user types Romanian translation + microphone button for speech input
- Immediate feedback after each question (correct/incorrect highlight)
- Scoring: XP awarded at 70% threshold (`quizPass`) and 90% threshold (`quizExcellent`)
- Final summary with score percentage

### Grammar (`grammar.js`)

- Loads grammar JSON file for module
- Section types: `explanation`, `table`, `comparison`, `practice`
- Tables render as styled HTML tables (verb conjugations, noun declensions)
- Comparison sections show Romanian vs Ukrainian parallels
- Practice sections have inline exercises with microphone button for speech input
- "Mark complete" button at bottom

### Dialogue (`dialogue.js`)

Active translation dialogue system where users practice producing Romanian:

- Loads dialogue JSON by `dialogueId` parameter
- Chat-bubble UI: official's messages on left (with TTS auto-play), user's responses on right
- **NPC turns:** Official speaks Romanian → bubble shows Romanian text + translation
- **Player turns:** Ukrainian/English prompt shown (e.g., "Say your full name, date of birth, origin") → user types or speaks the Romanian translation via text input + microphone button
- Answer scoring via `compareRomanianAnswer()`: word-by-word positional comparison against the "excellent" option
- Detailed feedback display:
  - Colored word diff (green = correct, red = wrong, gray = missing, strikethrough = extra)
  - Match percentage shown
  - Expected correct Romanian answer displayed
  - Feedback text from the excellent option (in user's language)
  - "Also acceptable" alternative answer when available
  - Listen button to hear the correct pronunciation
- Score mapping: `≥80%` → 3pts, `≥50%` → 2pts, else → 1pt per turn
- Final summary with percentage, emoji, XP earned
- Retry button resets all state for replay
- Awards XP via `awardXP('dialogueComplete')`

### Oath Trainer (`oath-trainer.js`)

Three modes accessed via segmented control:

**Learn mode:**
- Oath displayed segment by segment (5 segments)
- Each segment shows: Romanian text, translation, pronunciation guide, grammar notes
- Speaker button for TTS pronunciation
- "Mark mastered" per segment

**Build mode:**
- Oath words shuffled randomly
- User taps words in correct order to reconstruct the oath
- Visual feedback: correct words lock in place, incorrect flash red
- Awards XP per segment via `awardXP('oathSegment')`

**Recite mode:**
- Full oath text shown briefly then hidden
- User types oath from memory in a textarea with microphone button for speech input
- "Check" button performs word-by-word diff comparison
- Score: percentage of correct words
- Saves best score to `oathProgress.bestScore`
- Awards XP via `awardXP('oathFull')` at 90%+

### Ceremony Simulation (`ceremony-sim.js`)

Full mock ceremony flow:
1. **Intro**: Briefing on what to expect
2. **Oath recitation**: Type/speak the oath from memory in a textarea with microphone button (scored)
3. **Q&A round**: Officials ask questions in Romanian (with TTS) → user sees Ukrainian/English prompt → types or speaks the Romanian translation via text input + microphone button
4. **Result**: Overall score combining oath accuracy + Q&A translation accuracy, XP awarded, pass/fail indicator

Q&A phase uses the same active translation approach as Dialogue: `compareRomanianAnswer()` scores each answer, shows word diff with colored feedback, displays the expected correct Romanian answer, and provides a "Listen" button for pronunciation.

### Progress (`progress.js`)

- Level circle with current level number and title (e.g., "Începător", "Elev")
- Stats grid: current streak, total XP, words learned (SRS card count), best streak
- Achievement grid: earned achievements shown with icon + title, locked ones grayed out

### Settings (`settings.js`)

- Language selector: Ukrainian / English (segmented control)
- Theme selector: Light / Dark / Auto (segmented control)
- TTS engine selector: Google (accurate, via Lingva proxy) / Browser (offline) (segmented control)
- Daily goal slider (5-60 minutes)
- Toggles: show pronunciation, auto-play audio, sequential module unlock
- Export progress (copies JSON to clipboard)
- Import progress (paste JSON)
- Reset all progress (with confirmation)

---

## Services

### SRS — SM-2 Algorithm (`srs.js`)

Implementation of the SuperMemo 2 spaced repetition algorithm.

**Card state:**
```js
{
  interval: 0,        // days until next review
  repetitions: 0,     // consecutive correct answers
  easeFactor: 2.5,    // difficulty multiplier (min 1.3)
  nextReview: '2025-01-01',
  lastReview: null,
  quality: null        // last answer quality (0-5)
}
```

**Quality mapping from UI:**
- Again → 0 (complete failure, reset to interval=1)
- Hard → 2 (hard but recalled, reset to interval=1)
- Good → 4 (correct with some effort)
- Easy → 5 (perfect recall)

**Interval progression:** 1 day → 6 days → `interval * easeFactor`

**Functions:**
- `calculateSRS(card, quality)` → updated card state
- `isDue(card)` → boolean
- `getDueCards(srsCards)` → sorted array (most overdue first)
- `initCard(wordId)` → new card with today's review date
- `getCardStats(srsCards)` → `{ total, due, learning, mature, new }`

### Gamification (`gamification.js`)

**XP awards:**
| Action | XP |
|--------|-----|
| flashcardSession | 20 |
| lessonComplete | 30 |
| quizPass (70%+) | 25 |
| quizExcellent (90%+) | 40 |
| dialogueComplete | 35 |
| oathSegment | 15 |
| oathFull (90%+) | 50 |
| dailyLogin | 10 |

**Level formula:** `level = min(30, floor(sqrt(xp / 50)) + 1)`

**Level titles (30 levels, 6 tiers):**
| Levels | Romanian | Ukrainian | English |
|--------|----------|-----------|---------|
| 1-3 | Începător | Початківець | Beginner |
| 4-7 | Elev | Учень | Student |
| 8-12 | Vorbitor | Мовець | Speaker |
| 13-18 | Cunoscător | Знавець | Knower |
| 19-24 | Avansat | Просунутий | Advanced |
| 25-30 | Cetățean | Громадянин | Citizen |

**Streaks:** Tracked daily. Increments if user studies on consecutive days, resets to 1 on gap > 1 day.

**Achievements (9):**
| ID | Condition |
|----|-----------|
| first-lesson | 1 session completed |
| first-10-words | 10 SRS cards |
| streak-7 | 7-day streak |
| streak-30 | 30-day streak |
| oath-memorized | Oath score 90%+ |
| vocab-100 | 100 SRS cards |
| vocab-500 | 500 SRS cards |
| level-10 | Reach level 10 |
| level-20 | Reach level 20 |

### Audio — TTS (`audio.js`)

Dual-engine text-to-speech system with user-selectable engine via Settings:

**Engine 1 — Lingva Translate (default, `ttsEngine: 'google'`):**
- Open-source Google Translate proxy with CORS support
- Multiple instances for reliability: `lingva.ml`, `translate.plausibility.cloud`
- API: `GET /api/v1/audio/{lang}/{text}` → JSON `{ audio: [byte array] }` → MP3 Blob → `Audio` element
- Automatic failover between instances; falls back to Web Speech API if all fail
- Long text split into ≤180-char chunks at sentence boundaries, played sequentially
- Playback rate: 0.9x for clear pronunciation

**Engine 2 — Web Speech API (`ttsEngine: 'browser'`):**
- Browser built-in `SpeechSynthesis` — works offline
- Romanian voice auto-detected from available voices
- Playback rate: 0.85x

**Public API:**
- `speak(text, lang='ro-RO')` — speaks using selected engine
- `stop()` — cancels current speech (both engines)
- `attachSpeakListeners(container)` — binds click handlers to `.speak-btn` elements
- Pre-loads Web Speech voices on init

### Speech-to-Text — STT (`stt.js`)

Web Speech Recognition API wrapper for Romanian speech input (Chrome/Edge required):

- `createMicButton(target, lang, opts)` — creates a microphone button linked to an `<input>` or `<textarea>`
  - `target`: the form field to fill with recognized speech
  - `lang`: BCP-47 code (default `'ro-RO'`)
  - `opts.mode`: `'replace'` (overwrite field) or `'append'` (add to existing text)
  - Returns `HTMLButtonElement` or `null` if unsupported (graceful degradation)
- Manages single active session (new session aborts any previous one)
- Shows interim results in the field as user speaks
- Visual feedback: `.mic-listening` CSS class with pulsing red animation
- `isSTTSupported()` — feature detection
- `stopSTT()` — abort any active session

**Integrated into:** Quiz (fill-in-blank), Grammar (practice exercises), Oath Trainer (recite textarea), Ceremony Simulation (oath textarea + Q&A input), Dialogue (translation input)

### Utilities (`utils.js`)

- `shuffle(array)` — Fisher-Yates shuffle
- `today()` → `'YYYY-MM-DD'`
- `daysAgo(dateStr)` → number of days
- `formatDate(dateStr)` → localized date string
- `escapeHtml(str)` — XSS-safe text escaping
- `clamp(value, min, max)`
- `pickRandom(array, count)`
- `loadJSON(path)` → parsed JSON or null
- `setLanguage(lang)` / `t(key)` / `tr(obj)` / `applyI18n()` / `getLang()` — i18n system
- `compareRomanianAnswer(userText, expectedText)` — word-level answer scoring (see below)

**`compareRomanianAnswer()`** — shared by Dialogue and Ceremony Simulation:
- Normalizes both texts: lowercase, strip punctuation `.,!?;:„""''()`, collapse whitespace
- Treats `[bracketed placeholders]` (e.g., `[Nume]`, `[Oraș]`, `[X]`) as wildcards that auto-match any user word
- Word-by-word positional comparison
- Returns `{ percentage, correctCount, totalExpected, diffElement }` where `diffElement` is a DOM node with colored spans:
  - `.word-correct` (green) — exact match
  - `.word-wrong` (red) — mismatch
  - `.word-missing` (gray, italic) — user skipped this word
  - `.word-extra` (gray, strikethrough) — user typed extra words

**i18n:** 75+ UI strings in Ukrainian and English covering navigation, common actions, flashcards, quiz, oath, ceremony, dialogue translation prompts, settings, progress, and TTS/STT labels. `t(key)` returns the current-language string. `tr(obj)` returns the best available translation from a trilingual content object `{ ro, uk, en }`.

---

## Curriculum

### 4 Phases, 16 Modules

**Phase 1: Foundation (A1) — Modules 1-5**
1. Alphabet & Pronunciation (ă, â, î, ș, ț) ✅
2. Greetings & Introductions (formal/informal, tu/dumneavoastră) ✅
3. Family & Relationships *(coming soon)*
4. Numbers, Time, Dates *(coming soon)*
5. Daily Life *(coming soon)*

**Phase 2: Expansion (A2) — Modules 6-10**
6. Work & Education *(coming soon)*
7. Travel & Places *(coming soon)*
8. Food & Shopping *(coming soon)*
9. Health & Body *(coming soon)*
10. Home & City *(coming soon)*

**Phase 3: Civic Knowledge (B1) — Modules 11-14**
11. Government & Law *(coming soon)*
12. History & Geography *(coming soon)*
13. Culture & Traditions *(coming soon)*
14. Romanian Constitution *(coming soon)*

**Phase 4: Ceremony Preparation (B1) — Modules 15-16**
15. The Oath & National Anthem ✅
16. Ceremony Simulation ✅

✅ = active with full content (vocabulary, grammar, dialogues)

### Data Schema

**Vocabulary word:**
```json
{
  "id": "v-0101",
  "ro": "da",
  "en": "yes",
  "uk": "так",
  "pronunciation": "dah",
  "partOfSpeech": "adverb",
  "example": { "ro": "Da, sunt din Ucraina.", "en": "Yes, I am from Ukraine.", "uk": "Так, я з України." },
  "notes": { "en": "...", "uk": "..." },
  "tags": ["basic", "essential"],
  "difficulty": 1
}
```

**Oath segment:**
```json
{
  "id": "oath-s1",
  "ro": "Jur",
  "en": "I swear",
  "uk": "Я присягаю",
  "pronunciation": "zhoor",
  "grammar": { "en": "1st person singular...", "uk": "1 особа однини..." }
}
```

**Dialogue — NPC turn:**
```json
{
  "speaker": "romanian",
  "text": { "ro": "Bună ziua! Mă numesc Ana. Cum vă numiți?" },
  "translation": { "en": "Good day! My name is Ana. What is your name?", "uk": "Добрий день! Мене звати Ана. Як вас звуть?" }
}
```

**Dialogue — Player turn (active translation):**
```json
{
  "speaker": "you",
  "prompt": { "en": "Introduce yourself with your name and where you're from", "uk": "Представтесь: ваше ім'я і звідки ви" },
  "options": [
    {
      "text": "Bună ziua! Mă numesc [Nume]. Sunt din Ucraina.",
      "quality": "excellent",
      "feedback": { "en": "Excellent! Complete greeting with name and origin.", "uk": "Чудово! Повне привітання з ім'ям і походженням." }
    },
    {
      "text": "Bună ziua. Mă numesc [Nume].",
      "quality": "acceptable",
      "feedback": { "en": "Good, but try adding where you're from.", "uk": "Добре, але спробуйте додати звідки ви." }
    }
  ]
}
```

The `prompt` field provides the Ukrainian/English instruction shown to the user. The `excellent` option's `text` is the expected Romanian answer used for scoring via `compareRomanianAnswer()`. `[Bracketed]` words are placeholder wildcards that auto-match any user input at that position.

---

## Styling

### Themes

Light and dark themes via `[data-theme]` attribute on `<html>`.

**Light theme:** White surfaces (#FFFFFF), light gray background (#F8F9FA), blue primary (#1565C0)
**Dark theme:** Dark navy surfaces (#1A1F2E), near-black background (#0F1419), bright blue primary (#42A5F5)

Romanian tricolor accent colors: Blue #002B7F, Yellow #FCD116, Red #CE1126

### Responsive Design

Mobile-first with breakpoints:
- **< 768px**: Single column, bottom nav, compact cards
- **768px - 1024px**: Wider cards, more grid columns
- **> 1024px**: Max-width 800px centered, desktop-optimized spacing

### Key CSS Variables

```css
--header-height: 56px;
--nav-height: 64px;
--max-width: 800px;
--radius: 12px;
--transition: 0.2s ease;
--font: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
```

### Notable UI Components (CSS)

**Microphone button (`.mic-btn`):** Circular button with mic SVG icon. When active, `.mic-listening` class triggers a pulsing red animation (`@keyframes mic-pulse`) to indicate recording state.

**Answer diff (`.answer-diff`):** Inline word-level comparison display used in Dialogue and Ceremony Q&A. Child spans colored by match quality: `.word-correct` (green), `.word-wrong` (red with line-through), `.word-missing` (gray italic), `.word-extra` (gray strikethrough).

**Translation prompt (`.translate-prompt`):** Card showing the Ukrainian/English instruction for what to say in Romanian. Contains `.prompt-label` and `.prompt-text`.

**Expected answer box (`.expected-answer-box`):** Reveals the correct Romanian answer after scoring. Contains `.expected-label` and `.expected-text`.

**Also acceptable (`.also-acceptable`):** Shows alternative correct answers from the `acceptable` option.

---

## PWA

### Manifest (`manifest.json`)

- `display: standalone`
- `orientation: portrait-primary`
- `theme_color: #1565C0`
- SVG icons (192x192 and 512x512)

### Service Worker (`sw.js`)

**Strategy:** Cache-first with network fallback.

**Install:** Pre-caches all 43 static assets (HTML, CSS, JS, JSON data, icons) including `stt.js` and `09-history-quiz.json`.
**Activate:** Deletes old cache versions, claims all clients via `skipWaiting()` + `clients.claim()`.
**Fetch:** Returns cached response if available, otherwise fetches from network and caches successful GET responses. Falls back to `index.html` for document requests (SPA support).

**Cache name:** `rom-tutor-v6` — bump version to invalidate cache on deploy.

---

## Expanding Content

To add a new module (e.g., mod-03 "Family"):

1. Create `data/vocabulary/03-family.json` with words following the vocabulary schema
2. Create `data/grammar/03-adjectives.json` with grammar sections
3. Create `data/dialogues/02-talking-about-family.json` with dialogue turns
4. In `data/modules.json`, set `"comingSoon": false` for mod-03 and populate its `lessons` array
5. Add the new files to the `ASSETS` array in `sw.js`
6. Bump the `CACHE_NAME` version in `sw.js`

No code changes needed — the infrastructure handles all module types automatically.

---

## Development

### Running Locally

```bash
# Serve via HTTP (required for ES Modules)
npx http-server -p 8080

# Open in browser
open http://localhost:8080
```

### Key Conventions

- **No innerHTML** — all DOM built with `createElement`, `textContent`, `appendChild`
- **No build step** — ES Modules loaded natively by the browser
- **No external dependencies** — zero `node_modules`
- **Component functions** receive `(container, store, router, ...params)`
- **Data files** in `data/` as JSON, loaded at runtime via `fetch()`
- **Trilingual content** objects: `{ ro: "...", uk: "...", en: "..." }`
