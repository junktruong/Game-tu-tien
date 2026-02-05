export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
