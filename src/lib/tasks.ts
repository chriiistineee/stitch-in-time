// Pure task rules. The database layer (db.ts) uses these.

export interface Task {
  id: number;
  title: string;
  estimate: number;
  completed_pomodoros: number;
  done: boolean;
  position: number;
  created_at: string;
}

export const EST_MIN = 1;
export const EST_MAX = 10;

export function validTitle(title: string): boolean {
  return title.trim().length > 0;
}

/** The estimate stays in 1..10 and never goes below the completed count. */
export function clampEstimate(value: number, completed: number): number {
  const v = Math.round(value);
  return Math.min(EST_MAX, Math.max(EST_MIN, completed, v));
}

/** A completed focus session adds 1, up to the estimate (3/3 stays 3/3). */
export function countAfterFocus(task: Task): number {
  return Math.min(task.estimate, task.completed_pomodoros + 1);
}

/** Move the task at index `from` to index `to`. Positions become 0..n-1. */
export function reorder(list: Task[], from: number, to: number): Task[] {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) return list;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next.map((t, i) => ({ ...t, position: i }));
}

export function unfinished(list: Task[]): Task[] {
  return list.filter((t) => !t.done);
}

export function visible(list: Task[], hideDone: boolean): Task[] {
  return hideDone ? unfinished(list) : list;
}
