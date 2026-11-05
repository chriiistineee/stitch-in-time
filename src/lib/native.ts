// Calls into the Tauri side. Each call does nothing in a plain browser.
import { inTauri } from './db';

export type WindowShape = 'expanded' | 'pill' | 'dog';

export interface Settings {
  sound: boolean;
  launchAtLogin: boolean;
}
const DEFAULTS: Settings = { sound: true, launchAtLogin: false };

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | undefined> {
  if (!inTauri) return undefined;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export function setWindowShape(shape: WindowShape) {
  return invoke('set_window_shape', { shape });
}

export function quitApp() {
  if (!inTauri) return;
  return invoke('quit_app');
}

export async function startDragging() {
  if (!inTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().startDragging();
}

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The window position and size in screen points. */
export async function windowFrame(): Promise<Frame | null> {
  if (!inTauri) return null;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  const scale = await win.scaleFactor();
  const p = (await win.outerPosition()).toLogical(scale);
  const s = (await win.outerSize()).toLogical(scale);
  return { x: p.x, y: p.y, w: s.width, h: s.height };
}

/** The usable area of the screen the window is on, in screen points. */
export async function screenBounds(): Promise<Frame | null> {
  if (!inTauri) return null;
  const { currentMonitor } = await import('@tauri-apps/api/window');
  const m = await currentMonitor();
  if (!m) return null;
  const area = (m as { workArea?: { position: { x: number; y: number }; size: { width: number; height: number } } }).workArea;
  const pos = area?.position ?? m.position;
  const size = area?.size ?? m.size;
  const k = m.scaleFactor;
  return { x: pos.x / k, y: pos.y / k, w: size.width / k, h: size.height / k };
}

export async function moveWindow(x: number, y: number) {
  if (!inTauri) return;
  const { getCurrentWindow, LogicalPosition } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
}

export async function resizeWindow(w: number, h: number) {
  if (!inTauri) return;
  const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setSize(new LogicalSize(Math.round(w), Math.round(h)));
}

/** Cmd+Q, the app menu Quit, and the Dock Quit all come here. */
export async function onQuitRequested(handler: () => void) {
  if (!inTauri) return;
  const { listen } = await import('@tauri-apps/api/event');
  await listen('quit-requested', handler);
}

/** Cmd+, and the app menu Settings item. */
export async function onOpenSettings(handler: () => void) {
  if (!inTauri) return;
  const { listen } = await import('@tauri-apps/api/event');
  await listen('open-settings', handler);
}

async function store() {
  const { load } = await import('@tauri-apps/plugin-store');
  return load('settings.json', { defaults: {}, autoSave: true });
}

export async function loadSettings(): Promise<Settings> {
  if (!inTauri) return { ...DEFAULTS };
  const s = await store();
  const sound = (await s.get<boolean>('sound')) ?? DEFAULTS.sound;
  const { isEnabled } = await import('@tauri-apps/plugin-autostart');
  const launchAtLogin = await isEnabled().catch(() => false);
  return { sound, launchAtLogin };
}

export async function saveSound(on: boolean) {
  if (!inTauri) return;
  const s = await store();
  await s.set('sound', on);
}

export async function setLaunchAtLogin(on: boolean) {
  if (!inTauri) return;
  const { enable, disable } = await import('@tauri-apps/plugin-autostart');
  await (on ? enable() : disable());
}

let audio: HTMLAudioElement | null = null;
export function playSessionEnd() {
  audio ??= new Audio('/sounds/session-end.wav');
  audio.currentTime = 0;
  audio.play().catch(() => {
    /* sound file missing or blocked */
  });
}

/** Debug builds print this to the terminal that started the app. */
export function debugLog(msg: string) {
  if (import.meta.env.DEV || inTauri) invoke('debug_log', { msg }).catch(() => {});
}
