import * as vm from '$utils/vmath';
import MMath from '../../../scripts/mmath';
import CosetTable from './coset-table';
import { parsePlaintextCoxeterDiagram } from './parser';

type Polytope = {
  vertices: number[][];
  edges: number[][];
  faces: number[][];
};

/** Returns the relations contained within a coxeter diagram */
function getRelations(coxeterMatrix: number[][], alphabet: string) {
  const n = coxeterMatrix.length;
  const relations = [];
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      relations.push(`${alphabet[i]}${alphabet[j]}`.repeat(coxeterMatrix[i][j]));
    }
  }
  return relations;
}

/**
 * Places a set of mirrors given a symmetry matrix S, where S[i][j] = k means
 * the i-th and j-th mirrors have an angle of PI/k between them. Returns the
 * normals of the mirrors.
 *
 * Taken from: https://github.com/neozhaoliang/pywonderland/blob/master/src/polytopes/polytopes/helpers.py
 */
function placeMirrors(symmetryMatrix: number[][]) {
  const C = symmetryMatrix.map((row) => row.map((x) => -Math.cos(Math.PI / x)));
  const M = C.map((row) => row.map(() => 0));
  const n = M.length;
  // The first normal vector is simply (1, 0, ..., 0)
  M[0][0] = 1;
  // In the i-th row, the j-th entry can be computed via the (j, j) entry
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      const mj_colonj = M[j].slice(0, j);
      const mi_colonj = M[i].slice(0, j);
      M[i][j] = (C[i][j] - vm.dot(mj_colonj, mi_colonj)) / M[j][j];
    }
    const mi_coloni = M[i].slice(0, i);
    M[i][i] = Math.sqrt(1 - vm.dot(mi_coloni, mi_coloni));
  }
  return M;
}

/**
 * Given a set of mirror normals, and distances from the mirrors `d`, returns
 * coordinates of a vertex v0 matching these constraints.
 */
function placeInitialVertex(normals: number[][], d: number[]) {
  return vm.norm(MMath.solve(normals, d));
}

function polygen(diagram: string): Polytope {
  const info = parsePlaintextCoxeterDiagram(diagram);
  const S = info.symmetryMatrix;
  const C = info.coxeterMatrix;
  const { combineMethod, subpolytopes } = info;
  const d = S.length;
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.substring(0, d);
  const char2int = new Map(alphabet.split('').map((c, i) => [c, i]));

  // Check that the input is valid
  const poly = subpolytopes[0];
  if (d > 3 || d < 2) {
    throw new Error('Only 2-3D polytopes are supported');
  }
  if (combineMethod != 'none') {
    throw new Error('Plytope compounds/laces are not supported!');
  }
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      if (S[i][j] != C[i][j]) {
        throw new Error('Fractional symmetry is not supported!');
      }
    }
  }
  if (poly.dual.some((x) => x)) {
    throw new Error('Dual polytopes are not supported!');
  }
  if (poly.snub.some((x) => x)) {
    throw new Error('Snub polytopes are not supported!');
  }

  // Get stuff
  const normals = placeMirrors(S);
  const v0 = placeInitialVertex(normals, poly.offsets);
  const relations = getRelations(C, alphabet);

  // Generate vertices
  const subgens = poly.active.map((a, i) => (a ? '' : alphabet[i])).filter((x) => x != '');
  const vct = new CosetTable(alphabet, relations, subgens);
  vct.solve();
  const vertices = vct.getRepresentatives().map((rep) => {
    const v = v0.slice();
    rep.split('').forEach((c) => vm.reflecti(v, normals[char2int.get(c)!]));
    return v;
  });

  // Utility functions for generating edges and faces
  function getOrthogonalStabilizingMirrors(subgens: number[]) {
    const result = [];
    for (let s = 0; s < d; s++) {
      if (subgens.every((g) => S[g][s] === 2)) {
        if (!poly.active[s]) {
          result.push(s);
        }
      }
    }
    return result;
  }

  function getOrbit(cosetReps: string[], base: number[]) {
    return cosetReps.map((rep) => base.map((i) => vct.applyWord(i, rep)));
  }

  // Generate edges
  const edges: number[][] = [];
  for (let i = 0; i < d; i++) {
    // Each active mirror produces an edge
    if (poly.active[i]) {
      const e0 = [0, vct.applyWord(0, alphabet[i])];
      const subgens = [i].concat(getOrthogonalStabilizingMirrors([i])).map((j) => alphabet[j]);
      const ect = new CosetTable(alphabet, relations, subgens);
      ect.solve();
      edges.push(...getOrbit(ect.getRepresentatives(), e0));
    }
  }

  // Generate faces
  const faces = [] as number[][];
  if (d > 2) {
    for (const [i, j] of combinations(arange(d), 2)) {
      const m = S[i][j];
      const f0 = [];
      // If both mirrors are active, then they generate a face
      if (poly.active[i] && poly.active[j]) {
        for (let k = 0; k < m; k++) {
          const word = `${alphabet[i]}${alphabet[j]}`.repeat(k);
          f0.push(vct.applyWord(0, word), vct.applyWord(0, alphabet[j] + word));
        }
      }
      // If one mirror is active, and the other is not orthogonal to that
      // mirror, then they generate a face
      else if ((poly.active[i] || poly.active[j]) && m > 2) {
        for (let k = 0; k < m; k++) {
          const word = `${alphabet[i]}${alphabet[j]}`.repeat(k);
          f0.push(vct.applyWord(0, word));
        }
      }

      if (f0.length == 0) continue;

      const subgens = [i, j]
        .concat(getOrthogonalStabilizingMirrors([i, j]))
        .map((k) => alphabet[k]);
      const fct = new CosetTable(alphabet, relations, subgens);
      fct.solve();
      faces.push(...getOrbit(fct.getRepresentatives(), f0));
    }
  }

  return { vertices, edges, faces };
}

function arange(a: number, b?: number, step = 1) {
  const start = b === undefined ? 0 : a;
  const end = b ?? a;
  const result = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

function linspace(a: number, b: number, n: number) {
  const step = (b - a) / (n - 1);
  const result = [];
  for (let i = a; i <= b; i += step) {
    result.push(i);
  }
  return result;
}

function combinations<T>(array: T[], size: number) {
  const result: T[][] = [];
  function helper(start: number, current: T[]) {
    if (current.length === size) {
      result.push(current);
      return;
    }
    for (let i = start; i < array.length; i++) {
      helper(i + 1, current.concat(array[i]));
    }
  }
  helper(0, []);
  return result;
}

export { polygen };
