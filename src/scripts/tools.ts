function approx(a: number, b: number, epsilon = 1e-15): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Find the reduced row echelon form of a matrix */
function reducedRowEchelonForm(matrix: number[][]): number[][] {
  // I stole this from here:
  // https://github.com/substack/rref
  const A = matrix.map((row) => row.slice());

  const rows = A.length;
  const columns = A[0].length;

  let lead = 0;
  for (let k = 0; k < rows; k++) {
    if (columns <= lead) throw new Error('Matrix is rank deficient');

    let i = k;
    while (A[i][lead] === 0) {
      i++;
      if (rows === i) {
        i = k;
        lead++;
        if (columns === lead) throw new Error('Matrix is rank deficient');
      }
    }
    const irow = A[i],
      krow = A[k];
    (A[i] = krow), (A[k] = irow);

    let val = A[k][lead];
    for (let j = 0; j < columns; j++) {
      A[k][j] /= val;
    }

    for (let i = 0; i < rows; i++) {
      if (i === k) continue;
      val = A[i][lead];
      for (let j = 0; j < columns; j++) {
        A[i][j] -= val * A[k][j];
      }
    }
    lead++;
  }
  return A;
}

/** Utility functions for operations on vectors */
const VMath = {
  /** Subtracts vector a from vector b and returns the result */
  sub(a: number[], b: number[]): number[] {
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result.push(b[i] - a[i]);
    }
    return result;
  },

  /** Adds any number of vectors and returns the result */
  sum(...vectors: number[][]): number[] {
    const result = [];
    for (let i = 0; i < vectors[0].length; i++) {
      let sum = 0;
      for (const vector of vectors) {
        sum += vector[i];
      }
      result.push(sum);
    }
    return result;
  },

  /** Multiplies a vector by a scalar and returns the result */
  mult(vector: number[], scalar: number): number[] {
    const result = [];
    for (let i = 0; i < vector.length; i++) {
      result.push(vector[i] * scalar);
    }
    return result;
  },

  /** Divides a vector by a scalar and returns the result */
  div(vector: number[], scalar: number): number[] {
    const result = [];
    for (let i = 0; i < vector.length; i++) {
      result.push(vector[i] / scalar);
    }
    return result;
  },

  /** Returns the dot product of two vectors */
  dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  },

  /** Returns the magnitude of a vector */
  norm(vector: number[]): number {
    return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  },

  /** Returns the normalized version of a vector */
  normalize(vector: number[]): number[] {
    const length = VMath.norm(vector);
    return VMath.div(vector, length);
  },

  /** Returns the average of any number of vectors */
  mean(...vectors: number[][]): number[] {
    const result = [];
    for (let i = 0; i < vectors[0].length; i++) {
      let sum = 0;
      for (const vector of vectors) {
        sum += vector[i];
      }
      result.push(sum / vectors.length);
    }
    return result;
  },

  /** Returns the cross product of two vectors (3D only!) */
  cross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  },

  /** Returns the normal to the hyperplane spanned by the given vectors */
  hyperplaneNormal(...vectors: number[][]): number[] {
    if (vectors.length === 1) {
      return vectors[0].slice();
    }
    const rref = reducedRowEchelonForm(vectors);
    // if (rref.some((row, i) => approx(row[i], 0))) {
    //   console.log(rref);
    //   const result = [] as number[];
    //   for (let i = 0; i < rref[0].length; i++) {
    //     result.push(rref.every((row) => approx(row[i], 0)) ? 1 : 0);
    //   }
    //   console.log(result);
    //   return VMath.normalize(result);
    // }
    console.log('rref', rref);
    const result = rref.map((row) => -row[row.length - 1]);
    return VMath.normalize([...result, 1]);
  },

  /** Returns the angle between two vectors */
  angle(a: number[], b: number[]): number {
    const dot = VMath.dot(a, b);
    const normA = VMath.norm(a);
    const normB = VMath.norm(b);
    return Math.acos(dot / (normA * normB));
  },

  /** Returns the distance between two vectors */
  distance(a: number[], b: number[]): number {
    return VMath.norm(VMath.sub(a, b));
  },

  /** Translates a vector in place by a vector */
  translate(vector: number[], translation: number[]): number[] {
    for (let i = 0; i < vector.length; i++) {
      vector[i] += translation[i];
    }
    return vector;
  },

  /** Multiplies a vector in place by a scalar */
  scale(vector: number[], scalar: number): number[] {
    for (let i = 0; i < vector.length; i++) {
      vector[i] *= scalar;
    }
    return vector;
  },

  /** Returns vector transformed by a matrix */
  transform(vector: number[], matrix: number[][]): number[] {
    const result = [];
    for (let i = 0; i < vector.length; i++) {
      let sum = 0;
      for (let j = 0; j < vector.length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum);
    }
    return result;
  },

  /** Linearly interpolates between two vectors */
  lerp(a: number[], b: number[], t: number): number[] {
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result.push(a[i] + (b[i] - a[i]) * t);
    }
    return result;
  },

  /** Projects a vector onto another vector */
  project(vector: number[], onto: number[]): number[] {
    const scalar = VMath.dot(vector, onto) / VMath.dot(onto, onto);
    return VMath.mult(onto, scalar);
  },

  /** Returns true if two vectors are equal */
  equal(a: number[], b: number[]): boolean {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  },

  /** Returns true if two vectors are approximately equal */
  approx(a: number[], b: number[], epsilon = 1e-10): boolean {
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > epsilon) {
        return false;
      }
    }
    return true;
  },

  /** Returns true if two vectors are perpendicular */
  perpendicular(a: number[], b: number[]): boolean {
    return approx(VMath.dot(a, b), 0);
  },

  /** Returns true if two vectors are parallel */
  parallel(a: number[], b: number[]): boolean {
    return approx(Math.abs(VMath.dot(a, b)), Math.abs(VMath.norm(a) * VMath.norm(b)));
  },
};

export default VMath;
