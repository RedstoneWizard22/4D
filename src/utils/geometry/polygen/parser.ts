/**
 * Returned by `parsePlaintextCoxeterDiagram`, this gives the information needed to
 * construct the polytope described by the diagram.
 */
export type PolytopeDescription = {
  /** The diagram this information comes from */
  diagram: string;
  /** Specifies how to combine all the polytopes found in subpolytopes */
  combineMethod: 'none' | 'compound' | 'lace prism' | 'lace tower' | 'lace tegum' | 'lace ring';
  /**
   * Common symmetryMatrix for all subpolytopes S[i][j] = k means the i-th and
   * j-th mirrors have an angle of PI/k between them.
   */
  symmetryMatrix: number[][];
  /**
   * Common coxeterMatrix for all subpolytopes C[i][j] = k means the i-th and
   * j-th generators have the relation (ij)^k = I.
   */
  coxeterMatrix: number[][];
  /** Polytopes to combine, if `combineMethod` is none this will have size 1 */
  subpolytopes: {
    /** Offsets from the mirrors to place the initial vertex v0 */
    offsets: number[];
    /** Whether each node is active */
    active: boolean[];
    /** Whether each node is snub */
    snub: boolean[];
    /** Whether each node is dual */
    dual: boolean[];
  }[];
};

/**
 * Parses a coxter diagram in plaintext format (e.g. x4o3o), and returns information
 * used to construct the polytope.
 *
 * A description of how the plaintext format works can be found here:
 * https://polytope.miraheze.org/wiki/Coxeter_diagram
 *
 * The supported features are:
 * - Active/Inactive nodes using 'x' and 'o' respectively
 *   - e.g. x4o3o (cube)
 * - Spaces to denote 2-length edges
 *   - e.g. x4o3o = x x x (cube)
 * - Fractional edges
 *   - e.g. x5/2o (pentagram)
 * - Virtual nodes
 *   - e.g. x3o3o3*a (triangular tiling)
 *   - e.g. x3o3o*b3o (hexadecahedron)
 * - Different edge lengths
 *   - use o,v,x,q,f,h,k,u,w,F,Q,d,V,U,A,X,B
 *   - e.g. d x (3 by 1 rectangle)
 * - Snub nodes using 's'
 *   - e.g. s4s3s (snub cube)
 * - Dual nodes using 'm' in place of 'x' and 'p' in place of 's'
 *   - e.g. m4m3m (octahedron)
 * - Compounds with matching symmetry
 *   - e.g. xo4oo3oq (compound of cube and octahedron)
 * - Lace prisms/simplices by adding '&#x' to the end of the diagram
 *   - e.g. xx3ox&#x (triangular cupola)
 * - Lace towers by adding '&#xt' to the end of the diagram
 *   - e.g. xxo3oxx&#xt (cubeoctahedron)
 * - Lace tegums by adding '&#m' to the end of the diagram
 *   - e.g. TODO
 * - Lace rings by adding '&#xr' to the end of the diagram
 *   - e.g. xxxx5oooo&#xr (square-pentagonal duoprism)
 *
 * For a description of the returned data see the acompanying `PolytopeDescription` type.
 *
 * @param diagram The coxeter diagram in plaintext format
 * @returns See the `PolytopeDescription` type exported along with this function
 */
export function parsePlaintextCoxeterDiagram(diagram: string): PolytopeDescription {
  /// Setup
  // prettier-ignore
  const VALID_NODES = ['o', 'v', 'x', 's', 'm', 'p', 'q', 'f', 'h', 'k', 'u', 'w', 'F', 'Q', 'd', 'V', 'U', 'A', 'X', 'B'] as const;
  const INT_CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const OTHER_CHARS = [' ', '/', '*'];
  type ValidNodes = typeof VALID_NODES[number];

  function isValidNode(nodeChar: string): nodeChar is ValidNodes {
    return VALID_NODES.includes(nodeChar as ValidNodes);
  }

  const nodeEdgeLengths: Record<ValidNodes, number> = {
    o: 0,
    v: (Math.sqrt(5) - 1) / 2,
    x: 1,
    s: 1,
    m: 1,
    p: 1,
    q: Math.sqrt(2),
    f: (Math.sqrt(5) + 1) / 2,
    h: Math.sqrt(3),
    k: Math.sqrt(Math.sqrt(2) + 2),
    u: 2,
    w: Math.sqrt(2) + 1,
    F: (Math.sqrt(5) + 3) / 2,
    Q: 2 * Math.sqrt(2),
    d: 3,
    V: 1 + Math.sqrt(5),
    U: 2 + Math.sqrt(2),
    A: (5 + Math.sqrt(5)) / 4,
    X: 1 + 2 * Math.sqrt(2),
    B: 2 + Math.sqrt(5),
  };

  const originalDiagram = diagram;
  /** Raise an error occuring between `left` and `right` on the diagram, with details `details` */
  function err(left: number, right: number, details: string | string[]) {
    const l = originalDiagram.slice(0, left);
    const m = originalDiagram.slice(left, right);
    const r = originalDiagram.slice(right);
    if (typeof details === 'string') details = [details];
    throw new Error(`Error parsing diagram at: ${l}[${m}]${r}\n- ${details.join('\n- ')}`);
  }

  /// Parse diagram
  // Determine if this is a lace diagram
  let combineMethod: PolytopeDescription['combineMethod'] = 'none';

  const idx = diagram.indexOf('&#');
  if (idx >= 0) {
    const split = diagram.split('&#');
    if (split.length > 2) {
      err(idx, diagram.length, 'Multiple lace indicators "&#" found, only one should be present');
    }

    switch (split[1]) {
      case 'x':
        combineMethod = 'lace prism';
        break;
      case 'xt':
        combineMethod = 'lace tower';
        break;
      case 'm':
        combineMethod = 'lace tegum';
        break;
      case 'xr':
        combineMethod = 'lace ring';
        break;
      case '':
        err(idx, diagram.length, 'Lace indicator "&#" found, but no lace type specified after it');
        break;
      default:
        err(idx, diagram.length, `Unknown lace type "${split[1]}"`);
    }

    diagram = split[0]; // Remove lace indicator from diagram
  }

  // Determine how many nodes there are, check all characters are valid, and count
  // the size of each node group (e.g. xo3o has 2 groups xo of size 1 and o of size 3)
  const nodeGroupSizes = [] as number[];
  let newNodeGroup = true;
  let nodeCount = 0;
  for (let i = 0; i < diagram.length; i++) {
    const char = diagram[i];
    const prevChar = i > 0 ? diagram[i - 1] : '';
    if (prevChar !== '*') {
      if (isValidNode(char)) {
        if (newNodeGroup) {
          nodeGroupSizes.push(0);
          newNodeGroup = false;
        }
        nodeGroupSizes[nodeGroupSizes.length - 1]++;
        nodeCount++;
      } else if (!OTHER_CHARS.includes(char) && !INT_CHARS.includes(char)) {
        err(i, i + 1, [
          `Invalid character "${char}"`,
          `Valid node types are ${VALID_NODES.join(', ')}`,
          `Other valid characters are ${INT_CHARS.concat(OTHER_CHARS).join(', ')}`,
          "And anything coming straight after a '*' is allowed too",
        ]);
      } else {
        newNodeGroup = true;
      }
    }
  }

  // Check that the node group sizes are valid
  const subpolytopeCount = nodeGroupSizes[0];
  if (!nodeGroupSizes.every((size) => size === subpolytopeCount)) {
    err(0, diagram.length, [
      'All nodes groups must have the same size',
      `Sizes were: ${nodeGroupSizes.join(', ')}`,
    ]);
  }
  const isLaced = combineMethod.includes('lace');
  if (subpolytopeCount === 1 && isLaced) {
    err(0, diagram.length, 'Laced diagrams should have node groups of minimum size 2');
  } else if (subpolytopeCount > 1 && !isLaced) {
    // As the groups have size > 1, but there was no lace indicator, this is a
    // compound polytope
    combineMethod = 'compound';
  }

  nodeCount = Math.floor(nodeCount / subpolytopeCount);

  // 2) Prepare the data structures
  const S = Array.from({ length: nodeCount }, () => Array(nodeCount).fill(2)); // Symmetry matrix
  const C = Array.from({ length: nodeCount }, () => Array(nodeCount).fill(2)); // Coxeter matrix
  for (let i = 0; i < nodeCount; i++) {
    S[i][i] = C[i][i] = 1;
  }
  const subpolytopes = Array.from(
    { length: subpolytopeCount },
    () =>
      ({
        offsets: [],
        active: [],
        dual: [],
        snub: [],
      } as PolytopeDescription['subpolytopes'][number])
  );

  // 3) Parse the diagram
  if (!isValidNode(diagram[0])) {
    err(0, 1, 'First character must be a node');
  }

  /** Returns the target of the vnode specified at location `i` in the diagram */
  function vnodeTarget(i: number): number {
    if (combineMethod != 'none') {
      err(i, i + 1, 'Virtual nodes are not supported in compound/laced diagrams');
    }
    const target = diagram[i + 1].charCodeAt(0) - 97;
    if (target < 0 || target >= nodeCount) {
      err(i, i + 2, [
        'Virtual node must point to a valid node',
        `${diagram[i + 1]} does not lie between a and ${String.fromCharCode(97 + nodeCount - 1)}`,
      ]);
    }
    return target;
  }

  let prevWasEdge = true;
  let from = -1; // Edge goes from this node
  let to = 0; // To this node
  let i = 0;
  while (i < diagram.length) {
    if (!prevWasEdge) {
      // If a vnode exists before the edge value, then we need to jump
      // to the vnode's target node
      if (diagram[i] == '*') {
        const target = vnodeTarget(i);
        from = target;
        i += 2;
      }

      // Parse the edge value
      let n = 2; // numerator (as coxeter matrix only uses numerators)
      let f = 2; // fraction
      if (diagram[i] != ' ') {
        const getInt = () => {
          let str = '';
          const i0 = i;
          while (INT_CHARS.includes(diagram[i])) {
            str += diagram[i++];
          }
          const val = parseInt(str);
          if (str == '') {
            err(i0, i, 'Expected an integer here');
          }
          if (isNaN(val)) {
            err(i0, i, 'Failed to parse integer');
          }
          if (val < 2) {
            err(i0, i, 'Integer must be at least 2');
          }
          return val;
        };

        n = f = getInt();
        if (diagram[i] == '/') {
          // Fractional edge
          i++;
          const d = getInt();
          f /= d;
        }
      } else {
        i++;
      }

      // If a vnode exists after the edge value, then the edge
      // points to the vnode's target node
      if (diagram[i] == '*') {
        const target = vnodeTarget(i);
        to--;
        from = target;
        i += 2;
      }

      if (to >= nodeCount) {
        err(i, i + 1, 'Missing a node here');
      }

      S[from][to] = S[to][from] = f;
      C[from][to] = C[to][from] = n;
      prevWasEdge = true;
    } else {
      // We are processing nodes
      for (let s = 0; s < subpolytopeCount; s++) {
        const subpoly = subpolytopes[s];
        const c = diagram[i + s];
        if (isValidNode(c)) {
          subpoly.offsets[to] = nodeEdgeLengths[c] / 2;
          subpoly.active.push(c != 'o');
          subpoly.dual.push(c == 'm' || c == 'p');
          subpoly.snub.push(c == 's' || c == 'p');
        } else {
          err(i + s, i + s + 1, 'Expected a node, is this a valid node type?');
        }
      }
      i += subpolytopeCount;
      from = to++;
      prevWasEdge = false;
    }
  }

  return {
    diagram: originalDiagram,
    combineMethod,
    symmetryMatrix: S,
    coxeterMatrix: C,
    subpolytopes,
  };
}
