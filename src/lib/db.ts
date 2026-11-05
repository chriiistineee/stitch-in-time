// Task storage. In the app this is SQLite (tauri-plugin-sql). In a plain
// browser (for UI preview only) it falls back to localStorage.
import type { Task } from './tasks';

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

type Row = Omit<Task, 'done'> & { done: number | boolean };
const toTask = (r: Row): Task => ({ ...r, done: Boolean(r.done) });

interface Backend {
  list(): Promise<Task[]>;
  insert(title: string, estimate: number, position: number): Promise<Task>;
  restore(t: Task): Promise<void>;
  update(id: number, fields: Partial<Omit<Task, 'id'>>): Promise<void>;
  remove(id: number): Promise<void>;
  setPositions(ids: number[]): Promise<void>;
}

async function sqlBackend(): Promise<Backend> {
  const { default: Database } = await import('@tauri-apps/plugin-sql');
  const db = await Database.load('sqlite:stitch-in-time.db');
  return {
    async list() {
      const rows = await db.select<Row[]>('SELECT * FROM tasks ORDER BY position, id');
      return rows.map(toTask);
    },
    async insert(title, estimate, position) {
      const res = await db.execute(
        'INSERT INTO tasks (title, estimate, completed_pomodoros, done, position) VALUES ($1, $2, 0, 0, $3)',
        [title, estimate, position],
      );
      const rows = await db.select<Row[]>('SELECT * FROM tasks WHERE id = $1', [res.lastInsertId]);
      return toTask(rows[0]);
    },
    async restore(t) {
      await db.execute(
        'INSERT INTO tasks (id, title, estimate, completed_pomodoros, done, position, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [t.id, t.title, t.estimate, t.completed_pomodoros, t.done ? 1 : 0, t.position, t.created_at],
      );
    },
    async update(id, fields) {
      const keys = Object.keys(fields) as (keyof typeof fields)[];
      if (keys.length === 0) return;
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => (typeof fields[k] === 'boolean' ? (fields[k] ? 1 : 0) : fields[k]));
      await db.execute(`UPDATE tasks SET ${sets} WHERE id = $${keys.length + 1}`, [...values, id]);
    },
    async remove(id) {
      await db.execute('DELETE FROM tasks WHERE id = $1', [id]);
    },
    async setPositions(ids) {
      for (let i = 0; i < ids.length; i++) {
        await db.execute('UPDATE tasks SET position = $1 WHERE id = $2', [i, ids[i]]);
      }
    },
  };
}

function memoryBackend(): Backend {
  const KEY = 'stitch-tasks';
  const load = (): Task[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  };
  const save = (l: Task[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
    } catch {
      /* preview only */
    }
  };
  let tasks = load();
  return {
    async list() {
      return tasks.slice().sort((a, b) => a.position - b.position);
    },
    async insert(title, estimate, position) {
      const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
      const t: Task = { id, title, estimate, completed_pomodoros: 0, done: false, position, created_at: new Date().toISOString() };
      tasks.push(t);
      save(tasks);
      return t;
    },
    async restore(t) {
      tasks.push(t);
      save(tasks);
    },
    async update(id, fields) {
      tasks = tasks.map((t) => (t.id === id ? { ...t, ...fields } : t));
      save(tasks);
    },
    async remove(id) {
      tasks = tasks.filter((t) => t.id !== id);
      save(tasks);
    },
    async setPositions(ids) {
      tasks = tasks.map((t) => ({ ...t, position: ids.indexOf(t.id) }));
      save(tasks);
    },
  };
}

let backend: Promise<Backend> | null = null;
export function db(): Promise<Backend> {
  backend ??= inTauri ? sqlBackend() : Promise.resolve(memoryBackend());
  return backend;
}
