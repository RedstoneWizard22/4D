import type { OrientedArea4D, OrientedArea3D } from 'src/types/common';

/** Perspective project a set of 4D vectors to 3D */
function perspectiveProject4D(points: number[][], camDist: number): number[][] {
  return points.map((point) => {
    const multiplier = 2 / (point[3] - camDist);
    return [point[0] * multiplier, point[1] * multiplier, point[2] * multiplier];
  });
}

/** Perspective project a set of 3D vectors to 2D */
function perspectiveProject3D(points: number[][], camDist: number): number[][] {
  return points.map((point) => {
    const multiplier = 2 / (point[2] - camDist);
    return [point[0] * multiplier, point[1] * multiplier];
  });
}

/** Returns the oriented area formed by the outer product of 2 vectors (4D) */
function orientedArea4D(v1: number[], v2: number[]): OrientedArea4D {
  // Create unit vectors from v1 and v2
  const v1Magnitude = Math.sqrt(v1.reduce((a, b) => a + b * b, 0));
  const v2Magnitude = Math.sqrt(v2.reduce((a, b) => a + b * b, 0));
  const a = v1.map((x) => x / v1Magnitude);
  const b = v2.map((x) => x / v2Magnitude);

  // Compute the unit oriented area formed by the two vectors
  return [
    a[0] * b[1] - a[1] * b[0],
    a[0] * b[2] - a[2] * b[0],
    a[0] * b[3] - a[3] * b[0],
    a[1] * b[2] - a[2] * b[1],
    a[1] * b[3] - a[3] * b[1],
    a[2] * b[3] - a[3] * b[2],
  ];
}

/** Returns the oriented area formed by the outer product of 2 vectors (3D) */
function orientedArea3D(v1: number[], v2: number[]): OrientedArea3D {
  // Create unit vectors from v1 and v2
  const v1Magnitude = Math.sqrt(v1.reduce((a, b) => a + b * b, 0));
  const v2Magnitude = Math.sqrt(v2.reduce((a, b) => a + b * b, 0));
  const a = v1.map((x) => x / v1Magnitude);
  const b = v2.map((x) => x / v2Magnitude);

  // Compute the unit oriented area formed by the two vectors
  return [a[0] * b[1] - a[1] * b[0], a[0] * b[2] - a[2] * b[0], a[1] * b[2] - a[2] * b[1]];
}

class Rotor4D {
  // Angle of rotation
  _theta = 0;
  // The unit oriented area lying in the plane of rotation
  _plane: OrientedArea4D = [0, 0, 0, 0, 0, 0];
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
    this._plane = orientedArea4D(v1, v2);
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
  rotate(points: number[][]): number[][];
  rotate(points: number[]): number[];
  rotate(points: number[][] | number[]): number[][] | number[] {
    if (this._rotationMatrixDirty) {
      this._calculateRotationMatrix();
      this._rotationMatrixDirty = false;
    }

    if (typeof points[0] === 'number') {
      const rotated: number[] = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          rotated[i] += this._rotationMatrix[i][j] * (points as number[])[j];
        }
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
  _plane: OrientedArea3D = [0, 0, 0];
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
    this._plane = orientedArea3D(v1, v2);
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
  rotate(points: number[][]): number[][];
  rotate(points: number[]): number[];
  rotate(points: number[][] | number[]): number[][] | number[] {
    if (this._rotationMatrixDirty) {
      this._calculateRotationMatrix();
      this._rotationMatrixDirty = false;
    }

    if (typeof points[0] === 'number') {
      const rotated: number[] = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          rotated[i] += this._rotationMatrix[i][j] * (points as number[])[j];
        }
      }
      return rotated;
    } else {
      return points.map((x) => this.rotate(x as number[]));
    }
  }
}

export {
  perspectiveProject4D,
  perspectiveProject3D,
  orientedArea4D,
  orientedArea3D,
  Rotor4D,
  Rotor3D,
};
