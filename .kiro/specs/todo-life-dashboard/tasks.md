# Implementation Plan: Todo Life Dashboard

## Overview

Build a single-page personal productivity dashboard using pure HTML5, CSS3, and Vanilla JavaScript (ES6+). The app ships as three files (`index.html`, `css/style.css`, `js/app.js`) with a companion test suite (`tests/`) using Vitest and fast-check. All state is persisted in `localStorage`. Implementation proceeds bottom-up: scaffolding → shared utilities → widget logic → HTML/CSS layout → wiring → tests.

---

## Tasks

- [x] 1. Project scaffolding and test infrastructure
  - [x] 1.1 Create the three-file project skeleton
    - Create `index.html` at the repo root with a standard HTML5 boilerplate, a `<link>` to `css/style.css`, and a `<script src="js/app.js" defer>` tag
    - Create `css/style.css` as an empty file with a top comment `/* Todo Life Dashboard – styles */`
    - Create `js/app.js` with the eight named comment section stubs:
      `/* === UTILITIES === */`, `/* === STORAGE === */`, `/* === GREETING WIDGET === */`,
      `/* === TIMER WIDGET === */`, `/* === TASKS WIDGET === */`, `/* === QUICK LINKS WIDGET === */`,
      `/* === THEME === */`, `/* === INIT === */`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 1.2 Set up Vitest + fast-check test infrastructure
    - Run `npm init -y` to create `package.json`
    - Install dev dependencies: `vitest`, `jsdom`, `@vitest/coverage-v8`, `fast-check` (pinned exact versions)
    - Create `vitest.config.js` with `environment: 'jsdom'` and `include: ['tests/**/*.test.js']`
    - Create `tests/` directory with a `setup.js` that calls `fc.configureGlobal({ numRuns: 100 })`
    - Add `"test": "vitest --run"` and `"test:watch": "vitest"` scripts to `package.json`
    - Create `tests/utils.js` with shared test helpers: `taskArb`, `linkArb`, `validLabelArb`, `validUrlArb` arbitraries for fast-check
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2. Storage module
  - [x] 2.1 Implement the Storage module in `js/app.js`
    - Inside `/* === STORAGE === */`, implement `Storage` object with:
      - `available` boolean property
      - `init()` — probe `localStorage` with a test write/read/remove inside `try/catch`; set `available`; if unavailable show a dismissible banner (`id="storage-banner"`) for ≥ 5 seconds without blocking interaction
      - `get(key, defaultValue)` — `JSON.parse(localStorage.getItem(key))` wrapped in `try/catch`; return `defaultValue` on any error
      - `set(key, value)` — `localStorage.setItem(key, JSON.stringify(value))` wrapped in `try/catch`; no-op when `available` is false
      - `remove(key)` — `localStorage.removeItem(key)` wrapped in `try/catch`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.2 Write unit tests for Storage module
    - Create `tests/storage.test.js`
    - Test: `get` returns `defaultValue` when key absent
    - Test: `get` returns `defaultValue` when stored value is corrupt JSON
    - Test: `set` followed by `get` round-trip returns original value
    - Test: `remove` deletes the key so subsequent `get` returns `defaultValue`
    - Test: when `localStorage` is mocked to throw, `available` is false and `set`/`get`/`remove` are no-ops
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Theme module
  - [x] 3.1 Implement the Theme module in `js/app.js`
    - Inside `/* === THEME === */`, implement `Theme` object with:
      - `current` property (`'light'` | `'dark'`)
      - `init()` — read `Storage.get('theme', 'light')`; if value is not `'light'` or `'dark'` fall back to `'light'`; call `apply()`; update toggle visual
      - `toggle()` — flip `current`; call `apply()`; call `Storage.set('theme', current)`; update toggle visual state
      - `apply(theme)` — `document.documentElement.setAttribute('data-theme', theme)`
    - Add `[data-theme="dark"]` CSS custom-property overrides in `css/style.css` (at minimum swap `--bg` and `--text` variables)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 3.2 Write property tests for Theme module
    - Create `tests/theme.test.js`
    - Extract pure functions `toggleTheme(t)` and `loadTheme(stored)` from the module logic for testing
    - **Property 13: Theme toggle is an involution** — `toggleTheme(toggleTheme(t)) === t` for any `t ∈ {'light','dark'}`
      - `// Feature: todo-life-dashboard, Property 13: Theme toggle is an involution`
      - **Validates: Requirements 7.1, 7.2**
    - **Property 14: Theme persistence round-trip** — saving a valid theme and reading it back returns the same value
      - `// Feature: todo-life-dashboard, Property 14: Theme persistence round-trip`
      - **Validates: Requirements 7.3, 7.4**
    - Unit test: invalid stored value `"invalid"` → `loadTheme` returns `'light'`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4. Greeting widget
  - [x] 4.1 Implement greeting logic helpers in `js/app.js`
    - Inside `/* === GREETING WIDGET === */`, implement:
      - `getGreeting(hour)` — pure function returning one of `'Good Morning'` / `'Good Afternoon'` / `'Good Evening'` / `'Good Night'` according to the hour-range table in the design
      - `formatTime(date)` — returns `HH:MM:SS` 24-hour string
      - `formatDate(date)` — returns human-readable date string (e.g., `"Monday, 26 August 2024"`)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 4.2 Write property and unit tests for greeting helpers
    - Create `tests/greeting.test.js`
    - **Property 1: Greeting exhaustiveness** — for any integer hour 0–23, `getGreeting(hour)` returns exactly one of the four valid strings
      - `// Feature: todo-life-dashboard, Property 1: Greeting text is determined solely by hour`
      - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
    - **Property 2: Name trim round-trip** — saving any string with ≥1 non-whitespace char and reading it back yields the trimmed string
      - `// Feature: todo-life-dashboard, Property 2: Name trim round-trip`
      - **Validates: Requirements 2.2, 2.3, 2.4**
    - **Property 3: Whitespace-only name clears key** — saving any all-whitespace string sets key to absent / null
      - `// Feature: todo-life-dashboard, Property 3: Whitespace-only name clears greeting suffix`
      - **Validates: Requirements 2.5**
    - Unit tests for boundary hours: 4, 5, 11, 12, 17, 18, 20, 21
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Implement the full Greeting widget in `js/app.js`
    - Implement `Greeting` object:
      - `init()` — `Storage.get('greeting_user_name', null)`; start `setInterval(tick, 1000)`; bind name form submit handler; call `tick()` immediately
      - `tick()` — wrap `new Date()` in `try/catch`; on failure clear interval; update `#clock`, `#date`, `#greeting` DOM nodes
      - `renderName()` — compose `"[Greeting], [Name]!"` or `"[Greeting]!"` and write to `#greeting`
      - `saveName(raw)` — trim; if non-empty persist to `Storage.set('greeting_user_name', trimmed)`, else `Storage.remove('greeting_user_name')`; call `renderName()`
    - Bind the name input (`#name-input`) and submit button (`#name-submit`) events
    - Show inline error if `Storage.available` is false after a name save attempt (Req 2.6)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Timer widget
  - [x] 5.1 Implement Timer pure logic helpers in `js/app.js`
    - Inside `/* === TIMER WIDGET === */`, implement pure/stateless helpers:
      - `setDuration(prev, n)` — validate `n` is integer in [1, 60]; return `{ accepted: true, duration: n }` or `{ accepted: false, duration: prev }`
      - `simulateTicks(durationMin, ticks)` — return `durationMin * 60 - ticks` (clamped to 0)
      - `simulateTimerEvents(events)` — pure state machine reducer over `['start','stop','reset']` events; return final state string
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3_

  - [x] 5.2 Write property and unit tests for Timer logic
    - Create `tests/timer.test.js`
    - **Property 4: Timer countdown monotonicity** — for any valid duration and tick count ≤ duration×60, remaining equals `duration×60 − ticks`
      - `// Feature: todo-life-dashboard, Property 4: Timer countdown monotonicity`
      - **Validates: Requirements 3.2, 3.3**
    - **Property 5: Timer state machine transition safety** — for any sequence of start/stop/reset events, resulting state is always in `{idle, running, paused, completed}`
      - `// Feature: todo-life-dashboard, Property 5: Timer state machine transition safety`
      - **Validates: Requirements 3.4, 3.7, 3.8**
    - **Property 6: Pomodoro duration range enforcement** — for any integer N, values outside [1,60] are rejected and previous duration retained; values inside [1,60] are accepted and persisted
      - `// Feature: todo-life-dashboard, Property 6: Pomodoro duration range enforcement`
      - **Validates: Requirements 4.1, 4.3**
    - Unit tests: concrete state transition sequences (start→running, stop→paused, reset→idle, countdown-to-0→completed)
    - _Requirements: 3.1–3.8, 4.1, 4.2, 4.3, 4.6_

  - [x] 5.3 Implement the full Timer widget in `js/app.js`
    - Implement `Timer` object with `state`, `remaining`, `intervalId`, `duration` properties
    - `init()` — load saved duration via `Storage.get('pomodoro_duration', 25)`; render idle state
    - `start()` — guard: only from idle/paused; `setInterval(tick, 1000)`; `state = 'running'`; call `render()`
    - `stop()` — guard: only from running; `clearInterval`; `state = 'paused'`; call `render()`
    - `reset()` — `clearInterval`; `state = 'idle'`; `remaining = duration * 60`; call `render()`
    - `tick()` — decrement `remaining`; if 0 call `complete()`; else call `render()`
    - `complete()` — `clearInterval`; `state = 'completed'`; call `render()`; call `playAlert()`
    - `setDuration(minutes)` — use `setDuration` helper; on accept persist `Storage.set('pomodoro_duration', minutes)`; if not running update display; on reject show inline error
    - `playAlert()` — `AudioContext` `OscillatorNode` beep, auto-stopped after ≤ 3 seconds; silent fail if AudioContext blocked
    - `render()` — update `#timer-display` with `MM:SS`; set `disabled` on start/stop controls per state rules (Req 3.7, 3.8)
    - Bind `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-duration` events
    - _Requirements: 3.1–3.8, 4.1–4.7_

- [x] 6. Tasks widget
  - [x] 6.1 Implement Task pure logic helpers in `js/app.js`
    - Inside `/* === TASKS WIDGET === */`, implement pure helpers:
      - `addTask(tasks, description)` — validate non-empty/non-whitespace; return new array with appended `Task` (`id` via `crypto.randomUUID()`, trimmed description, `complete: false`, `createdAt: Date.now()`); return `null` on invalid input
      - `toggleTask(task)` — return new task object with `complete` flipped
      - `tasksEqual(a, b)` — structural equality check (same ids, descriptions, completion states, createdAt, same order)
    - _Requirements: 5.2, 5.3, 5.5_

  - [x] 6.2 Write property and unit tests for Task logic
    - Create `tests/tasks.test.js`
    - **Property 7: Task addition grows the list** — for any task list of length N and any non-empty/non-whitespace string, `addTask` returns length N+1 with last item's description equal to trimmed input
      - `// Feature: todo-life-dashboard, Property 7: Task addition grows the list`
      - **Validates: Requirements 5.2**
    - **Property 8: Whitespace-only task description is rejected** — for any all-whitespace string, `addTask` returns null or unchanged list
      - `// Feature: todo-life-dashboard, Property 8: Whitespace-only task description is rejected`
      - **Validates: Requirements 5.3**
    - **Property 9: Task completion toggle is an involution** — `toggleTask(toggleTask(task)).complete === task.complete`
      - `// Feature: todo-life-dashboard, Property 9: Task completion toggle is an involution`
      - **Validates: Requirements 5.5**
    - **Property 10: Task persistence round-trip** — serialize to JSON and back produces structurally equal list
      - `// Feature: todo-life-dashboard, Property 10: Task persistence round-trip`
      - **Validates: Requirements 5.10, 5.11**
    - Unit tests: add task, delete by id, edit description, toggle specific task, empty description rejection
    - _Requirements: 5.2, 5.3, 5.5, 5.10, 5.11_

  - [x] 6.3 Implement the full Tasks widget in `js/app.js`
    - Implement `Tasks` object with `tasks` array property
    - `init()` — `Storage.get('todo_tasks', [])`; on parse error show error notice (Req 5.12); call `render()`
    - `add(description)` — use `addTask` helper; on null show inline error; on success call `persist()` + `render()` + clear input
    - `toggle(id)` — find task by id; use `toggleTask`; replace in array; call `persist()` + `render()`
    - `startEdit(id)` — swap task's display row to editable row (pre-populated input); focus input
    - `confirmEdit(id, newDesc)` — validate non-empty/non-whitespace; on valid save + `persist()` + `render()`; on invalid show inline error (Req 5.8)
    - `cancelEdit(id)` — restore display row without saving
    - `delete(id)` — splice from `tasks`; call `persist()` + `render()`
    - `persist()` — `Storage.set('todo_tasks', this.tasks)`
    - `render()` — clear `#task-list`; re-render all task rows (description, completion toggle, edit control, delete control); visually distinguish complete vs incomplete (Req 5.4)
    - Bind `#task-input` and `#task-add` events; delegate row-level events via `#task-list`
    - Ensure persistence happens within 1 second of any change (Req 5.10)
    - _Requirements: 5.1–5.12_

- [x] 7. Quick Links widget
  - [x] 7.1 Implement QuickLinks pure logic helpers in `js/app.js`
    - Inside `/* === QUICK LINKS WIDGET === */`, implement pure helpers:
      - `validateLink(label, url)` — check label non-empty (trimmed), url starts with `http://` or `https://`; return `{ valid: boolean, error: string | null }`
      - `addLink(links, label, url)` — validate; enforce max 50; return new array with appended `Link` (`id` via `crypto.randomUUID()`, trimmed label, url); return `null` on invalid or at-cap
    - _Requirements: 6.2, 6.3, 6.4, 6.7_

  - [x] 7.2 Write property and unit tests for QuickLinks logic
    - Create `tests/quicklinks.test.js`
    - **Property 11: Valid link accepted; invalid URL rejected** — for any label 1–50 chars and any URL string, result is accepted iff URL starts with `http://` or `https://`
      - `// Feature: todo-life-dashboard, Property 11: Valid link accepted; invalid URL rejected`
      - **Validates: Requirements 6.2, 6.4**
    - **Property 12: Quick Links cap enforcement** — for any list of exactly 50 links, attempting to add another leaves length at 50
      - `// Feature: todo-life-dashboard, Property 12: Quick Links cap enforcement`
      - **Validates: Requirements 6.7**
    - Unit tests: valid add, empty label rejection, missing URL rejection, invalid URL scheme rejection, delete by id
    - _Requirements: 6.2, 6.3, 6.4, 6.7_

  - [x] 7.3 Implement the full QuickLinks widget in `js/app.js`
    - Implement `QuickLinks` object with `links` array property
    - `init()` — `Storage.get('quick_links', [])`; call `render()`
    - `add(label, url)` — use `validateLink` and `addLink` helpers; on null/invalid show field-specific error (Req 6.3, 6.4); on success call `persist()` + `render()` + clear inputs
    - `delete(id)` — remove by id; call `persist()` + `render()`
    - `open(url)` — `window.open(url, '_blank', 'noopener,noreferrer')`
    - `persist()` — `Storage.set('quick_links', this.links)`
    - `render()` — clear `#links-container`; render each link as a `<button>` with delete control; when `links.length >= 50` disable add control and show limit message (Req 6.7)
    - Bind `#link-label`, `#link-url`, `#link-add` events; delegate delete/open events via `#links-container`
    - Ensure persistence within 500 ms of any change (Req 6.8); restore saved links within 1 second of load (Req 6.9)
    - _Requirements: 6.1–6.9_

- [x] 8. Checkpoint — core widget logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. HTML structure and CSS layout
  - [x] 9.1 Build the complete `index.html` markup
    - Add all semantic HTML sections: `<header>` for theme toggle, main `<section>` elements for each widget (greeting, timer, tasks, quick-links)
    - Include required IDs referenced by `js/app.js`: `#storage-banner`, `#clock`, `#date`, `#greeting`, `#name-input`, `#name-submit`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-duration`, `#task-input`, `#task-add`, `#task-list`, `#link-label`, `#link-url`, `#link-add`, `#links-container`, `#theme-toggle`
    - Ensure the `<link>` to `css/style.css` and `<script src="js/app.js" defer>` are present
    - Add `<noscript>` fallback notice
    - _Requirements: 11.1, 11.2, 10.1_

  - [x] 9.2 Implement CSS layout and theming in `css/style.css`
    - Define CSS custom properties on `:root` for colors, spacing, and typography (light theme defaults)
    - Add `[data-theme="dark"]` override block swapping all color variables
    - Lay out the dashboard as a responsive grid or flexbox that works across Chrome, Firefox, Edge, and Safari (Req 9.1–9.4)
    - Style each widget section with clear visual boundaries
    - Style task completion state: visually distinct complete vs incomplete rows (strike-through or muted color) (Req 5.4)
    - Style button `disabled` states for timer controls (Req 3.7, 3.8)
    - Style the storage banner as a dismissible, non-blocking notice at the top (Req 8.3)
    - Style inline error messages for each widget
    - Keep total page weight below 500 KB uncompressed; use no external fonts or libraries (Req 10.3)
    - _Requirements: 5.4, 7.1, 7.2, 9.1–9.5, 10.3, 11.1_

- [x] 10. Initialization wiring
  - [x] 10.1 Implement the `/* === INIT === */` section in `js/app.js`
    - Add a `DOMContentLoaded` listener that calls in order:
      `Storage.init()` → `Theme.init()` → `Greeting.init()` → `Timer.init()` → `Tasks.init()` → `QuickLinks.init()`
    - Bind the `#theme-toggle` click event to `Theme.toggle()`
    - Verify all DOM element queries resolve without errors (no null refs)
    - _Requirements: 10.1, 10.2, 11.2_

  - [x] 10.2 Write integration tests for initialization and cross-widget behavior
    - Create `tests/integration.test.js` using Vitest + jsdom
    - Test: dashboard init with pre-populated `localStorage` → all widgets render saved data (tasks, links, name, theme, duration)
    - Test: task add via DOM → `localStorage['todo_tasks']` updated within the same microtask/synchronous call (simulating Req 5.10)
    - Test: link add via DOM → `localStorage['quick_links']` updated (simulating Req 6.8)
    - Test: theme toggle via DOM → `document.documentElement.getAttribute('data-theme')` changes without page reload (Req 7.2)
    - Test: `localStorage` unavailable → storage banner appears in DOM (Req 8.3)
    - Test: corrupt `todo_tasks` in `localStorage` → Tasks widget renders empty list + error notice (Req 5.12)
    - _Requirements: 5.10, 5.11, 6.8, 6.9, 7.2, 7.4, 8.3, 10.1_

- [x] 11. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all unmarked tasks are required.
- Each task references specific requirements for full traceability back to `requirements.md`.
- Property tests use **fast-check** with a minimum of 100 runs each (`fc.configureGlobal({ numRuns: 100 })`).
- Pure helpers (e.g., `getGreeting`, `addTask`, `validateLink`, `setDuration`, `simulateTimerEvents`) must be exported or attached to `globalThis` in test mode so Vitest can import them without loading the full DOM.
- The `crypto.randomUUID()` call is available in all four target browsers' stable releases (Chrome, Firefox, Edge, Safari) without a polyfill.
- All three files (`index.html`, `css/style.css`, `js/app.js`) are deployed as-is to GitHub Pages — no build step.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "6.1", "7.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.2", "7.2"] },
    { "id": 7, "tasks": ["6.3", "7.3"] },
    { "id": 8, "tasks": ["9.1", "9.2"] },
    { "id": 9, "tasks": ["10.1"] },
    { "id": 10, "tasks": ["10.2"] }
  ]
}
```
