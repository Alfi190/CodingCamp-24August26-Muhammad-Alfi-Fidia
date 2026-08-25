# Requirements Document

## Introduction

The Todo Life Dashboard is a web-based personal productivity dashboard built with HTML, CSS, and Vanilla JavaScript only (no frameworks). It runs entirely in the browser with all data stored in the browser's Local Storage. The dashboard gives users a single-page view of their day, combining a greeting with live clock, a Pomodoro focus timer, a to-do list manager, and a quick-links launcher. Optional challenges add light/dark theme toggling, custom name personalization, and configurable Pomodoro duration.

## Glossary

- **Dashboard**: The single HTML page that renders all widgets.
- **Greeting_Widget**: The UI section displaying the current time, date, and personalized greeting message.
- **Timer_Widget**: The Pomodoro focus timer UI section.
- **Todo_Widget**: The to-do list UI section.
- **QuickLinks_Widget**: The favorite-websites launcher UI section.
- **Task**: A single to-do item with at minimum a text description and a completion state.
- **Link**: A Quick Links entry containing a display label and a URL.
- **LocalStorage**: The browser's `localStorage` API used for client-side persistence.
- **Theme**: The active color scheme of the Dashboard, either "light" or "dark".
- **Pomodoro_Duration**: The configurable countdown length for the Timer_Widget, expressed in minutes.
- **Session**: A single browser page load.

---

## Requirements

### Requirement 1: Live Greeting Display

**User Story:** As a user, I want to see the current time, date, and a greeting that changes based on the time of day, so that I immediately feel oriented when I open the dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in HH:MM:SS 24-hour format, updated every second.
2. THE Greeting_Widget SHALL display the current local date in a human-readable format (e.g., "Monday, 26 August 2024").
3. WHEN the local hour is between 05:00 and 11:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local hour is between 18:00 and 20:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the local hour is between 21:00 and 04:59 (inclusive), THE Greeting_Widget SHALL display the greeting "Good Night".
7. IF the local time cannot be read, THEN THE Greeting_Widget SHALL display the last successfully retrieved time and date without further updates.

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to enter my name so that the greeting addresses me personally.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide an input field that accepts a name of 1 to 50 characters.
2. WHEN the user submits a name containing at least 1 non-whitespace character, THE Greeting_Widget SHALL display the greeting in the format "[Time-of-Day Greeting], [Name]!" where the name is trimmed of leading and trailing whitespace.
3. WHEN the user submits a name containing at least 1 non-whitespace character, THE Dashboard SHALL persist the trimmed name in LocalStorage under the key "greeting_user_name".
4. WHEN the Dashboard loads and LocalStorage contains a non-empty value under the key "greeting_user_name", THE Greeting_Widget SHALL display the saved name in the greeting without requiring re-entry.
5. WHEN the user submits an empty or whitespace-only name, THE Greeting_Widget SHALL display the greeting without a name suffix and THE Dashboard SHALL remove the key "greeting_user_name" from LocalStorage.
6. IF LocalStorage is unavailable or write access is denied, THEN THE Dashboard SHALL display the greeting using the entered name for the current session without persisting it, and SHALL display an error message indicating that the name could not be saved.

---

### Requirement 3: Pomodoro Focus Timer

**User Story:** As a user, I want a countdown timer that I can start, stop, and reset, so that I can work in focused Pomodoro sessions.

#### Acceptance Criteria

1. THE Timer_Widget SHALL initialize in idle state with a default countdown duration of 25 minutes (1500 seconds).
2. WHEN the user activates the Start control, IF the timer is in idle or paused state, THEN THE Timer_Widget SHALL transition to running state and begin counting down the remaining time in one-second intervals.
3. WHILE the timer is in running state, THE Timer_Widget SHALL update the displayed minutes and seconds every second.
4. WHEN the user activates the Stop control, IF the timer is in running state, THEN THE Timer_Widget SHALL transition to paused state and retain the remaining time.
5. WHEN the user activates the Reset control, THE Timer_Widget SHALL stop any active countdown, transition to idle state, and restore the displayed time to the current Pomodoro_Duration.
6. WHEN the countdown reaches zero, THE Timer_Widget SHALL transition to completed state, stop counting, display a visible completion indicator, and play an audible alert lasting no longer than 3 seconds.
7. WHILE the timer is in running state, THE Timer_Widget SHALL disable the Start control to prevent duplicate intervals.
8. WHILE the timer is in idle, paused, or completed state, THE Timer_Widget SHALL disable the Stop control.

---

### Requirement 4: Configurable Pomodoro Duration

**User Story:** As a user, I want to change the Pomodoro duration from the default 25 minutes, so that I can adapt the timer to my preferred work rhythm.

#### Acceptance Criteria

1. THE Timer_Widget SHALL provide an input mechanism that allows the user to set a Pomodoro_Duration between 1 minute and 60 minutes (inclusive).
2. WHEN the user sets a valid Pomodoro_Duration, IF the timer is not running, THEN THE Timer_Widget SHALL update the displayed time to reflect the new duration without requiring additional user action.
3. IF the user sets a Pomodoro_Duration outside the range 1–60 minutes, THEN THE Timer_Widget SHALL reject the input, retain the previous Pomodoro_Duration, and display an error message indicating the value must be between 1 and 60 minutes.
4. WHEN the user sets a valid Pomodoro_Duration, THE Dashboard SHALL automatically persist the new value in LocalStorage without requiring a separate save action.
5. WHEN the Dashboard loads, IF LocalStorage contains a previously saved Pomodoro_Duration, THEN THE Timer_Widget SHALL initialize with that saved duration.
6. WHEN the Dashboard loads, IF LocalStorage does not contain a previously saved Pomodoro_Duration, THEN THE Timer_Widget SHALL initialize with a default Pomodoro_Duration of 25 minutes.
7. WHEN the user sets a valid Pomodoro_Duration, IF the timer is running, THEN THE Timer_Widget SHALL apply the new Pomodoro_Duration to the next session without interrupting the current session.

---

### Requirement 5: To-Do List Management

**User Story:** As a user, I want to add, edit, mark as done, and delete tasks, so that I can track and manage my daily to-dos.

#### Acceptance Criteria

1. THE Todo_Widget SHALL provide an input field accepting up to 500 characters and an add control that allows the user to create a new Task.
2. WHEN the user submits a non-empty task description, THE Todo_Widget SHALL add the new Task to the task list with a default completion state of incomplete and clear the input field.
3. WHEN the user submits an empty or whitespace-only task description, THE Todo_Widget SHALL reject the input, display an error message indicating the description is required, and SHALL not create a Task.
4. THE Todo_Widget SHALL display all Tasks in the task list, each showing its description and current completion state, with incomplete Tasks visually distinct from complete Tasks.
5. WHEN the user activates the completion toggle for a Task, THE Todo_Widget SHALL toggle the Task's completion state between incomplete and complete.
6. WHEN the user activates the edit control for a Task, THE Todo_Widget SHALL replace the Task's description display with an editable field pre-populated with the current description.
7. WHEN the user confirms an edited Task description that is non-empty and not whitespace-only, THE Todo_Widget SHALL save the updated description and return the Task to its display state.
8. WHEN the user confirms an edited Task description that is empty or whitespace-only, THE Todo_Widget SHALL reject the change, display an error message indicating the description is required, and restore the original description.
9. WHEN the user activates the delete control for a Task, THE Todo_Widget SHALL remove that Task from the task list immediately without requiring additional confirmation.
10. WHEN any Task is added, modified, toggled, or deleted, THE Dashboard SHALL persist the complete updated task list to LocalStorage within 1 second of the change.
11. WHEN the Dashboard loads and LocalStorage contains a previously saved task list, THE Todo_Widget SHALL restore and display all saved Tasks within 2 seconds of the Dashboard load event.
12. IF LocalStorage is unavailable or returns a parse error when reading the task list, THEN THE Todo_Widget SHALL initialize with an empty task list and display an error message indicating that saved tasks could not be loaded.

---

### Requirement 6: Quick Links Launcher

**User Story:** As a user, I want to save and open my favorite websites as quick-access buttons, so that I can navigate to them without typing URLs.

#### Acceptance Criteria

1. THE QuickLinks_Widget SHALL provide an input field accepting a display label of up to 50 characters and a URL of up to 2048 characters, and an add control for creating a new Link.
2. WHEN the user submits a non-empty label and a URL beginning with "http://" or "https://", THE QuickLinks_Widget SHALL add the new Link as a clickable button and clear both input fields.
3. IF the user submits an empty label or an empty URL, THEN THE QuickLinks_Widget SHALL reject the input, display an error message identifying which field is missing, and SHALL not create a Link.
4. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE QuickLinks_Widget SHALL reject the input, display an error message indicating the URL must start with http:// or https://, and SHALL not create a Link.
5. WHEN the user activates a Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
6. THE QuickLinks_Widget SHALL provide a delete control for each Link that removes it from the links list.
7. THE QuickLinks_Widget SHALL enforce a maximum of 50 saved Links; WHEN the limit is reached, the add control SHALL be disabled and a message SHALL indicate the limit has been reached.
8. WHEN any Link is added or deleted, THE Dashboard SHALL persist the updated links list to LocalStorage within 500 milliseconds of the change.
9. WHEN the Dashboard loads and LocalStorage contains a previously saved links list, THE QuickLinks_Widget SHALL restore and display all saved Links within 1 second of the Dashboard load event.

---

### Requirement 7: Light / Dark Theme Toggle

**User Story:** As a user, I want to switch between a light and dark color scheme, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches the active Theme between "light" and "dark", with the toggle's visual state reflecting the currently active Theme.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected Theme to all visible UI elements without a page reload.
3. WHEN the user activates the theme toggle, THE Dashboard SHALL persist the selected Theme in LocalStorage.
4. WHEN the Dashboard loads and LocalStorage contains a previously saved Theme value of "light" or "dark", THE Dashboard SHALL apply that Theme before the first paint of body content.
5. WHEN the Dashboard loads and LocalStorage does not contain a saved Theme, THE Dashboard SHALL apply the "light" Theme as the default.
6. WHEN the Dashboard loads and LocalStorage contains a saved Theme value that is not "light" or "dark", THE Dashboard SHALL discard the invalid value and apply the "light" Theme as the default.

---

### Requirement 8: Client-Side Data Persistence

**User Story:** As a user, I want my tasks, quick links, name, timer settings, and theme preference to survive a page refresh, so that I do not lose my data between browser sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL use the browser LocalStorage API as the sole persistence mechanism for all user data.
2. THE Dashboard SHALL store all user data exclusively on the client side and SHALL not transmit any user data to external servers.
3. IF LocalStorage is unavailable or throws an access error, THEN THE Dashboard SHALL continue to operate in-memory for the current Session and SHALL display a visible, dismissible non-blocking notice to the user that data will not be saved, shown for at least 5 seconds without preventing interaction with the Dashboard.

---

### Requirement 9: Browser Compatibility

**User Story:** As a user, I want the dashboard to work correctly in any modern browser I choose, so that I am not restricted to a specific browser.

#### Acceptance Criteria

1. THE Dashboard SHALL pass all acceptance criteria defined in this document without uncaught JavaScript errors and without broken layout in the current stable release of Google Chrome.
2. THE Dashboard SHALL pass all acceptance criteria defined in this document without uncaught JavaScript errors and without broken layout in the current stable release of Mozilla Firefox.
3. THE Dashboard SHALL pass all acceptance criteria defined in this document without uncaught JavaScript errors and without broken layout in the current stable release of Microsoft Edge.
4. THE Dashboard SHALL pass all acceptance criteria defined in this document without uncaught JavaScript errors and without broken layout in the current stable release of Apple Safari.
5. THE Dashboard SHALL use only standard HTML5, CSS3, and ECMAScript 2015 (ES6) or later features that are supported by all four browsers listed above without polyfills.

---

### Requirement 10: Performance and Responsiveness

**User Story:** As a user, I want the dashboard to load quickly and respond immediately to my interactions, so that I have a smooth, lag-free experience.

#### Acceptance Criteria

1. THE Dashboard SHALL complete initial rendering and become interactive (all controls accepting input) within 3 seconds on a connection of at least 10 Mbps download speed and no more than 40 ms round-trip latency.
2. WHEN the user interacts with any control (button, input, toggle), THE Dashboard SHALL reflect the result of that interaction within 100 milliseconds.
3. THE Dashboard SHALL use no external JavaScript frameworks, CSS frameworks, or third-party libraries, keeping the total page weight below 500 KB uncompressed.

---

### Requirement 11: Code Structure and Maintainability

**User Story:** As a developer, I want the codebase to follow a clean single-file-per-type structure, so that the project is easy to read, maintain, and deploy.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented as exactly one HTML file, exactly one CSS file located in a `css/` directory, and exactly one JavaScript file located in a `js/` directory.
2. THE Dashboard SHALL use the HTML file as the entry point, linking the single CSS file and the single JavaScript file.
3. THE Dashboard's JavaScript file SHALL contain a named comment block for each widget section: greeting, tasks, quick links, timer, and theme.
4. THE Dashboard SHALL be deployable to GitHub Pages by serving the root HTML file as the index without a build step.
