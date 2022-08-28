/** Matrix math module */
const MMath = {
  /** Returns the n by n identity matrix */
  identity(n: number): number[][] {
    const m = [] as number[][];
    for (let i = 0; i < n; ++i) {
      m[i] = [];
      for (let j = 0; j < n; ++j) {
        m[i][j] = i === j ? 1 : 0;
      }
    }
    return m;
  },

  /** Transposes a matrix */
  transpose(m: number[][]): number[][] {
    const n = m.length;
    const t = [] as number[][];
    for (let i = 0; i < n; i++) {
      t[i] = [];
      for (let j = 0; j < n; j++) {
        t[i][j] = m[j][i];
      }
    }
    return t;
  },

  /** Returns the determinant of a matrix */
  det(m: number[][]): number {
    const n = m.length;
    if (n === 1) {
      return m[0][0];
    }
    if (n === 2) {
      return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    }
    let d = 0;
    for (let i = 0; i < n; i++) {
      d += Math.pow(-1, i) * m[0][i] * MMath.det(MMath.minor(m, 0, i));
    }
    return d;
  },

  /** Returns the minor of a matrix */
  minor(m: number[][], i: number, j: number): number[][] {
    const rows = m.length;
    const cols = m[0].length;
    const minor = new Array(rows - 1).fill(0).map(() => new Array(cols - 1).fill(0));
    for (let r = 0; r < rows; r++) {
      if (r === i) {
        continue;
      }
      for (let c = 0; c < cols; c++) {
        if (c === j) {
          continue;
        }
        minor[r - (r > i ? 1 : 0)][c - (c > j ? 1 : 0)] = m[r][c];
      }
    }
    return minor;
  },

  /** Returns the cofactor of a matrix */
  cofactor(m: number[][], i: number, j: number): number {
    return Math.pow(-1, i + j) * MMath.det(MMath.minor(m, i, j));
  },

  /** Returns the adjugate of a matrix */
  adjugate(m: number[][]): number[][] {
    const n = m.length;
    const adj = [] as number[][];
    for (let i = 0; i < n; i++) {
      adj[i] = [];
      for (let j = 0; j < n; j++) {
        adj[i][j] = MMath.cofactor(m, i, j);
      }
    }
    return MMath.transpose(adj);
  },

  /** Returns the inverse of a matrix */
  inverse(m: number[][]): number[][] {
    const n = m.length;
    const inv = [] as number[][];
    const det = MMath.det(m);
    if (det === 0) {
      throw new Error('Cannot invert a singular matrix');
    }
    const adj = MMath.adjugate(m);
    for (let i = 0; i < n; i++) {
      inv[i] = [];
      for (let j = 0; j < n; j++) {
        inv[i][j] = adj[i][j] / det;
      }
    }
    return inv;
  },

  /** Returns the product of two matrices */
  multiply(m1: number[][], m2: number[][]): number[][] {
    const n = m1.length;
    const product = [] as number[][];
    for (let i = 0; i < n; i++) {
      product[i] = [];
      for (let j = 0; j < n; j++) {
        product[i][j] = 0;
        for (let k = 0; k < n; k++) {
          product[i][j] += m1[i][k] * m2[k][j];
        }
      }
    }
    return product;
  },

  /** Returns the product of a matrix and a vector */
  multiplyVector(m: number[][], v: number[]): number[] {
    const n = m.length;
    const product = [] as number[];
    for (let i = 0; i < n; i++) {
      product[i] = 0;
      for (let j = 0; j < n; j++) {
        product[i] += m[i][j] * v[j];
      }
    }
    return product;
  },

  /** Returns the product of a matrix and a scalar */
  multiplyScalar(m: number[][], s: number): number[][] {
    const n = m.length;
    const product = [] as number[][];
    for (let i = 0; i < n; i++) {
      product[i] = [];
      for (let j = 0; j < n; j++) {
        product[i][j] = m[i][j] * s;
      }
    }
    return product;
  },

  /** Constructs a matrix by stacking vectors vertically */
  vstack(...vectors: number[][]): number[][] {
    const n = vectors[0].length;
    const m = vectors.length;
    const stack = [] as number[][];
    for (let i = 0; i < m; i++) {
      stack[i] = [];
      for (let j = 0; j < n; j++) {
        stack[i][j] = vectors[i][j];
      }
    }
    return stack;
  },

  /** Constructs a matrix by stacking vectors horizontally */
  hstack(...vectors: number[][]): number[][] {
    const n = vectors[0].length;
    const m = vectors.length;
    const stack = [] as number[][];
    for (let i = 0; i < n; i++) {
      stack[i] = [];
      for (let j = 0; j < m; j++) {
        stack[i][j] = vectors[j][i];
      }
    }
    return stack;
  },
};

export default MMath;
