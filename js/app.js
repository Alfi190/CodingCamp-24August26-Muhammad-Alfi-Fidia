/* === UTILITIES === */

/* === STORAGE === */

const AppStorage = {
  available: false,

  /**
   * Probe localStorage availability with a test write/read/remove.
   * Sets `available`; shows a dismissible banner for ≥ 5 seconds if unavailable.
   */
  init() {
    const TEST_KEY = '__storage_test__';
    try {
      localStorage.setItem(TEST_KEY, '1');
      const val = localStorage.getItem(TEST_KEY);
      localStorage.removeItem(TEST_KEY);
      this.available = val === '1';
    } catch (e) {
      this.available = false;
    }

    if (!this.available) {
      this._showBanner();
    }
  },

  /**
   * Show a dismissible, non-blocking storage-unavailable banner for ≥ 5 seconds.
   * @private
   */
  _showBanner() {
    let banner = document.getElementById('storage-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'storage-banner';
      banner.setAttribute('role', 'alert');
      banner.innerHTML =
        '<span>Your browser does not support local storage or access is denied. ' +
        'Data will not be saved between sessions.</span>' +
        '<button id="storage-banner-dismiss" aria-label="Dismiss">&#x2715;</button>';
      document.body.prepend(banner);
    }

    banner.hidden = false;

    const dismissBtn = document.getElementById('storage-banner-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        banner.hidden = true;
      });
    }

    // Auto-hide after 5 seconds, but only if the user hasn't already dismissed it
    setTimeout(() => {
      if (!banner.hidden) {
        banner.hidden = true;
      }
    }, 5000);
  },

  /**
   * Read and JSON-parse a value from localStorage.
   * Returns `defaultValue` on any error (missing key, parse failure, access error).
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * JSON-serialize `value` and write it to localStorage.
   * No-op when `available` is false.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (!this.available) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Silently ignore write failures (e.g. quota exceeded)
    }
  },

  /**
   * Remove a key from localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Silently ignore removal failures
    }
  },
};

// Expose for testing (Vitest / Node environments)
if (typeof globalThis !== 'undefined') {
  globalThis.AppStorage = AppStorage;
}

/* === GREETING WIDGET === */

/**
 * Pure helper: return the time-of-day greeting for a given 24-hour value.
 * @param {number} hour - integer in [0, 23]
 * @returns {'Good Morning'|'Good Afternoon'|'Good Evening'|'Good Night'}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night'; // 21–23 and 00–04
}

/**
 * Pure helper: format a Date as HH:MM:SS (24-hour).
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Pure helper: format a Date as a human-readable string, e.g. "Monday, 26 August 2024".
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Expose pure helpers for Vitest / Node test environments
globalThis.getGreeting = getGreeting;
globalThis.formatTime  = formatTime;
globalThis.formatDate  = formatDate;

/**
 * Persist or clear the user's display name in AppStorage.
 * If the trimmed value is non-empty it is stored under 'greeting_user_name';
 * otherwise the key is removed so loadName() returns null.
 * @param {string} raw
 */
globalThis.saveName = (raw) => {
  const trimmed = (raw ?? '').trim();
  if (trimmed.length > 0) {
    AppStorage.set('greeting_user_name', trimmed);
  } else {
    AppStorage.remove('greeting_user_name');
  }
};

/**
 * Read the stored user name, or null if absent.
 * @returns {string|null}
 */
globalThis.loadName = () => AppStorage.get('greeting_user_name', null);

/**
 * Greeting Widget
 * Manages the live clock, current date display, time-of-day greeting,
 * and optional personalized name.
 */
const Greeting = {
  /** @type {string|null} */
  name: null,

  /** @type {number|null} interval handle from setInterval */
  tickIntervalId: null,

  /**
   * Initialize the Greeting widget:
   * - load saved name from storage
   * - start 1-second tick interval
   * - bind name form events
   * - run first tick immediately
   */
  init() {
    this.name = AppStorage.get('greeting_user_name', null);
    this.tick();
    this.tickIntervalId = setInterval(() => this.tick(), 1000);
    this._bindEvents();
  },

  /**
   * Called every second to update clock, date, and greeting display.
   * Wraps new Date() in try/catch; on failure clears the interval so
   * the last successfully rendered values remain (Req 1.7).
   */
  tick() {
    let now;
    try {
      now = new Date();
    } catch (e) {
      if (this.tickIntervalId !== null) {
        clearInterval(this.tickIntervalId);
        this.tickIntervalId = null;
      }
      return;
    }

    const clockEl = document.getElementById('clock');
    const dateEl  = document.getElementById('date');

    if (clockEl) clockEl.textContent = formatTime(now);
    if (dateEl)  dateEl.textContent  = formatDate(now);

    this.renderName(now);
  },

  /**
   * Compose and render the greeting message.
   * Format: "[Time-of-Day Greeting], [Name]!" when a name is set,
   *         "[Time-of-Day Greeting]!" otherwise.
   * @param {Date} [date] - Defaults to current Date if not provided.
   */
  renderName(date) {
    const greetingEl = document.getElementById('greeting');
    if (!greetingEl) return;

    const now  = date instanceof Date ? date : new Date();
    const base = getGreeting(now.getHours());
    greetingEl.textContent = this.name
      ? `${base}, ${this.name}!`
      : `${base}!`;
  },

  /**
   * Persist or clear the user name, then re-render the greeting.
   * Shows an inline error when AppStorage is unavailable (Req 2.6).
   * @param {string} raw - The raw value from the name input.
   */
  saveName(raw) {
    const trimmed = (raw ?? '').trim();

    if (trimmed.length > 0) {
      this.name = trimmed;
      AppStorage.set('greeting_user_name', trimmed);

      // Req 2.6: if storage is unavailable, show an inline error
      if (!AppStorage.available) {
        this._showNameError(
          'Your name could not be saved — local storage is unavailable. ' +
          'It will be used for this session only.'
        );
      } else {
        this._clearNameError();
      }
    } else {
      this.name = null;
      AppStorage.remove('greeting_user_name');
      this._clearNameError();
    }

    this.renderName();
  },

  /**
   * Bind the name input field and submit button events.
   * Supports both button click and Enter-key submission.
   * @private
   */
  _bindEvents() {
    const submitBtn  = document.getElementById('name-submit');
    const nameInput  = document.getElementById('name-input');

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const val = nameInput ? nameInput.value : '';
        this.saveName(val);
      });
    }

    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.saveName(nameInput.value);
        }
      });
    }
  },

  /**
   * Display an inline error message near the name input.
   * Creates the error element if it doesn't already exist.
   * @param {string} message
   * @private
   */
  _showNameError(message) {
    let errorEl = document.getElementById('name-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.id = 'name-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.className = 'error-message';
      const nameInput = document.getElementById('name-input');
      if (nameInput && nameInput.parentNode) {
        nameInput.parentNode.insertBefore(errorEl, nameInput.nextSibling);
      } else {
        document.body.appendChild(errorEl);
      }
    }
    errorEl.textContent = message;
    errorEl.hidden = false;
  },

  /**
   * Clear and hide the inline name error message if present.
   * @private
   */
  _clearNameError() {
    const errorEl = document.getElementById('name-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  },
};

/* === TIMER WIDGET === */

/**
 * Pure helper: validate and apply a new Pomodoro duration.
 * Accepts integer values in [1, 60]; rejects everything else.
 * @param {number} prev - The current valid duration (minutes).
 * @param {number} n    - The candidate new duration (minutes).
 * @returns {{ accepted: boolean, duration: number }}
 */
function setDuration(prev, n) {
  if (Number.isInteger(n) && n >= 1 && n <= 60) {
    return { accepted: true, duration: n };
  }
  return { accepted: false, duration: prev };
}

/**
 * Pure helper: compute remaining seconds after a given number of ticks.
 * Clamps at 0 — remaining time can never go negative.
 * @param {number} durationMin - Pomodoro duration in minutes (1–60).
 * @param {number} ticks       - Number of elapsed 1-second ticks.
 * @returns {number} Remaining seconds, ≥ 0.
 */
function simulateTicks(durationMin, ticks) {
  return Math.max(0, durationMin * 60 - ticks);
}

/**
 * Pure state machine reducer for timer events.
 * Processes an array of event strings and returns the final state.
 *
 * Valid transitions:
 *   idle     + 'start' → running
 *   running  + 'stop'  → paused
 *   running  + 'complete' → completed
 *   paused   + 'start' → running
 *   any      + 'reset' → idle
 *   (any other combination is a no-op — stays in current state)
 *
 * @param {string[]} events - Sequence of event strings.
 * @returns {'idle'|'running'|'paused'|'completed'} Final state.
 */
function simulateTimerEvents(events) {
  let state = 'idle';

  for (const event of events) {
    switch (event) {
      case 'start':
        if (state === 'idle' || state === 'paused') state = 'running';
        break;
      case 'stop':
        if (state === 'running') state = 'paused';
        break;
      case 'reset':
        state = 'idle';
        break;
      case 'complete':
        if (state === 'running') state = 'completed';
        break;
      default:
        // Unknown events are silently ignored.
        break;
    }
  }

  return state;
}

// Expose pure helpers for Vitest / Node test environments
globalThis.setDuration        = setDuration;
globalThis.simulateTicks      = simulateTicks;
globalThis.simulateTimerEvents = simulateTimerEvents;

const Timer = {
  state: 'idle',
  remaining: 1500, // default 25 minutes in seconds
  intervalId: null,
  duration: 25,

  init() {
    this.duration = AppStorage.get('pomodoro_duration', 25);
    this.remaining = this.duration * 60;
    this.state = 'idle';
    this._bindEvents();
    this.render();
  },

  start() {
    if (this.state === 'running') return;
    this.state = 'running';
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.render();
  },

  stop() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.render();
  },

  reset() {
    this.state = 'idle';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.remaining = this.duration * 60;
    this._clearError();
    this.render();
  },

  tick() {
    if (this.remaining > 0) {
      this.remaining--;
      this.render();
    }
    if (this.remaining === 0) {
      this.complete();
    }
  },

  complete() {
    this.state = 'completed';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.render();
    this.playAlert();
  },

  setDuration(minutes) {
    const prev = this.duration;
    const parsed = parseInt(minutes, 10);
    const result = setDuration(prev, parsed);
    if (result.accepted) {
      this.duration = result.duration;
      AppStorage.set('pomodoro_duration', result.duration);
      this._clearError();
      if (this.state !== 'running') {
        this.remaining = this.duration * 60;
        this.render();
      }
    } else {
      this._showError('Duration must be an integer between 1 and 60 minutes.');
    }
  },

  playAlert() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      setTimeout(() => {
        try {
          osc.stop();
          audioCtx.close();
        } catch (err) {}
      }, 1000); // 1 second beep
    } catch (e) {
      // Autoplay or browser block
    }
  },

  render() {
    const displayEl = document.getElementById('timer-display');
    if (displayEl) {
      const mm = String(Math.floor(this.remaining / 60)).padStart(2, '0');
      const ss = String(this.remaining % 60).padStart(2, '0');
      displayEl.textContent = `${mm}:${ss}`;
    }

    const containerEl = document.getElementById('timer-container');
    if (containerEl) {
      if (this.state === 'completed') {
        containerEl.classList.add('timer-completed');
      } else {
        containerEl.classList.remove('timer-completed');
      }
    }

    // Disable start control in running state
    const startBtn = document.getElementById('timer-start');
    if (startBtn) {
      startBtn.disabled = (this.state === 'running');
    }

    // Disable stop control in idle, paused, or completed states
    const stopBtn = document.getElementById('timer-stop');
    if (stopBtn) {
      stopBtn.disabled = (this.state !== 'running');
    }

    // Update duration input value if the user is not actively typing/focusing on it
    const durationInput = document.getElementById('timer-duration');
    if (durationInput && document.activeElement !== durationInput) {
      durationInput.value = this.duration;
    }
  },

  _bindEvents() {
    const startBtn = document.getElementById('timer-start');
    const stopBtn = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    const durationInput = document.getElementById('timer-duration');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.start());
    }
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
    if (durationInput) {
      durationInput.addEventListener('change', () => {
        this.setDuration(durationInput.value);
      });
      durationInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.setDuration(durationInput.value);
        }
      });
    }
  },

  _showError(msg) {
    let errEl = document.getElementById('timer-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'timer-error';
      errEl.className = 'error-message';
      errEl.setAttribute('role', 'alert');
      const durationInput = document.getElementById('timer-duration');
      if (durationInput && durationInput.parentNode) {
        durationInput.parentNode.insertBefore(errEl, durationInput.nextSibling);
      } else {
        document.body.appendChild(errEl);
      }
    }
    errEl.textContent = msg;
    errEl.hidden = false;
  },

  _clearError() {
    const errEl = document.getElementById('timer-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.hidden = true;
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.Timer = Timer;
}

/* === TASKS WIDGET === */

/**
 * Pure helper: add a new Task to a task list.
 * Validates that the description contains at least one non-whitespace character.
 * Returns a new array with the appended Task on success, or null on invalid input.
 *
 * @param {Task[]} tasks - The current task list.
 * @param {string} description - The raw description input from the user.
 * @returns {Task[]|null} New array with appended task, or null if input is invalid.
 */
function addTask(tasks, description) {
  const trimmed = (description ?? '').trim();
  if (trimmed.length === 0) return null;

  const newTask = {
    id: crypto.randomUUID(),
    description: trimmed,
    complete: false,
    createdAt: Date.now(),
  };

  return [...tasks, newTask];
}

/**
 * Pure helper: toggle the completion state of a Task.
 * Returns a new Task object with `complete` flipped — does not mutate the original.
 *
 * @param {Task} task - The task to toggle.
 * @returns {Task} A new task object with `complete` inverted.
 */
function toggleTask(task) {
  return { ...task, complete: !task.complete };
}

/**
 * Pure helper: structural equality check for two task lists.
 * Returns true iff both lists have the same length and every corresponding
 * task shares the same id, description, complete state, and createdAt value
 * in the same order.
 *
 * @param {Task[]} a
 * @param {Task[]} b
 * @returns {boolean}
 */
function tasksEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ta = a[i];
    const tb = b[i];
    if (
      ta.id !== tb.id ||
      ta.description !== tb.description ||
      ta.complete !== tb.complete ||
      ta.createdAt !== tb.createdAt
    ) {
      return false;
    }
  }
  return true;
}

// Expose pure helpers for Vitest / Node test environments
globalThis.addTask    = addTask;
globalThis.toggleTask = toggleTask;
globalThis.tasksEqual = tasksEqual;

const Tasks = {
  tasks: [],
  editingId: null,

  init() {
    if (AppStorage.available) {
      try {
        const raw = localStorage.getItem('todo_tasks');
        if (raw !== null) {
          this.tasks = JSON.parse(raw);
          if (!Array.isArray(this.tasks)) {
            throw new Error('Not an array');
          }
        } else {
          this.tasks = [];
        }
      } catch (e) {
        this.tasks = [];
        this._showError('Saved tasks could not be loaded.');
      }
    } else {
      this.tasks = [];
      this._showError('Saved tasks could not be loaded: local storage is unavailable.');
    }

    this._bindEvents();
    this.render();
  },

  add(description) {
    const result = addTask(this.tasks, description);
    if (result !== null) {
      this.tasks = result;
      this.persist();
      this.render();
      this._clearError();
      const inputEl = document.getElementById('task-input');
      if (inputEl) inputEl.value = '';
    } else {
      this._showError('Task description is required.');
    }
  },

  toggle(id) {
    this.tasks = this.tasks.map(t => t.id === id ? toggleTask(t) : t);
    this.persist();
    this.render();
  },

  startEdit(id) {
    this.editingId = id;
    this.render();
    const editInput = document.getElementById(`task-edit-input-${id}`);
    if (editInput) {
      editInput.focus();
      const val = editInput.value;
      editInput.value = '';
      editInput.value = val;
    }
  },

  confirmEdit(id, newDesc) {
    const trimmed = (newDesc ?? '').trim();
    if (trimmed.length > 0) {
      this.tasks = this.tasks.map(t => t.id === id ? { ...t, description: trimmed } : t);
      this.editingId = null;
      this.persist();
      this.render();
      this._clearError();
    } else {
      this._showError('Task description is required.');
      this.editingId = null;
      this.render();
    }
  },

  cancelEdit(id) {
    this.editingId = null;
    this.render();
  },

  delete(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.persist();
    this.render();
  },

  persist() {
    AppStorage.set('todo_tasks', this.tasks);
  },

  render() {
    const listEl = document.getElementById('task-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      if (task.complete) {
        li.classList.add('task-complete');
      }

      if (this.editingId === task.id) {
        li.innerHTML = `
          <div class="task-edit-container">
            <input type="text" id="task-edit-input-${task.id}" class="task-edit-input" value="${task.description}" maxlength="500">
            <div class="task-edit-buttons">
              <button class="task-save-btn btn-small" data-id="${task.id}">Save</button>
              <button class="task-cancel-btn btn-small btn-secondary" data-id="${task.id}">Cancel</button>
            </div>
          </div>
        `;
      } else {
        li.innerHTML = `
          <div class="task-display-container">
            <label class="task-label">
              <input type="checkbox" class="task-toggle" data-id="${task.id}" ${task.complete ? 'checked' : ''}>
              <span class="task-text">${task.description}</span>
            </label>
            <div class="task-actions">
              <button class="task-edit-btn btn-icon" data-id="${task.id}" aria-label="Edit task">✏️</button>
              <button class="task-delete-btn btn-icon btn-danger" data-id="${task.id}" aria-label="Delete task">🗑️</button>
            </div>
          </div>
        `;
      }
      listEl.appendChild(li);
    });
  },

  _bindEvents() {
    const addBtn = document.getElementById('task-add');
    const taskInput = document.getElementById('task-input');
    const listEl = document.getElementById('task-list');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (taskInput) this.add(taskInput.value);
      });
    }

    if (taskInput) {
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.add(taskInput.value);
        }
      });
    }

    if (listEl) {
      listEl.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.getAttribute('data-id');

        if (target.classList.contains('task-toggle')) {
          this.toggle(id);
        } else if (target.classList.contains('task-edit-btn')) {
          this.startEdit(id);
        } else if (target.classList.contains('task-delete-btn')) {
          this.delete(id);
        } else if (target.classList.contains('task-save-btn')) {
          const input = document.getElementById(`task-edit-input-${id}`);
          if (input) this.confirmEdit(id, input.value);
        } else if (target.classList.contains('task-cancel-btn')) {
          this.cancelEdit(id);
        }
      });

      listEl.addEventListener('keydown', (e) => {
        const target = e.target;
        if (target.classList.contains('task-edit-input')) {
          const id = target.id.replace('task-edit-input-', '');
          if (e.key === 'Enter') {
            this.confirmEdit(id, target.value);
          } else if (e.key === 'Escape') {
            this.cancelEdit(id);
          }
        }
      });
    }
  },

  _showError(msg) {
    let errEl = document.getElementById('task-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'task-error';
      errEl.className = 'error-message';
      errEl.setAttribute('role', 'alert');
      const inputContainer = document.getElementById('task-input-container') || document.getElementById('task-input');
      if (inputContainer && inputContainer.parentNode) {
        inputContainer.parentNode.insertBefore(errEl, inputContainer.nextSibling);
      } else {
        document.body.appendChild(errEl);
      }
    }
    errEl.textContent = msg;
    errEl.hidden = false;
  },

  _clearError() {
    const errEl = document.getElementById('task-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.hidden = true;
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.Tasks = Tasks;
}

/* === QUICK LINKS WIDGET === */

/**
 * Pure helper: validate a Quick Link entry.
 *
 * Rules (Requirements 6.2, 6.3, 6.4):
 *   - label must be non-empty after trimming
 *   - url must start with "http://" or "https://"
 *
 * @param {string} label
 * @param {string} url
 * @returns {{ valid: boolean, error: string | null }}
 */
function validateLink(label, url) {
  const trimmedLabel = (label ?? '').trim();
  const trimmedUrl   = (url   ?? '').trim();

  if (trimmedLabel.length === 0 && trimmedUrl.length === 0) {
    return { valid: false, error: 'Label and URL are required.' };
  }

  if (trimmedLabel.length === 0) {
    return { valid: false, error: 'Label is required.' };
  }

  if (trimmedUrl.length === 0) {
    return { valid: false, error: 'URL is required.' };
  }

  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://.' };
  }

  return { valid: true, error: null };
}

/**
 * Pure helper: add a new Link to the links array.
 *
 * - Validates via `validateLink`; returns `null` on invalid input (Req 6.3, 6.4).
 * - Enforces a maximum of 50 links; returns `null` when the cap is reached (Req 6.7).
 * - On success returns a new array with the Link appended (does NOT mutate the original).
 *
 * @param {Array<{id:string, label:string, url:string}>} links - Current links list.
 * @param {string} label - Display label (stored trimmed, 1–50 chars).
 * @param {string} url   - URL beginning with http:// or https://.
 * @returns {Array<{id:string, label:string, url:string}> | null}
 */
function addLink(links, label, url) {
  const validation = validateLink(label, url);
  if (!validation.valid) return null;

  if (links.length >= 50) return null;

  /** @type {{id: string, label: string, url: string}} */
  const newLink = {
    id:    crypto.randomUUID(),
    label: label.trim(),
    url:   url.trim(),
  };

  return [...links, newLink];
}

// Expose pure helpers for Vitest / Node test environments
globalThis.validateLink = validateLink;
globalThis.addLink      = addLink;

const QuickLinks = {
  links: [],

  init() {
    this.links = AppStorage.get('quick_links', []);
    this._bindEvents();
    this.render();
  },

  add(label, url) {
    const validation = validateLink(label, url);
    if (!validation.valid) {
      this._showError(validation.error);
      return;
    }

    const result = addLink(this.links, label, url);
    if (result !== null) {
      this.links = result;
      this.persist();
      this.render();
      this._clearError();
      const labelInput = document.getElementById('link-label');
      const urlInput = document.getElementById('link-url');
      if (labelInput) labelInput.value = '';
      if (urlInput) urlInput.value = '';
    } else {
      if (this.links.length >= 50) {
        this._showError('Maximum limit of 50 links reached.');
      } else {
        this._showError('Failed to add quick link.');
      }
    }
  },

  delete(id) {
    this.links = this.links.filter(l => l.id !== id);
    this.persist();
    this.render();
  },

  open(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  persist() {
    AppStorage.set('quick_links', this.links);
  },

  render() {
    const container = document.getElementById('links-container');
    if (!container) return;
    container.innerHTML = '';

    this.links.forEach(link => {
      const linkDiv = document.createElement('div');
      linkDiv.className = 'link-item';
      linkDiv.innerHTML = `
        <button class="link-btn btn-secondary" data-url="${link.url}">${link.label}</button>
        <button class="link-delete-btn btn-icon btn-danger" data-id="${link.id}" aria-label="Delete link">✕</button>
      `;
      container.appendChild(linkDiv);
    });

    const addBtn = document.getElementById('link-add');
    const labelInput = document.getElementById('link-label');
    const urlInput = document.getElementById('link-url');
    const capMsgEl = document.getElementById('links-cap-message');

    if (this.links.length >= 50) {
      if (addBtn) addBtn.disabled = true;
      if (labelInput) labelInput.disabled = true;
      if (urlInput) urlInput.disabled = true;
      if (capMsgEl) {
        capMsgEl.textContent = 'Maximum limit of 50 links reached.';
        capMsgEl.hidden = false;
      }
    } else {
      if (addBtn) addBtn.disabled = false;
      if (labelInput) labelInput.disabled = false;
      if (urlInput) urlInput.disabled = false;
      if (capMsgEl) {
        capMsgEl.textContent = '';
        capMsgEl.hidden = true;
      }
    }
  },

  _bindEvents() {
    const addBtn = document.getElementById('link-add');
    const labelInput = document.getElementById('link-label');
    const urlInput = document.getElementById('link-url');
    const container = document.getElementById('links-container');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const label = labelInput ? labelInput.value : '';
        const url = urlInput ? urlInput.value : '';
        this.add(label, url);
      });
    }

    if (labelInput) {
      labelInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && urlInput) {
          urlInput.focus();
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const label = labelInput ? labelInput.value : '';
          this.add(label, urlInput.value);
        }
      });
    }

    if (container) {
      container.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('link-btn')) {
          const url = target.getAttribute('data-url');
          this.open(url);
        } else if (target.classList.contains('link-delete-btn')) {
          const id = target.getAttribute('data-id');
          this.delete(id);
        }
      });
    }
  },

  _showError(msg) {
    let errEl = document.getElementById('link-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'link-error';
      errEl.className = 'error-message';
      errEl.setAttribute('role', 'alert');
      const inputContainer = document.getElementById('link-input-container') || document.getElementById('link-url');
      if (inputContainer && inputContainer.parentNode) {
        inputContainer.parentNode.insertBefore(errEl, inputContainer.nextSibling);
      } else {
        document.body.appendChild(errEl);
      }
    }
    errEl.textContent = msg;
    errEl.hidden = false;
  },

  _clearError() {
    const errEl = document.getElementById('link-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.hidden = true;
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.QuickLinks = QuickLinks;
}

/* === THEME === */

/**
 * Pure helper: toggle between 'light' and 'dark'.
 * Exposed on globalThis for unit/property testing without loading the full DOM.
 * @param {'light'|'dark'} t
 * @returns {'light'|'dark'}
 */
globalThis.toggleTheme = (t) => t === 'light' ? 'dark' : 'light';

/**
 * Pure helper: validate and return a stored theme value.
 * Falls back to 'light' for any value that is not exactly 'light' or 'dark'.
 * Exposed on globalThis for unit/property testing.
 * @param {*} stored
 * @returns {'light'|'dark'}
 */
globalThis.loadTheme = (stored) => (stored === 'light' || stored === 'dark') ? stored : 'light';

const Theme = {
  /** @type {'light'|'dark'} */
  current: 'light',

  /**
   * Read the saved theme from storage, validate it, apply it to the document,
   * and update the toggle button's visual state.
   * Runs before the first body paint (called early in DOMContentLoaded).
   */
  init() {
    const stored = AppStorage.get('theme', 'light');
    this.current = globalThis.loadTheme(stored);
    this.apply(this.current);
    this._updateToggle();
  },

  /**
   * Flip the active theme, apply it, persist it, and update the toggle visual.
   */
  toggle() {
    this.current = globalThis.toggleTheme(this.current);
    this.apply(this.current);
    AppStorage.set('theme', this.current);
    this._updateToggle();
  },

  /**
   * Set the `data-theme` attribute on the document root so CSS custom-property
   * overrides take effect immediately across all elements.
   * @param {'light'|'dark'} theme
   */
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  /**
   * Reflect the current theme in the toggle button's aria-label and text so
   * the visual state always matches the active theme.
   * @private
   */
  _updateToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (this.current === 'dark') {
      btn.setAttribute('aria-label', 'Switch to light theme');
      btn.textContent = '☀️';
    } else {
      btn.setAttribute('aria-label', 'Switch to dark theme');
      btn.textContent = '🌙';
    }
  },
};

/* === INIT === */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Storage
  AppStorage.init();

  // Initialize Theme
  Theme.init();

  // Initialize Greeting widget
  Greeting.init();

  // Initialize Timer widget
  if (typeof Timer !== 'undefined') {
    Timer.init();
  }

  // Initialize Tasks widget
  if (typeof Tasks !== 'undefined') {
    Tasks.init();
  }

  // Initialize QuickLinks widget
  if (typeof QuickLinks !== 'undefined') {
    QuickLinks.init();
  }

  // Bind Theme Toggle Button Event
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      Theme.toggle();
    });
  }
});
