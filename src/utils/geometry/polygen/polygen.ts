import * as vm from '$utils/vmath';
import MMath from '../../../scripts/mmath';
import CosetTable from './coset-table';
import { parsePlaintextCoxeterDiagram } from './parser';

type Polytope = {
  /** Coordinates of the vertices of the polytope */
  vertices: number[][];
  /** Array of vertex pairs that make up each edge */
  edges: number[][];
  /**
   * Indices of the vertices that make up each face.
   * The vertices are in traversal order.
   */
  faces: number[][];
  /**
   * Indices of the faces that make up each cell.
   */
  cells: number[][];
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
  return MMath.solve(normals, d);
}

function polygen(diagram: string, normalize = false): Polytope {
  const info = parsePlaintextCoxeterDiagram(diagram);
  const S = info.symmetryMatrix;
  const C = info.coxeterMatrix;
  const { combineMethod, subpolytopes } = info;
  const d = S.length;
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.substring(0, d);
  const char2int = new Map(alphabet.split('').map((c, i) => [c, i]));

  // Check that the input is valid
  const poly = subpolytopes[0];
  if (d > 4 || d < 2) {
    throw new Error('Only 2-3D polytopes are supported');
  }
  if (combineMethod != 'none') {
    throw new Error('Plytope compounds/laces are not supported!');
  }
  // for (let i = 0; i < d; i++) {
  //   for (let j = 0; j < d; j++) {
  //     if (S[i][j] != C[i][j]) {
  //       throw new Error('Fractional symmetry is not supported!');
  //     }
  //   }
  // }
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
  if (normalize) {
    vm.normi(v0);
  }

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
  const faceinfo = [] as {
    generators: number[];
    stabilizers: number[];
    ct: CosetTable;
    idx: number;
  }[];
  const faces = [] as number[][];
  for (const [i, j] of combinations(arange(d), 2)) {
    const m = S[i][j];
    const c = C[i][j];
    const f0 = [];
    // If both mirrors are active, then they generate a face
    if (poly.active[i] && poly.active[j]) {
      for (let k = 0; k < c; k++) {
        const word = `${alphabet[i]}${alphabet[j]}`.repeat(k);
        f0.push(vct.applyWord(0, word), vct.applyWord(0, alphabet[j] + word));
      }
    }
    // If one mirror is active, and the other is not orthogonal to that
    // mirror, then they generate a face
    else if ((poly.active[i] || poly.active[j]) && m != 2) {
      for (let k = 0; k < c; k++) {
        const word = `${alphabet[i]}${alphabet[j]}`.repeat(k);
        f0.push(vct.applyWord(0, word));
      }
    }

    if (f0.length == 0) continue;

    const stabilizers = [i, j].concat(getOrthogonalStabilizingMirrors([i, j]));
    const subgens = stabilizers.map((k) => alphabet[k]);
    const fct = new CosetTable(alphabet, relations, subgens);
    fct.solve();
    const idx = faces.length;
    faces.push(...getOrbit(fct.getRepresentatives(), f0));
    faceinfo.push({ generators: [i, j], stabilizers, ct: fct, idx });
  }

  const cells = [];
  if (d > 3) {
    for (const combo of combinations(arange(d), 3)) {
      const [i, j, k] = combo;
      // In general, if active mirror count <= number of orthogonal pairs, then
      // the n mirrors generate a face/cell/etc
      const activeCount = ~~poly.active[i] + ~~poly.active[j] + ~~poly.active[k];
      const orthoCount = ~~(S[i][j] == 2) + ~~(S[i][k] == 2) + ~~(S[j][k] == 2);
      if (orthoCount > activeCount || activeCount == 0) {
        continue; // This combination does not generate a cell
      }

      const subgens = [i, j, k]
        .concat(getOrthogonalStabilizingMirrors([i, j, k]))
        .map((l) => alphabet[l]);
      const cct = new CosetTable(alphabet, relations, subgens);
      cct.solve();
      const reps = cct.getRepresentatives();

      // Now I know how cell0 gets reflected to other cells, but I still need
      // to figure out which vertices make up cell0. And this won't be as easy
      // as it was for edges and faces.

      // 1) Find the subalphabet, subrelations, and subgenerators for what is
      //    cell0
      const subalphabet = alphabet[i] + alphabet[j] + alphabet[k];
      const subrelations = relations.filter((r) => {
        for (const c of r) {
          if (!subalphabet.includes(c)) return false;
        }
        return true;
      });

      // 2) TODO
      const toAdd = Array.from({ length: reps.length }, () => [] as number[]);
      for (const info of faceinfo) {
        if (info.generators.every((g) => combo.includes(g))) {
          const subgens = info.stabilizers.filter((g) => combo.includes(g)).map((l) => alphabet[l]);

          const sct = new CosetTable(subalphabet, subrelations, subgens);
          sct.solve();
          const orbot = sct.getRepresentatives().map((rep) => info.ct.applyWord(0, rep));
          for (let r = 0; r < reps.length; r++) {
            const word = reps[r];
            toAdd[r].push(...orbot.map((o) => info.ct.applyWord(o, word) + info.idx));
          }
        }
      }
      cells.push(...toAdd);

      // // 2) Find the subgenerators for cell0's vertices, and construct a coset table
      // const subsubgens = [i, j, k].filter((l) => !poly.active[l]).map((l) => alphabet[l]);
      // console.log(subalphabet, subrelations, subsubgens);
      // const subvct = new CosetTable(subalphabet, subrelations, subsubgens);
      // subvct.solve();
      // const cell0verts = subvct.getRepresentatives().map((rep) => vct.applyWord(0, rep));
      // cells.push(...getOrbit(cct.getRepresentatives(), cell0verts));
    }
  }

  return { vertices, edges, faces, cells };
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
