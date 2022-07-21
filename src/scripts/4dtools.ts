/** Perspective projects a set of N+1 d points into N d */
function perspeciveProject(points: number[][], dimension: number, camDist = -3): number[][] {
  const projection = [];
  for (let d = 0; d < dimension; d++) {
    projection.push(Array.from(points[d]));
  }

  for (let i = 0; i < points[0].length; i++) {
    const multiplier = 2 / (points[dimension][i] - camDist);
    for (let d = 0; d < dimension; d++) {
      projection[d][i] *= multiplier;
    }
  }

  return projection;
}

class Rotor4D {
  // Angle of rotation
  _theta: number;
  // The unit oriented area lying in the plane of rotation
  // [e12, e13, e14, e23, e24, e34]
  _plane: [number, number, number, number, number, number];
  // The rotation matrix
  _rotationMatrix: number[][];

  constructor() {
    this._theta = 0;
    this._plane = [0, 0, 0, 0, 0, 0];
    this._rotationMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
  }

  /** Sets the plane or rotation, specified by two vectors */
  setPlane(v1: number[], v2: number[]): void {
    // Create unit vectors from v1 and v2
    const v1Magnitude = v1.reduce((a, b) => a + b * b, 0);
    const v2Magnitude = v2.reduce((a, b) => a + b * b, 0);
    const a = v1.map((x) => x / v1Magnitude);
    const b = v2.map((x) => x / v2Magnitude);

    // Compute the unit oriented area formed by the two vectors
    this._plane = [
      a[0] * b[1] - a[1] * b[0],
      a[0] * b[2] - a[2] * b[0],
      a[0] * b[3] - a[3] * b[0],
      a[1] * b[2] - a[2] * b[1],
      a[1] * b[3] - a[3] * b[1],
      a[2] * b[3] - a[3] * b[2],
    ];
  }

  /** Sets the angle of rotation */
  setAngle(theta: number): void {
    this._theta = theta;
  }

  /** Calculates the rotation matrix */
  calculateRotationMatrix(): void {
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

  /** Rotates the points by the rotation matrix */
  rotate(points: number[]): number[];
  rotate(points: number[][]): number[][];
  rotate(points: number[][] | number[]): number[][] | number[] {
    // If points is a single point, return a single point
    if (typeof points[0] === 'number') {
      points = points as number[];

      const rotatedPoint = Array.from(points);

      for (let d = 0; d < 4; d++) {
        rotatedPoint[d] = 0;
        for (let j = 0; j < 4; j++) {
          rotatedPoint[d] += this._rotationMatrix[d][j] * points[j];
        }
      }

      return rotatedPoint;
    } else {
      points = points as number[][];
      // It's a list of points so return a list of points
      const rotatedPoints = points.map((row) => Array.from(row));

      for (let i = 0; i < points[0].length; i++) {
        for (let d = 0; d < 4; d++) {
          rotatedPoints[d][i] = 0;
          for (let j = 0; j < 4; j++) {
            rotatedPoints[d][i] += this._rotationMatrix[d][j] * points[j][i];
          }
        }
      }

      return rotatedPoints;
    }
  }
}

class Rotor3D {
  // Angle of rotation
  _theta: number;
  // The unit oriented area lying in the plane of rotation
  // [e12, e13, e14, e23, e24, e34]
  _plane: [number, number, number];
  // The rotation matrix
  _rotationMatrix: number[][];

  constructor() {
    this._theta = 0;
    this._plane = [0, 0, 0];
    this._rotationMatrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  /** Sets the plane or rotation, specified by two vectors */
  setPlane(v1: number[], v2: number[]): void {
    // Create unit vectors from v1 and v2
    const v1Magnitude = v1.reduce((a, b) => a + b * b, 0);
    const v2Magnitude = v2.reduce((a, b) => a + b * b, 0);
    const a = v1.map((x) => x / v1Magnitude);
    const b = v2.map((x) => x / v2Magnitude);

    // Compute the unit oriented area formed by the two vectors
    this._plane = [a[0] * b[1] - a[1] * b[0], a[0] * b[2] - a[2] * b[0], a[1] * b[2] - a[2] * b[1]];
  }

  /** Sets the angle of rotation */
  setAngle(theta: number): void {
    this._theta = theta;
  }

  /** Calculates the rotation matrix */
  calculateRotationMatrix(): void {
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

  /** Rotates the points by the rotation matrix */
  rotate(points: number[]): number[];
  rotate(points: number[][]): number[][];
  rotate(points: number[][] | number[]): number[][] | number[] {
    // If points is a single point, return a single point
    if (typeof points[0] === 'number') {
      points = points as number[];

      const rotatedPoint = Array.from(points);

      for (let d = 0; d < 3; d++) {
        rotatedPoint[d] = 0;
        for (let j = 0; j < 3; j++) {
          rotatedPoint[d] += this._rotationMatrix[d][j] * points[j];
        }
      }

      return rotatedPoint;
    } else {
      points = points as number[][];
      // It's a list of points so return a list of points
      const rotatedPoints = points.map((row) => Array.from(row));

      for (let i = 0; i < points[0].length; i++) {
        for (let d = 0; d < 3; d++) {
          rotatedPoints[d][i] = 0;
          for (let j = 0; j < 3; j++) {
            rotatedPoints[d][i] += this._rotationMatrix[d][j] * points[j][i];
          }
        }
      }

      return rotatedPoints;
    }
  }
}

export { perspeciveProject, Rotor4D, Rotor3D };
