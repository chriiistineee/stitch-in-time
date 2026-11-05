import { describe, expect, it } from 'vitest';
import {
  DURATIONS, formatMs, initialTimer, pause, remaining, reset, sessionNumber, setMode, skip, start, tick,
  type TimerState,
} from './timer';
import { clampEstimate, countAfterFocus, reorder, unfinished, validTitle, visible, type Task } from './tasks';

const T0 = 1_000_000;
const MIN = 60_000;

function finishFocus(s: TimerState, now: number): { s: TimerState; now: number } {
  s = start(s, now);
  const end = now + DURATIONS.focus;
  const r = tick(s, end);
  expect(r.completed).toBe('focus');
  return { s: r.state, now: end };
}

describe('timer', () => {
  it('starts idle at 25:00 in focus', () => {
    const s = initialTimer();
    expect(s.status).toBe('idle');
    expect(formatMs(remaining(s, T0))).toBe('25:00');
  });

  it('computes remaining time from the end timestamp', () => {
    const s = start(initialTimer(), T0);
    expect(remaining(s, T0 + 6 * MIN + 18_000)).toBe(DURATIONS.focus - 6 * MIN - 18_000);
    expect(formatMs(remaining(s, T0 + 6 * MIN + 18_000))).toBe('18:42');
  });

  it('keeps counting by clock time across sleep and completes on wake', () => {
    const s = start(initialTimer(), T0);
    const r = tick(s, T0 + 3 * 60 * MIN); // woke up 3 hours later
    expect(r.completed).toBe('focus');
    expect(r.state.mode).toBe('short');
    expect(r.state.status).toBe('idle'); // nothing auto-starts
    expect(r.state.completedInCycle).toBe(1);
  });

  it('pauses and resumes without losing time', () => {
    let s = start(initialTimer(), T0);
    s = pause(s, T0 + 5 * MIN);
    expect(remaining(s, T0 + 50 * MIN)).toBe(20 * MIN);
    s = start(s, T0 + 50 * MIN);
    expect(remaining(s, T0 + 55 * MIN)).toBe(15 * MIN);
  });

  it('reset restarts at full duration and keeps running', () => {
    let s = start(initialTimer(), T0);
    s = reset(s, T0 + 10 * MIN);
    expect(s.status).toBe('running');
    expect(remaining(s, T0 + 10 * MIN)).toBe(DURATIONS.focus);
    expect(s.completedInCycle).toBe(0);
  });

  it('reset from paused also restarts running', () => {
    let s = pause(start(initialTimer(), T0), T0 + MIN);
    s = reset(s, T0 + 2 * MIN);
    expect(s.status).toBe('running');
  });

  it('skip ends a focus session without counting it', () => {
    const s = skip(start(initialTimer(), T0));
    expect(s.mode).toBe('short');
    expect(s.status).toBe('idle');
    expect(s.completedInCycle).toBe(0);
  });

  it('gives a long break after every 4 completed focus sessions', () => {
    let s = initialTimer();
    let now = T0;
    const modes: string[] = [];
    for (let i = 0; i < 4; i++) {
      expect(sessionNumber(s)).toBe(i + 1);
      ({ s, now } = finishFocus(s, now));
      modes.push(s.mode);
      if (i < 3) s = skip(s); // skip the short break
    }
    expect(modes).toEqual(['short', 'short', 'short', 'long']);
    s = skip(s); // after the long break a new cycle starts
    expect(s.mode).toBe('focus');
    expect(sessionNumber(s)).toBe(1);
  });

  it('does not change mode during an active session', () => {
    const s = start(initialTimer(), T0);
    expect(setMode(s, 'long')).toBe(s);
    expect(setMode(initialTimer(), 'long').remainingMs).toBe(DURATIONS.long);
  });
});

function task(p: Partial<Task>): Task {
  return { id: 1, title: 't', estimate: 3, completed_pomodoros: 0, done: false, position: 0, created_at: '', ...p };
}

describe('tasks', () => {
  it('blocks empty or whitespace titles', () => {
    expect(validTitle('')).toBe(false);
    expect(validTitle('   \n')).toBe(false);
    expect(validTitle(' a ')).toBe(true);
  });

  it('caps the pomodoro count at the estimate', () => {
    expect(countAfterFocus(task({ completed_pomodoros: 2 }))).toBe(3);
    expect(countAfterFocus(task({ completed_pomodoros: 3 }))).toBe(3);
  });

  it('keeps the estimate in 1..10 and not below the completed count', () => {
    expect(clampEstimate(0, 0)).toBe(1);
    expect(clampEstimate(11, 0)).toBe(10);
    expect(clampEstimate(2, 3)).toBe(3);
    expect(clampEstimate(5, 3)).toBe(5);
  });

  it('reorders and renumbers positions', () => {
    const list = [task({ id: 1 }), task({ id: 2, position: 1 }), task({ id: 3, position: 2 })];
    const next = reorder(list, 0, 2);
    expect(next.map((t) => t.id)).toEqual([2, 3, 1]);
    expect(next.map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it('filters unfinished and hidden done tasks', () => {
    const list = [task({ id: 1, done: true }), task({ id: 2 })];
    expect(unfinished(list).map((t) => t.id)).toEqual([2]);
    expect(visible(list, false)).toHaveLength(2);
    expect(visible(list, true)).toHaveLength(1);
  });
});
