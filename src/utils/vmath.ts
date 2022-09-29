/* VMath is a high performance arbitrary length vector math module.
 * - Optimized for speed
 * - Number arrays are used to represent vectors
 * - No safety checks are performed!
 * - Functions ending with i e.g. `subi` are in-place (mutating),
 *   the rest create a new vector
 */

import { approx } from './number';

/** Subtracts vector `b` from `a`, returning a new vector. */
export function sub(a: number[], b: number[]): number[] {
  const result = [];
  for (let i = 0; i < a.length; i++) {
    result.push(a[i] - b[i]);
  }
  return result;
}

/** Subtracts vector `b` from `a`, mutating `a`. */
export function subi(a: number[], b: number[]): number[] {
  for (let i = 0; i < a.length; i++) {
    a[i] -= b[i];
  }
  return a;
}

/** Adds vector `b` to `a`, returning a new vector. */
export function add(a: number[], b: number[]): number[] {
  const result = [];
  for (let i = 0; i < a.length; i++) {
    result.push(a[i] + b[i]);
  }
  return result;
}

/** Adds vector `b` to `a`, mutating `a`. */
export function addi(a: number[], b: number[]): number[] {
  for (let i = 0; i < a.length; i++) {
    a[i] += b[i];
  }
  return a;
}

/** Multiplies vector `v` by scalar `s`, returning a new vector. */
export function smult(v: number[], s: number): number[] {
  const result = [];
  for (let i = 0; i < v.length; i++) {
    result.push(v[i] * s);
  }
  return result;
}

/** Multiplies vector `v` by scalar `s`, mutating `v`. */
export function smulti(v: number[], s: number): number[] {
  for (let i = 0; i < v.length; i++) {
    v[i] *= s;
  }
  return v;
}

/** Adds any number of vectors, returning a new total vector. */
export function sum(...vectors: number[][]): number[] {
  const result = [];
  for (let i = 0; i < vectors[0].length; i++) {
    let sum = 0;
    for (let j = 0; j < vectors.length; j++) {
      sum += vectors[j][i];
    }
    result.push(sum);
  }
  return result;
}

/** Returns the dot product of vectors `a` and `b`. */
export function dot(a: number[], b: number[]): number {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i];
  }
  return result;
}

/** Returns the magnitude of vector `v`. */
export function mag(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

/** Returns the distance between vectors `a` and `b`. */
export function dist(a: number[], b: number[]): number {
  return mag(sub(a, b));
}

/** Returns the average of any number of vectors. */
export function avg(...vectors: number[][]): number[] {
  return smult(sum(...vectors), 1 / vectors.length);
}

/** Returns the cross product of vectors `a` and `b`. (3D only!) */
export function cross(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Returns the angle between vectors `a` and `b`. */
export function angle(a: number[], b: number[]): number {
  return Math.acos(dot(a, b) / (mag(a) * mag(b)));
}

/** Linearly interpolates between vectors `a` and `b` by `t`. */
export function lerp(a: number[], b: number[], t: number): number[] {
  return add(a, smult(sub(b, a), t));
}

/** Projects vector `a` onto vector `b`. */
export function project(a: number[], b: number[]): number[] {
  return smult(b, dot(a, b) / dot(b, b));
}

/** Normalizes vector `v`, returning a new vector. */
export function norm(v: number[]): number[] {
  return smult(v, 1 / mag(v));
}

/** Normalizes vector `v`, mutating `v`. */
export function normi(v: number[]): number[] {
  return smulti(v, 1 / mag(v));
}

/** Returns true if vector `a` is equal to vector `b`. Optional threshold `epsilon` */
export function equal(a: number[], b: number[], epsilon = 1e-15): boolean {
  for (let i = 0; i < a.length; i++) {
    if (!approx(a[i], b[i], epsilon)) {
      return false;
    }
  }
  return true;
}

/** Returns true if all entries in `v` are `num`. Optional threshold `epsilon` */
export function all(v: number[], num: number, epsilon = 1e-15): boolean {
  for (let i = 0; i < v.length; i++) {
    if (!approx(v[i], num, epsilon)) {
      return false;
    }
  }
  return true;
}

/** Returns true if two vectors are parallel. Optional threshold `epsilon` */
export function parallel(a: number[], b: number[], epsilon = 1e-15): boolean {
  return approx(Math.abs(dot(a, b)), Math.abs(mag(a) * mag(b)), epsilon);
}

/** Returns true if two vectors are perpendicular. Optional threshold `epsilon` */
export function perpendicular(a: number[], b: number[], epsilon = 1e-15): boolean {
  return approx(dot(a, b), 0, epsilon);
}

/** Generate a random vector of length `l`, with each entry between `min` and `max`. */
export function random(l: number, min = 0, max = 1): number[] {
  const result = [];
  for (let i = 0; i < l; i++) {
    result.push(Math.random() * (max - min) + min);
  }
  return result;
}

/** Applies a matirx `M` to vector `v`, returning a new vector. */
export function applyMatrix(v: number[], M: number[][]): number[] {
  const result = [];
  for (let i = 0; i < v.length; i++) {
    result.push(dot(v, M[i]));
  }
  return result;
}

/** Reflects vector `v` across plane with normal `n`, returning a new vector. */
export function reflect(v: number[], n: number[]): number[] {
  return sub(v, smult(n, 2 * dot(v, n)));
}

/** Reflects vector `v` across plane with normal `n`, mutating `v`. */
export function reflecti(v: number[], n: number[]): number[] {
  return subi(v, smult(n, 2 * dot(v, n)));
}

export { norm as normalize, normi as normalizei };
