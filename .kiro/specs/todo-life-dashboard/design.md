# Design Document

## Todo Life Dashboard

---

## Overview

The Todo Life Dashboard is a single-page personal productivity application built with pure HTML5, CSS3, and Vanilla JavaScript (ES6+). It runs entirely in the browser with zero server-side dependencies — all state is persisted in the browser's `localStorage` API and all logic executes client-side.

The dashboard bundles five widgets on one page:

1. **Greeting Widget** — live clock (HH:MM:SS), current date, time-of-day greeting, optional personalized name
2. **Timer Widget** — Pomodoro countdown timer with start/stop/reset, configurable 1–60 min duration
3. **Todo Widget** — task list with add, edit, complete-toggle, and delete operations
4. **QuickLinks Widget** — favorite-site launcher storing label + URL pairs (max 50), opens in new tab
5. **Theme Toggle** — light/dark color-scheme switcher

The application ships as three files: `index.html`, `css/style.css`, and `js/app.js`. It deploys to GitHub Pages by serving `index.html` from the repository root — no build step required.

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (DOM)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ index.html   │  │css/style.css │  │   js/app.js      │   │
│  │  (markup /   │  │ (theming,    │  │  (all widget     │   │
│  │   structure) │  │  layout,     │  │   logic in one   │   │
│  │              │  │  animations) │  │   file)          │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                               │              │
│                    ┌──────────────────────────┤              │
│                    ▼                          ▼              │
│         ┌──────────────────┐    ┌─────────────────────────┐  │
│         │  DOM Event Layer │    │   localStorage API      │  │
│         │ (click, input,   │    │  (tasks, links, name,   │  │
│         │  keydown, etc.)  │    │   duration, theme)      │  │
│         └──────────────────┘    └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Module Sections in `js/app.js`

The single JavaScript file is organized into clearly delimited named comment sections — one per widget plus shared utilities — to satisfy the maintainability requirement (Req 11.3):

```
/* === UTILITIES === */
/* === STORAGE === */
/* === GREETING WIDGET === */
/* === TIMER WIDGET === */
/* === TASKS WIDGET === */
/* === QUICK LINKS WIDGET === */
/* === THEME === */
/* === INIT === */
```

Each section is self-contained: it owns its DOM query cache, event bindings, and render functions. Sections communicate only through the shared `Storage` layer and through direct DOM manipulation — there are no cross-widget function calls.

### Initialization Sequence

```
DOMContentLoaded
  │
  ├─► Storage.init()        — detect localStorage availability, show banner if unavailable
  ├─► Theme.init()          — read saved theme, apply before first paint
  ├─► Greeting.init()       — read saved name, start 1-second clock tick
  ├─► Timer.init()          — read saved duration, render idle state
  ├─► Tasks.init()          — read saved tasks, render list
  ├─► QuickLinks.init()     — read saved links, render buttons
  └─► (all widgets ready)
```

---

## Components and Interfaces

### 1. Storage Module

Centralizes all `localStorage` access. All reads return a parsed value or a specified default; all writes are wrapped in `try/catch`.

```js
Storage = {
  available: Boolean,           // set during init(); false if localStorage throws

  init()                        // probe localStorage; set available; show banner if needed
  get(key, defaultValue)        // JSON.parse(localStorage.getItem(key)) ?? defaultValue
  set(key, value)               // localStorage.setItem(key, JSON.stringify(value))
  remove(key)                   // localStorage.removeItem(key)
}
```

**Storage Keys**

| Key                    | Type      | Description                          |
|------------------------|-----------|--------------------------------------|
| `greeting_user_name`   | `string`  | Trimmed display name (may be absent) |
| `pomodoro_duration`    | `number`  | Duration in minutes (1–60)           |
| `todo_tasks`           | `Task[]`  | Serialized task array                |
| `quick_links`          | `Link[]`  | Serialized link array                |
| `theme`                | `string`  | `"light"` or `"dark"`               |

---

### 2. Greeting Widget

Responsible for the live clock, date display, time-of-day greeting, and name personalization.

**Interface**

```js
Greeting = {
  init()          // read saved name, start setInterval(tick, 1000), bind name form
  tick()          // read Date.now(), update clock/date/greeting DOM nodes
  renderName()    // compose "[Greeting], [Name]!" or "[Greeting]!" and update DOM
  saveName(raw)   // trim input; persist or remove key; call renderName()
}
```

**Greeting Logic**

| Hour range (24h) | Greeting text   |
|------------------|-----------------|
| 05 – 11          | Good Morning    |
| 12 – 17          | Good Afternoon  |
| 18 – 20          | Good Evening    |
| 21 – 04 (next)   | Good Night      |

---

### 3. Timer Widget

Manages the Pomodoro state machine.

**State Machine**

```
         start                 reaches 0
  idle ──────► running ────────────────► completed
    ▲             │ stop                     │
    │             ▼                          │ reset
    │          paused                        │
    │             │ start                    │
    │             └──────────► running       │
    │                                        │
    └────────────────── reset ───────────────┘
```

**Interface**

```js
Timer = {
  state: 'idle' | 'running' | 'paused' | 'completed',
  remaining: Number,            // seconds
  intervalId: Number | null,
  duration: Number,             // minutes, 1-60

  init()                        // load saved duration, render idle
  start()                       // guard: only from idle/paused; set interval
  stop()                        // guard: only from running; clear interval
  reset()                       // clear interval, restore remaining to duration * 60
  tick()                        // decrement remaining; if 0 → complete()
  complete()                    // transition to completed, play alert tone
  setDuration(minutes)          // validate 1-60; if not running update display; persist
  render()                      // update MM:SS display and button disabled states
  playAlert()                   // AudioContext beep, max 3 seconds
}
```

---

### 4. Tasks Widget

**Interface**

```js
Tasks = {
  tasks: Task[],

  init()                        // load from storage, render list
  add(description)              // validate non-empty/non-whitespace; push; persist; render
  toggle(id)                    // flip .complete; persist; render
  startEdit(id)                 // swap display row → editable row
  confirmEdit(id, newDesc)      // validate; save; swap back; persist; render
  cancelEdit(id)                // restore display row without saving
  delete(id)                    // splice from array; persist; render
  persist()                     // Storage.set('todo_tasks', this.tasks)
  render()                      // clear list container; re-render all Task rows
}
```

---

### 5. QuickLinks Widget

**Interface**

```js
QuickLinks = {
  links: Link[],

  init()                        // load from storage, render buttons
  add(label, url)               // validate label non-empty, url http(s)://; enforce max 50; persist; render
  delete(id)                    // remove by id; persist; render
  open(url)                     // window.open(url, '_blank', 'noopener,noreferrer')
  persist()                     // Storage.set('quick_links', this.links)
  render()                      // clear container; render Link buttons; toggle add-control disabled
}
```

---

### 6. Theme Module

**Interface**

```js
Theme = {
  current: 'light' | 'dark',

  init()                        // read saved theme; apply; update toggle visual
  toggle()                      // flip current; apply; persist; update toggle
  apply(theme)                  // document.documentElement.setAttribute('data-theme', theme)
}
```

CSS uses `[data-theme="dark"]` selectors on `:root` to swap CSS custom property values, ensuring all elements update in a single attribute change with no FOUC on load (Theme.init() runs before body paint).

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string}  id          - UUID v4 generated at creation time
 * @property {string}  description - 1–500 character task text (stored trimmed)
 * @property {boolean} complete    - false = incomplete, true = complete
 * @property {number}  createdAt   - Unix timestamp (ms) of creation
 */
```

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id    - UUID v4 generated at creation time
 * @property {string} label - 1–50 character display name (stored trimmed)
 * @property {string} url   - 1–2048 character URL beginning with http:// or https://
 */
```

### AppState (in-memory aggregate, not persisted as a whole)

```js
{
  storageAvailable: boolean,
  greeting: {
    name: string | null,
    tickIntervalId: number | null
  },
  timer: {
    state: 'idle' | 'running' | 'paused' | 'completed',
    remaining: number,          // seconds
    duration: number,           // minutes
    intervalId: number | null
  },
  tasks: Task[],
  links: Link[],
  theme: 'light' | 'dark'
}
```

### LocalStorage Serialization

Tasks and Links are serialized as JSON arrays. Example `todo_tasks` value:

```json
[
  {
    "id": "a1b2c3d4-...",
    "description": "Buy groceries",
    "complete": false,
    "createdAt": 1724668800000
  }
]
```

A corrupted or unparseable value is treated as a missing key — the widget initializes to an empty/default state and shows an error notice.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting text is determined solely by hour

*For any* local hour value (0–23), the greeting function SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night", and the mapping SHALL be exhaustive with no hour left unclassified.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Name trim round-trip

*For any* string containing at least one non-whitespace character, saving it as the user name and immediately reading it back from LocalStorage SHALL yield a string equal to the original string with leading and trailing whitespace removed.

**Validates: Requirements 2.2, 2.3, 2.4**

---

### Property 3: Whitespace-only name clears greeting suffix

*For any* string composed entirely of whitespace characters (including the empty string), submitting it as the user name SHALL result in the greeting displaying without a name suffix and the key `greeting_user_name` being absent from LocalStorage.

**Validates: Requirements 2.5**

---

### Property 4: Timer countdown monotonicity

*For any* valid Pomodoro duration D (1–60 minutes) and any number of elapsed ticks T where T ≤ D×60, the remaining time after T ticks SHALL equal (D×60 − T) seconds and SHALL never increase while the timer is in running state.

**Validates: Requirements 3.2, 3.3**

---

### Property 5: Timer state machine transition safety

*For any* sequence of start/stop/reset/complete events applied to the timer, the resulting state SHALL always be one of {idle, running, paused, completed}, and no transition SHALL produce a state that enables both Start and Stop controls simultaneously.

**Validates: Requirements 3.4, 3.7, 3.8**

---

### Property 6: Pomodoro duration range enforcement

*For any* integer input N, if N is outside the range [1, 60] the timer SHALL reject it and retain the previous valid duration; if N is within [1, 60] the timer SHALL accept it and persist it to LocalStorage.

**Validates: Requirements 4.1, 4.3**

---

### Property 7: Task addition grows the list

*For any* task list of length N and any non-empty, non-whitespace-only description string, adding that description SHALL produce a task list of length N+1 where the last element's description equals the trimmed input.

**Validates: Requirements 5.2**

---

### Property 8: Whitespace-only task description is rejected

*For any* string composed entirely of whitespace characters (including the empty string), attempting to add it as a task description SHALL leave the task list unchanged.

**Validates: Requirements 5.3**

---

### Property 9: Task completion toggle is an involution

*For any* task in the task list, toggling its completion state twice SHALL return the task to its original completion state.

**Validates: Requirements 5.5**

---

### Property 10: Task persistence round-trip

*For any* task list state, serializing it to LocalStorage and then deserializing it SHALL produce a task list that is structurally equal to the original (same ids, descriptions, completion states, and createdAt values in the same order).

**Validates: Requirements 5.10, 5.11**

---

### Property 11: Valid link is accepted; invalid URL is rejected

*For any* label string of 1–50 characters and a URL string, if the URL begins with `http://` or `https://` the link SHALL be accepted and added to the links list; otherwise it SHALL be rejected and the links list SHALL remain unchanged.

**Validates: Requirements 6.2, 6.4**

---

### Property 12: Quick Links cap enforcement

*For any* links list that has reached the maximum of 50 entries, attempting to add another link SHALL leave the list at exactly 50 entries.

**Validates: Requirements 6.7**

---

### Property 13: Theme toggle is an involution

*For any* active theme T ∈ {"light", "dark"}, toggling the theme twice SHALL result in the same theme T being active and the `data-theme` attribute on the document root reflecting T.

**Validates: Requirements 7.1, 7.2**

---

### Property 14: Theme persistence round-trip

*For any* valid theme value ("light" or "dark"), saving it to LocalStorage and reading it back on a fresh init SHALL apply that same theme before the first paint.

**Validates: Requirements 7.3, 7.4**

---

## Error Handling

### LocalStorage Unavailability

Detected at `Storage.init()` by performing a test write and catching any `SecurityError` or `DOMException`. When unavailable:

- `Storage.available` is set to `false`
- A visible, dismissible banner is shown at the top of the page for at least 5 seconds (Req 8.3)
- All widgets operate in in-memory mode: reads return defaults, writes are no-ops
- The banner does not block interaction with any widget

### Corrupt LocalStorage Data

On each `Storage.get()` call, `JSON.parse` is wrapped in `try/catch`. A parse failure:

- Returns the supplied `defaultValue` (e.g., `[]` for task list, `null` for name)
- Does **not** throw; the widget initializes to a safe empty/default state
- For tasks specifically: an error message is shown in the Todo Widget (Req 5.12)

### Input Validation Errors

| Widget       | Invalid input                             | Response                                              |
|--------------|-------------------------------------------|-------------------------------------------------------|
| Greeting     | Whitespace-only name                      | Clear name suffix; remove key from LocalStorage       |
| Timer        | Duration outside 1–60                     | Retain previous duration; show inline error message   |
| Tasks        | Empty / whitespace-only description       | Reject add/edit; show inline error; do not modify list|
| Quick Links  | Empty label or missing URL                | Reject; show field-specific error message             |
| Quick Links  | URL not starting with http:// or https:// | Reject; show URL format error message                 |
| Quick Links  | List at 50-link cap                       | Disable add control; show limit-reached message       |

### Timer Completion Alert

`AudioContext` beep is used for the audible alert (no external audio file dependency). The beep is created with `OscillatorNode` and stopped after no more than 3 seconds (Req 3.6). If `AudioContext` is blocked by browser autoplay policy, the completion state visual indicator alone is sufficient.

### Clock Read Failure (Req 1.7)

The `tick()` function wraps `new Date()` in `try/catch`. On failure it clears the interval, preserving the last rendered time and date without further updates.

---

## Testing Strategy

### Overview

The testing approach combines **unit/example-based tests** for specific behaviors and **property-based tests** for universal correctness guarantees. This is a pure-JavaScript in-browser application, so tests target the logic functions extracted from `app.js`, not the DOM directly (DOM interactions are covered by example-based integration tests).

**Recommended tooling:**

| Layer           | Tool                              |
|-----------------|-----------------------------------|
| Unit + Property | [Vitest](https://vitest.dev/)     |
| PBT library     | [fast-check](https://fast-check.io/) |
| DOM integration | Vitest + jsdom                    |

---

### Unit Tests (Example-Based)

Focus areas:

- **Greeting logic**: specific hour → expected greeting string (boundary values: 4, 5, 11, 12, 17, 18, 20, 21)
- **Timer state transitions**: concrete sequences (start → running, stop → paused, reset → idle, countdown to 0 → completed)
- **Task CRUD**: add one task, delete a task by id, toggle a specific task
- **Link validation**: specific valid URL, specific invalid URL, exactly-50 cap
- **Storage fallback**: when `localStorage` is mocked as unavailable, widgets operate in-memory
- **Theme init**: `"invalid"` saved theme → `"light"` applied (Req 7.6)

---

### Property-Based Tests

Each property corresponds to one correctness property from the Correctness Properties section above. All property tests use **fast-check** and run a minimum of **100 iterations**.

Tag format (comment above each test):
`// Feature: todo-life-dashboard, Property {N}: {property_text}`

#### Property 1: Greeting exhaustiveness
```
// Feature: todo-life-dashboard, Property 1: Greeting text is determined solely by hour
fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
  const result = getGreeting(hour);
  return ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'].includes(result);
})
```

#### Property 2: Name trim round-trip
```
// Feature: todo-life-dashboard, Property 2: Name trim round-trip
fc.property(fc.string().filter(s => s.trim().length > 0), (rawName) => {
  saveName(rawName);
  return loadName() === rawName.trim();
})
```

#### Property 3: Whitespace-only name clears key
```
// Feature: todo-life-dashboard, Property 3: Whitespace-only name clears greeting suffix
fc.property(fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')), (ws) => {
  saveName(ws);
  return loadName() === null;
})
```

#### Property 4: Timer countdown monotonicity
```
// Feature: todo-life-dashboard, Property 4: Timer countdown monotonicity
fc.property(fc.integer({ min: 1, max: 60 }), fc.nat(), (durationMin, ticks) => {
  const maxTicks = durationMin * 60;
  const actualTicks = ticks % (maxTicks + 1);
  const remaining = simulateTicks(durationMin, actualTicks);
  return remaining === maxTicks - actualTicks && remaining >= 0;
})
```

#### Property 5: Timer state machine safety
```
// Feature: todo-life-dashboard, Property 5: Timer state machine transition safety
fc.property(fc.array(fc.constantFrom('start','stop','reset')), (events) => {
  const state = simulateTimerEvents(events);
  const validStates = ['idle', 'running', 'paused', 'completed'];
  return validStates.includes(state);
})
```

#### Property 6: Pomodoro duration range enforcement
```
// Feature: todo-life-dashboard, Property 6: Pomodoro duration range enforcement
fc.property(fc.integer({ min: -1000, max: 1000 }), (n) => {
  const prev = 25;
  const result = setDuration(prev, n);
  if (n >= 1 && n <= 60) return result.accepted && result.duration === n;
  return !result.accepted && result.duration === prev;
})
```

#### Property 7: Task addition grows list
```
// Feature: todo-life-dashboard, Property 7: Task addition grows the list
fc.property(fc.array(taskArb), fc.string().filter(s => s.trim().length > 0), (tasks, desc) => {
  const result = addTask(tasks, desc);
  return result.length === tasks.length + 1 && result[result.length - 1].description === desc.trim();
})
```

#### Property 8: Whitespace task rejected
```
// Feature: todo-life-dashboard, Property 8: Whitespace-only task description is rejected
fc.property(fc.stringOf(fc.constantFrom(' ', '\t', '\n')), fc.array(taskArb), (ws, tasks) => {
  const result = addTask(tasks, ws);
  return result === null || result.length === tasks.length;
})
```

#### Property 9: Toggle involution
```
// Feature: todo-life-dashboard, Property 9: Task completion toggle is an involution
fc.property(taskArb, (task) => {
  return toggleTask(toggleTask(task)).complete === task.complete;
})
```

#### Property 10: Task persistence round-trip
```
// Feature: todo-life-dashboard, Property 10: Task persistence round-trip
fc.property(fc.array(taskArb), (tasks) => {
  const serialized = JSON.stringify(tasks);
  const deserialized = JSON.parse(serialized);
  return tasksEqual(tasks, deserialized);
})
```

#### Property 11: Link URL validation
```
// Feature: todo-life-dashboard, Property 11: Valid link accepted; invalid URL rejected
fc.property(validLabelArb, urlArb, (label, url) => {
  const result = validateLink(label, url);
  const isValid = url.startsWith('http://') || url.startsWith('https://');
  return result.valid === isValid;
})
```

#### Property 12: Quick Links cap enforcement
```
// Feature: todo-life-dashboard, Property 12: Quick Links cap enforcement
fc.property(fc.array(linkArb, { minLength: 50, maxLength: 50 }), validLabelArb, validUrlArb, (links, label, url) => {
  const result = addLink(links, label, url);
  return result.length === 50;
})
```

#### Property 13: Theme toggle involution
```
// Feature: todo-life-dashboard, Property 13: Theme toggle is an involution
fc.property(fc.constantFrom('light', 'dark'), (theme) => {
  return toggleTheme(toggleTheme(theme)) === theme;
})
```

#### Property 14: Theme persistence round-trip
```
// Feature: todo-life-dashboard, Property 14: Theme persistence round-trip
fc.property(fc.constantFrom('light', 'dark'), (theme) => {
  persistTheme(theme);
  return loadTheme() === theme;
})
```

---

### Integration Tests (DOM / jsdom)

Cover cross-widget behavior with jsdom:

- Dashboard init with pre-populated localStorage → all widgets render saved data within timing requirements
- Task add via DOM interaction → localStorage updated within 1 second (Req 5.10)
- Link add via DOM → link button appears and localStorage updated within 500 ms (Req 6.8)
- Theme toggle via DOM → `data-theme` attribute changes on `<html>`, no page reload
- LocalStorage unavailable scenario → dismissible banner appears within first render

---

### Test Configuration

```js
// vitest.config.js
export default {
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  }
}
```

Property tests run with `fast-check` defaults overridden to minimum 100 iterations:

```js
fc.configureGlobal({ numRuns: 100 });
```
