// Move and resize the frameless window with the pointer.
// Both use screen coordinates, so they keep working while the window moves under the cursor.
import { moveWindow, resizeWindow, screenBounds, windowFrame, type Frame } from './native';

const THRESHOLD = 4;
export const BASE_W = 360;
export const BASE_H = 600;
export const MIN_W = BASE_W * 0.6;
export const MAX_W = BASE_W * 1.5;

/** Throttle window calls to one per animation frame. */
function framed<T extends unknown[]>(fn: (...a: T) => void) {
  let pending: T | null = null;
  return (...a: T) => {
    if (pending === null) requestAnimationFrame(() => {
      if (pending) fn(...pending);
      pending = null;
    });
    pending = a;
  };
}

/**
 * Drag to move. Calls onClick when the pointer goes up without moving.
 * Use it as: onpointerdown={(e) => dragWindow(e, () => ...)}
 */
export async function dragWindow(e: PointerEvent, onClick?: () => void, onDrop?: () => void) {
  if (e.button !== 0) return;
  cancelSnap();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  const sx = e.screenX;
  const sy = e.screenY;
  let start: Frame | null = null;
  let screen: Frame | null = null;
  let moved = false;
  let last = { x: sx, y: sy };
  const move = framed((x: number, y: number) => {
    if (!start) return;
    let nx = start.x + x - sx;
    let ny = start.y + y - sy;
    // Keep the whole window on the screen.
    if (screen) {
      nx = Math.min(Math.max(nx, screen.x), screen.x + screen.w - start.w);
      ny = Math.min(Math.max(ny, screen.y), screen.y + screen.h - start.h);
    }
    moveWindow(nx, ny);
  });
  // A fast drag can move before the first reads return. Catch up then.
  Promise.all([windowFrame(), screenBounds()]).then(([f, b]) => {
    start = f;
    screen = b;
    if (moved) move(last.x, last.y);
  });

  const onMove = (ev: PointerEvent) => {
    if (!moved && Math.hypot(ev.screenX - sx, ev.screenY - sy) < THRESHOLD) return;
    moved = true;
    last = { x: ev.screenX, y: ev.screenY };
    move(ev.screenX, ev.screenY);
  };
  const onUp = () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    if (!moved) onClick?.();
    else onDrop?.();
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

const SNAP_MARGIN = 16;
const SNAP_MS = 220;
let snapRun = 0;

/** Slide the window to the nearest corner of its screen. */
export async function snapToCorner() {
  const run = ++snapRun;
  const [f, b] = await Promise.all([windowFrame(), screenBounds()]);
  if (!f || !b) return;
  const left = f.x + f.w / 2 < b.x + b.w / 2;
  const top = f.y + f.h / 2 < b.y + b.h / 2;
  const tx = left ? b.x + SNAP_MARGIN : b.x + b.w - f.w - SNAP_MARGIN;
  const ty = top ? b.y + SNAP_MARGIN : b.y + b.h - f.h - SNAP_MARGIN;
  const t0 = performance.now();
  const step = (now: number) => {
    if (run !== snapRun) return; // a newer snap or drag took over
    const k = Math.min(1, (now - t0) / SNAP_MS);
    const ease = 1 - Math.pow(1 - k, 3);
    moveWindow(f.x + (tx - f.x) * ease, f.y + (ty - f.y) * ease);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Stop a running snap, for example when a new drag starts. */
export function cancelSnap() {
  snapRun++;
}

/** Drag the corner to resize. The window keeps the Figma aspect ratio. */
export async function dragResize(e: PointerEvent) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  const sx = e.screenX;
  let start: Frame | null = null;
  let screen: Frame | null = null;
  let lastX: number | null = null;
  const resize = framed((x: number) => {
    if (!start) return;
    let max = MAX_W;
    // Do not grow past the right or bottom edge of the screen.
    if (screen) {
      max = Math.min(max, screen.x + screen.w - start.x, ((screen.y + screen.h - start.y) * BASE_W) / BASE_H);
    }
    const w = Math.min(max, Math.max(MIN_W, start.w + x - sx));
    resizeWindow(w, (w * BASE_H) / BASE_W);
  });
  Promise.all([windowFrame(), screenBounds()]).then(([f, b]) => {
    start = f;
    screen = b;
    if (lastX !== null) resize(lastX);
  });
  const onMove = (ev: PointerEvent) => {
    lastX = ev.screenX;
    resize(ev.screenX);
  };
  const onUp = () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

/** True when a pointer down on this element must not start a window drag. */
export function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('button, input, textarea, select, label, a, [role="button"], [role="radio"], [role="tab"], [role="checkbox"]');
}
