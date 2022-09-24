/** Returns true if `a` ~= `b`, using threshold `epsilon` */
function approx(a: number, b: number, epsilon = 1e-15) {
  return Math.abs(a - b) < epsilon;
}

/** Clamps `num` between `min` and `max` */
function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

export { approx, clamp };
