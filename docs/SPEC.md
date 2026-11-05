# Pomodoro + To-Do Desktop Widget — Build Spec

Status: all v1 decisions are resolved. See section 7.

Design reference (Figma): https://www.figma.com/design/Tux1vIzpQHqsBpn268frDa
(Layout and flow come from the Figma file. The visual style changes to frosted glass. See Visual style.)

---

## 1. Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 |
| UI | Svelte 5 + TypeScript + Vite |
| Data | SQLite via `tauri-plugin-sql` (tasks), `tauri-plugin-store` (settings) |
| Launch at login | `tauri-plugin-autostart` |
| Glass effect | `window-vibrancy` crate (macOS), transparent window |
| Font | Space Grotesk (Regular, Medium, Bold, no SemiBold) |
| Target | macOS only, universal build (Apple Silicon + Intel) |
| Distribution | GitHub Releases `.dmg`, built by GitHub Actions (`tauri-apps/tauri-action`, `--target universal-apple-darwin`) |

Excluded from v1: Windows, Linux, mobile, cloud sync, accounts, backend, Mac App Store, auto-update, menu bar icon, global shortcut, history/stats screen, dark mode.

Tauri config notes:
- `app.macOSPrivateApi: true`. A transparent window needs it. It is acceptable for GitHub distribution.
- Window: frameless, transparent, always on top, resizable.

---

## 2. Screens (names match Figma frames)

1. **Pomodoro tab, idle**: 25:00, mode switch (Focus / Short break / Long break), "No task selected" chip, Start button.
2. **Choose a task** (after tapping Start): list of unfinished tasks (radio select), "or task not listed", **Create new task** button, Start focus button.
3. **Create new task**: name field, pomodoro estimate stepper, "Create & start focus", Cancel.
4. **Running**: ring + countdown, current-task chip with "Change" link, reset / pause / skip.
5. **To-do tab**: "Today" list, per-task start button, add-task field.
6. **Minimized, running**: pill with smiling dog and countdown to its right.
7. **Minimized, idle**: neutral dog only.

Screens still to be designed in Figma (decided in behavior, no design yet):
- Confirmation dialog: start without a task
- Confirmation dialog: quit while a session is running
- Row icons for edit / delete / drag-to-reorder on tasks
- "Hide done tasks" toggle on the To-do tab
- "Add a task" while a session is running without a task
- Edit-estimate control on a task
- Settings screen
- Break state: same layout as the running screen (no separate design)

---

## 3. Behavior

### Timer
- Durations are fixed: Focus 25 min, Short break 5 min, Long break 15 min. Not editable.
- Nothing auto-starts. The user clicks to start every session and every break.
- Skip: ends the current session. A skipped focus session does NOT count as completed.
- Reset: restarts the current session at full duration and keeps it running. The reset session does not count.
- Break screen uses the same layout as the running screen.
- Remaining time is computed from a stored end timestamp (`end - now`), never from counting ticks.
- Mac sleep: the timer keeps counting by clock time.
- Quitting the app ends the session. A running session is NOT restored on next launch.
- When any session ends: play the lofi sound (if the sound switch is on).

### Start without a task
- Allowed, but show a confirmation first (e.g. "Start without a task?").
- A task can be added or attached after the session has started without one.
- "Change" on the running screen: switch the task and keep the timer running. The time continues and counts toward the new task.

### Tasks
- Fields: title, pomodoro estimate (editable), completed pomodoros, done, position.
- Pomodoro count (e.g. 2/3) goes up by 1 automatically when a focus session completes for that task. It stops at the estimate (3/3 stays 3/3).
- Reaching the estimate does not complete the task.
- Done is by checkbox only. Done tasks stay in the list, struck through. A toggle hides done tasks.
- Each task can be edited, deleted and reordered (drag handle). Controls shown as icons: pencil, trash, grip.
- Unfinished tasks carry over to the next day.
- The "Choose a task" list shows unfinished tasks only.

### Window
- Expanded window: 360 px wide, 600 px tall in the design. Resizable.
- Minimize button: shrinks to the minimized look. Running = dog + countdown pill. Idle = dog only.
- Minimized: click to expand. Drag anywhere to move. On release, and when it minimizes, it snaps to the nearest screen corner.
- Always on top, including over full-screen apps (verify this. It can need macOS window collection behavior or visible-on-all-workspaces).
- X button quits the app. If a session is running, ask for confirmation first.
- Launch at login: on/off in Settings.

### Dog
- Smiling face: while a focus session is running.
- Neutral face: idle, paused and breaks.
- Dog art is static images. Peeking over the Start button (with a paw) on the idle and choose-task screens. On the running screen the dog sits in front of the ring.

### Visual style
- Replaces the solid-gray neumorphic look: all white surfaces become semi-transparent frosted glass, in the spirit of Apple's glass, everywhere (not only when idle).
- Implementation: transparent window plus macOS vibrancy (`window-vibrancy`). CSS `backdrop-filter` alone will not blur the desktop behind a transparent window.
- Accent color: dusty pink sampled from the inside of the dog's ear (gradient #E39EAD to #BF7889). Text/icons otherwise gray.

### Settings (v1)
- Launch at login (on/off).
- Sound (on/off).

---

## 4. Data
- SQLite, local only, in the app's data folder (`~/Library/Application Support/<bundle id>/`). No history table in v1.
- `tasks`: id, title, estimate, completed_pomodoros, done, position, created_at.
- Settings in `tauri-plugin-store`.
- Uninstalling the app does not delete this data.

---

## 5. Edge cases to handle
- Empty task list: show an empty state. Choose-a-task shows only "Create new task".
- Empty or whitespace-only task title: block creation.
- Session ends while the Mac was asleep: on wake, show it as ended and play the sound.
- Estimate edited below the current completed count: blocked (see Decisions, item 8).

---

## 6. Release
- GitHub Actions workflow on tag `v*`: macOS runner, Rust targets `aarch64-apple-darwin` and `x86_64-apple-darwin`, `tauri-action` with `--target universal-apple-darwin`, draft release.
- Users download the `.dmg` from the repo's Releases page and drag the app to Applications.
- Unsigned build: macOS blocks first launch. On macOS 15+, go to System Settings > Privacy & Security > Open Anyway, or run `xattr -cr /Applications/<app>.app`. A signed and notarized build needs a paid Apple Developer account.

---

## 7. Decisions (resolved 2026-11-05)

Confirmed by the owner:
1. App name "Stitch in Time" (the dog is Stitch). Bundle id `com.christinecruz.stitchintime`. Repo `stitch-in-time`. MIT license.
2. Unsigned release.
3. Session-end sound: a lofi sound file that the owner supplies (replaces the bark). Use a placeholder until the file arrives. No macOS notification.
4. Settings has a sound on/off switch and Launch at login.
5. Long break comes after every 4 completed focus sessions.
6. Reset restarts the timer: back to full duration, and it keeps running.
7. A focus session that ends while the Mac is asleep counts toward the task.

Defaults chosen by the developer. The owner asked for no more questions. Change these on request.
8. Estimate range is 1 to 10. The stepper cannot go below the completed count.
9. Delete is immediate, with an Undo toast for 5 seconds.
10. Done tasks stay in Today, struck through, until "Hide done tasks" hides them.
11. First launch opens at the top-right of the main screen. The expanded window remembers its last position.
12. Cmd+Q uses the same quit confirmation as the X button.
