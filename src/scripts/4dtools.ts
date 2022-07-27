import VMath from './tools';

/** Perspective project a set of ND vectors to (N-1)D */
function perspectiveProject(points: number[][], camDist: number, planeOffset = 2): number[][] {
  return points.map((point) =>
    VMath.mult(point.slice(0, point.length - 1), planeOffset / (point[point.length - 1] - camDist))
  );
}

/** Returns the oriented area formed by the outer product of 2 vectors
 *
 * Bivector element order will be as follows:
 * - n=1; [e12]
 * - n=2; [e12, e13, e23]
 * - n=3; [e12, e13, e14, e23, e24, e34]
 * - etc.
 */
function orientedArea(u: number[], v: number[]): number[] {
  const n = u.length;
  const oa = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      oa.push(u[i] * v[j] - u[j] * v[i]);
    }
  }
  return oa;
}

/** Returns the oriented volume formed by the outer product of 3 vectors
 *
 * Trivector element order will be as follows:
 * - n=2; [e123]
 * - n=3; [e123, e124, e134, e234]
 * - etc.
 */
function orientedVolume(u: number[], v: number[], w: number[]): number[] {
  const n = u.length;
  const ov = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        ov.push(
          u[i] * v[j] * w[k] +
            u[j] * v[k] * w[i] +
            u[k] * v[i] * w[j] -
            u[i] * v[k] * w[j] -
            u[j] * v[i] * w[k] -
            u[k] * v[j] * w[i]
        );
      }
    }
  }
  return ov;
}

function isProbablySingleVector(test: number[][] | number[]): test is number[] {
  return typeof test[0] === 'number';
}

class Rotor4D {
  // Angle of rotation
  _theta = 0;
  // The unit oriented area lying in the plane of rotation
  _plane = [0, 0, 0, 0, 0, 0];
  // The rotation matrix
  _rotationMatrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  // Signals that the rotation matrix needs to be recalculated
  _rotationMatrixDirty = false;

  /** Sets the plane of rotation, given two vectors spanning it */
  setPlane(v1: number[], v2: number[]): void {
    this._plane = VMath.normalize(orientedArea(v1, v2));
    this._rotationMatrixDirty = true;
  }

  /** Sets the angle of rotation */
  setAngle(theta: number): void {
    this._theta = theta;
    this._rotationMatrixDirty = true;
  }

  /** Calculates the rotation matrix */
  _calculateRotationMatrix(): void {
    const cTheta = Math.cos(this._theta / 2);
    const sTheta = Math.sin(this._theta / 2);

    const c = [cTheta, ...this._plane.map((x) => x * sTheta)];

    const c11 = c[0] * c[0];
    const c22 = c[1] * c[1];
    const c33 = c[2] * c[2];
    const c44 = c[3] * c[3];
    const c55 = c[4] * c[4];
    const c66 = c[5] * c[5];
    const c77 = c[6] * c[6];

    const c12 = c[0] * c[1];
    const c13 = c[0] * c[2];
    const c14 = c[0] * c[3];
    const c15 = c[0] * c[4];
    const c16 = c[0] * c[5];
    const c17 = c[0] * c[6];

    const c23 = c[1] * c[2];
    const c24 = c[1] * c[3];
    const c25 = c[1] * c[4];
    const c26 = c[1] * c[5];
    // const c27 = c[1] * c[6];

    const c34 = c[2] * c[3];
    const c35 = c[2] * c[4];
    // const c36 = c[2] * c[5];
    const c37 = c[2] * c[6];

    // const c45 = c[3] * c[4];
    const c46 = c[3] * c[5];
    const c47 = c[3] * c[6];

    const c56 = c[4] * c[5];
    const c57 = c[4] * c[6];

    const c67 = c[5] * c[6];

    this._rotationMatrix = [
      [
        c11 - c22 - c33 - c44 + c55 + c66 + c77,
        -2 * (c12 + c46 + c35),
        2 * (-c13 - c47 + c25),
        2 * (-c14 + c26 + c37),
      ],
      [
        2 * (c12 - c35 - c46),
        -c22 + c11 + c33 + c44 - c55 - c66 + c77,
        -2 * (c23 + c15 + c67),
        -2 * (c24 + c16 - c57),
      ],
      [
        2 * (c13 + c25 - c47),
        -2 * (c23 - c15 + c67),
        -c33 + c11 + c22 + c44 - c55 + c66 - c77,
        -2 * (c34 + c56 + c17),
      ],
      [
        2 * (c14 + c26 + c37),
        -2 * (c24 - c16 - c57),
        -2 * (c34 + c56 - c17),
        -c44 + c11 + c22 + c33 - c66 + c55 - c77,
      ],
    ];
  }

  /** Rotates vector(s) in place by the rotation matrix */
  rotate(points: number[][], center?: number[]): number[][];
  rotate(points: number[], center?: number[]): number[];
  rotate(points: number[][] | number[], center?: number[]): number[][] | number[] {
    if (this._rotationMatrixDirty) {
      this._calculateRotationMatrix();
      this._rotationMatrixDirty = false;
    }

    if (isProbablySingleVector(points)) {
      const rotated = VMath.transform(
        center ? VMath.sub(center, points) : points,
        this._rotationMatrix
      );
      if (center) {
        VMath.translate(rotated, center);
      }
      return rotated;
    } else {
      return points.map((x) => this.rotate(x as number[]));
    }
  }
}

class Rotor3D {
  // Angle of rotation
  _theta = 0;
  // The unit oriented area lying in the plane of rotation
  _plane = [0, 0, 0];
  // The rotation matrix
  _rotationMatrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  // Signals that the rotation matrix needs to be recalculated
  _rotationMatrixDirty = false;

  /** Sets the plane of rotation, given two vectors spanning it */
  setPlane(v1: number[], v2: number[]): void {
    this._plane = VMath.normalize(orientedArea(v1, v2));
    this._rotationMatrixDirty = true;
  }

  /** Sets the angle of rotation */
  setAngle(theta: number): void {
    this._theta = theta;
    this._rotationMatrixDirty = true;
  }

  /** Calculates the rotation matrix */
  _calculateRotationMatrix(): void {
    const cTheta = Math.cos(this._theta / 2);
    const sTheta = Math.sin(this._theta / 2);

    const c = [cTheta, ...this._plane.map((x) => x * sTheta)];

    const c11 = c[0] * c[0];
    const c22 = c[1] * c[1];
    const c33 = c[2] * c[2];
    const c44 = c[3] * c[3];

    const c12 = c[0] * c[1];
    const c13 = c[0] * c[2];
    const c14 = c[0] * c[3];

    const c23 = c[1] * c[2];
    const c24 = c[1] * c[3];

    const c34 = c[2] * c[3];

    this._rotationMatrix = [
      [c11 - c22 - c33 + c44, 2 * (c12 - c34), 2 * (c13 + c24)],
      [2 * (-c12 - c34), c11 - c22 + c33 - c44, 2 * (-c23 + c14)],
      [2 * (-c13 + c24), 2 * (-c23 - c14), c11 + c22 - c33 - c44],
    ];
  }

  /** Rotates vector(s) in place by the rotation matrix */
  rotate(points: number[][], center?: number[]): number[][];
  rotate(points: number[], center?: number[]): number[];
  rotate(points: number[][] | number[], center?: number[]): number[][] | number[] {
    if (this._rotationMatrixDirty) {
      this._calculateRotationMatrix();
      this._rotationMatrixDirty = false;
    }

    if (isProbablySingleVector(points)) {
      const rotated = VMath.transform(
        center ? VMath.sub(center, points) : points,
        this._rotationMatrix
      );
      if (center) {
        VMath.translate(rotated, center);
      }
      return rotated;
    } else {
      return points.map((x) => this.rotate(x as number[]));
    }
  }
}

export { perspectiveProject, orientedArea, orientedVolume, Rotor4D, Rotor3D };
