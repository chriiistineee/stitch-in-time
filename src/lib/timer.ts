// Pure timer logic. Remaining time always comes from a stored end timestamp
// (endAt - now), never from counted ticks. This keeps the timer correct
// across Mac sleep.

export type Mode = 'focus' | 'short' | 'long';
export type Status = 'idle' | 'running' | 'paused';

const MIN = 60_000;
export const DURATIONS: Record<Mode, number> = {
  focus: 25 * MIN,
  short: 5 * MIN,
  long: 15 * MIN,
};

/** A long break comes after this many completed focus sessions. */
export const CYCLE = 4;

export interface TimerState {
  mode: Mode;
  status: Status;
  /** Epoch ms when the running session ends. Null when not running. */
  endAt: number | null;
  /** Remaining ms while idle or paused. */
  remainingMs: number;
  /** Completed focus sessions in the current cycle of CYCLE. */
  completedInCycle: number;
}

export interface TickResult {
  state: TimerState;
  /** The mode of the session that just completed, or null. */
  completed: Mode | null;
}

export function initialTimer(): TimerState {
  return idleAt('focus', 0);
}

function idleAt(mode: Mode, completedInCycle: number): TimerState {
  return { mode, status: 'idle', endAt: null, remainingMs: DURATIONS[mode], completedInCycle };
}

export function remaining(s: TimerState, now: number): number {
  if (s.status === 'running' && s.endAt !== null) return Math.max(0, s.endAt - now);
  return s.remainingMs;
}

export function progress(s: TimerState, now: number): number {
  return 1 - remaining(s, now) / DURATIONS[s.mode];
}

export function start(s: TimerState, now: number): TimerState {
  if (s.status === 'running') return s;
  return { ...s, status: 'running', endAt: now + s.remainingMs };
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', endAt: null, remainingMs: remaining(s, now) };
}

/** Reset restarts the session at full duration, and it keeps running. */
export function reset(s: TimerState, now: number): TimerState {
  const full = DURATIONS[s.mode];
  return { ...s, status: 'running', endAt: now + full, remainingMs: full };
}

/** Change mode. Only allowed when no session is active. */
export function setMode(s: TimerState, mode: Mode): TimerState {
  if (s.status !== 'idle') return s;
  return idleAt(mode, s.completedInCycle);
}

function advance(s: TimerState, countFocus: boolean): TimerState {
  if (s.mode === 'focus') {
    const c = countFocus ? s.completedInCycle + 1 : s.completedInCycle;
    const next: Mode = countFocus && c % CYCLE === 0 ? 'long' : 'short';
    return idleAt(next, c);
  }
  // After a long break, a new cycle starts.
  return idleAt('focus', s.mode === 'long' ? 0 : s.completedInCycle);
}

/** Skip ends the session. A skipped focus session does not count. */
export function skip(s: TimerState): TimerState {
  return advance(s, false);
}

/** Call often. Ends the session when its end time is past. Nothing auto-starts. */
export function tick(s: TimerState, now: number): TickResult {
  if (s.status === 'running' && s.endAt !== null && now >= s.endAt) {
    return { state: advance(s, true), completed: s.mode };
  }
  return { state: s, completed: null };
}

/** "Session N of CYCLE" for the focus label. */
export function sessionNumber(s: TimerState): number {
  return (s.completedInCycle % CYCLE) + 1;
}

export function formatMs(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
