// App state shared by all screens (Svelte 5 runes).
import { db } from './db';
import {
  loadSettings, playSessionEnd, quitApp, saveSound, setLaunchAtLogin, setWindowShape, type Settings,
} from './native';
import { clampEstimate, countAfterFocus, reorder, validTitle, type Task } from './tasks';
import * as timer from './timer';

export type Tab = 'todo' | 'pomodoro';
/** 'choose' and 'create' have two purposes: start a focus, or change the task of a session. */
export type View = 'main' | 'choose' | 'create' | 'settings';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

class AppState {
  timer = $state(timer.initialTimer());
  now = $state(Date.now());
  tasks = $state<Task[]>([]);
  currentTaskId = $state<number | null>(null);
  tab = $state<Tab>('pomodoro');
  view = $state<View>('main');
  /** True when 'choose'/'create' change the task of an active session. */
  changing = $state(false);
  minimized = $state(false);
  hideDone = $state(false);
  settings = $state<Settings>({ sound: true, launchAtLogin: false });
  confirm = $state<ConfirmRequest | null>(null);
  undo = $state<{ task: Task; wasCurrent: boolean } | null>(null);
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  remaining = $derived(timer.remaining(this.timer, this.now));
  active = $derived(this.timer.status !== 'idle');
  focusRunning = $derived(this.timer.mode === 'focus' && this.timer.status === 'running');
  currentTask = $derived(this.tasks.find((t) => t.id === this.currentTaskId) ?? null);
  doneCount = $derived(this.tasks.filter((t) => t.done).length);

  async init() {
    this.settings = await loadSettings();
    await this.reload();
    setInterval(() => this.tickNow(), 250);
    // Wake from sleep: check at once, do not wait for the next interval.
    document.addEventListener('visibilitychange', () => this.tickNow());
    window.addEventListener('focus', () => this.tickNow());
  }

  async reload() {
    this.tasks = await (await db()).list();
  }

  tickNow() {
    this.now = Date.now();
    const r = timer.tick(this.timer, this.now);
    if (!r.completed) return;
    this.timer = r.state;
    if (r.completed === 'focus' && this.currentTask) {
      const t = this.currentTask;
      this.patchTask(t.id, { completed_pomodoros: countAfterFocus(t) });
    }
    if (this.settings.sound) playSessionEnd();
    this.applyShape();
  }

  // ---- timer actions ----

  /** The Start button on the idle Pomodoro tab. */
  pressStart() {
    if (this.timer.mode !== 'focus') {
      this.startTimer();
      return;
    }
    // Focus always goes through "What will you focus on?", which asks for the sessions.
    this.changing = false;
    this.view = 'choose';
  }

  /** Start a focus session. Asks first when no task is attached. */
  startFocus(taskId: number | null) {
    if (taskId === null) {
      this.confirm = {
        title: 'Start without a task?',
        message: 'You can add or attach a task after the session starts.',
        confirmLabel: 'Start anyway',
        onConfirm: () => this.beginFocus(null),
      };
      return;
    }
    this.beginFocus(taskId);
  }

  private beginFocus(taskId: number | null) {
    this.currentTaskId = taskId;
    this.timer = timer.setMode(this.timer, 'focus');
    this.startTimer();
    this.tab = 'pomodoro';
    this.view = 'main';
  }

  /** Per-task start button on the To-do tab. */
  startTask(taskId: number) {
    this.currentTaskId = taskId;
    this.tab = 'pomodoro';
    if (this.active) return; // Same as "Change": the time continues and counts toward this task.
    // Pick the sessions first, with this task already chosen.
    this.timer = timer.setMode(this.timer, 'focus');
    this.changing = false;
    this.view = 'choose';
  }

  /** Attach or change the task of the active session. The timer keeps running. */
  attachTask(taskId: number) {
    this.currentTaskId = taskId;
    this.changing = false;
    this.view = 'main';
  }

  startTimer() {
    this.now = Date.now();
    this.timer = timer.start(this.timer, this.now);
    this.applyShape();
  }
  pauseTimer() {
    this.now = Date.now();
    this.timer = timer.pause(this.timer, this.now);
    this.applyShape();
  }
  resetTimer() {
    this.now = Date.now();
    this.timer = timer.reset(this.timer, this.now);
    this.applyShape();
  }
  skipTimer() {
    this.timer = timer.skip(this.timer);
    this.applyShape();
  }
  setMode(mode: timer.Mode) {
    this.timer = timer.setMode(this.timer, mode);
  }

  // ---- tasks ----

  async createTask(title: string, estimate: number): Promise<Task | null> {
    if (!validTitle(title)) return null;
    const t = await (await db()).insert(title.trim(), clampEstimate(estimate, 0), this.tasks.length);
    await this.reload();
    return t;
  }

  async patchTask(id: number, fields: Partial<Omit<Task, 'id'>>) {
    await (await db()).update(id, fields);
    await this.reload();
  }

  async renameTask(id: number, title: string, estimate: number) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t || !validTitle(title)) return;
    await this.patchTask(id, { title: title.trim(), estimate: clampEstimate(estimate, t.completed_pomodoros) });
  }

  toggleDone(id: number) {
    const t = this.tasks.find((x) => x.id === id);
    if (t) this.patchTask(id, { done: !t.done });
  }

  /** Delete at once, with Undo for 5 seconds. */
  async deleteTask(id: number) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) return;
    const wasCurrent = this.currentTaskId === id;
    if (wasCurrent) this.currentTaskId = null;
    await (await db()).remove(id);
    await this.reload();
    this.undo = { task: $state.snapshot(t) as Task, wasCurrent };
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => (this.undo = null), 5000);
  }

  async undoDelete() {
    const u = this.undo;
    if (!u) return;
    this.undo = null;
    await (await db()).restore(u.task);
    await this.reload();
    if (u.wasCurrent) this.currentTaskId = u.task.id;
  }

  async moveTask(from: number, to: number) {
    const next = reorder(this.tasks, from, to);
    this.tasks = next;
    await (await db()).setPositions(next.map((t) => t.id));
  }

  // ---- settings ----

  async setSound(on: boolean) {
    this.settings.sound = on;
    await saveSound(on);
  }

  async setLaunch(on: boolean) {
    try {
      await setLaunchAtLogin(on);
      this.settings.launchAtLogin = on;
    } catch {
      this.settings.launchAtLogin = !on;
    }
  }

  // ---- window ----

  applyShape() {
    if (!this.minimized) setWindowShape('expanded');
    else setWindowShape(this.active ? 'pill' : 'dog');
  }

  minimize() {
    this.minimized = true;
    this.applyShape();
  }

  expand() {
    this.minimized = false;
    this.applyShape();
  }

  /** X button, Cmd+Q, and Dock Quit. Asks first while a session is active. */
  requestQuit() {
    if (!this.active) {
      quitApp();
      return;
    }
    if (this.minimized) this.expand();
    this.confirm = {
      title: 'Quit Stitch in Time?',
      message: 'The current session ends and does not count.',
      confirmLabel: 'Quit',
      onConfirm: () => quitApp(),
    };
  }
}

export const app = new AppState();
