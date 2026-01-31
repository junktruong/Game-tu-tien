// public/js/display/utils.js
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
export function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class Scheduler {
  _events: { t: number; fn: () => void }[];

  constructor() {
    this._events = [];
  }
  schedule(sec: number, fn: () => void) {
    this._events.push({ t: Math.max(0, sec), fn });
  }
  update(dt: number) {
    for (let i = this._events.length - 1; i >= 0; i -= 1) {
      const e = this._events[i];
      e.t -= dt;
      if (e.t <= 0) {
        try {
          e.fn();
        } catch (_) {
          // ignore scheduler errors
        }
        this._events.splice(i, 1);
      }
    }
  }
}
