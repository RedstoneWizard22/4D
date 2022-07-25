/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type * as THREE from 'three';
import { orientedArea4D, perspectiveProject, Rotor4D } from './4dtools';
import type { HyperObjectData } from './hyperobject';
import VMath from './tools';
import { WireframeRenderer } from './wireframerenderer';

function getEdgesFromFaces(faces: number[][]) {
  const edges: number[][] = [];
  const usedEdges = new Set<string>();
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const edge = [face[i], face[(i + 1) % face.length]].sort();
      const edgeStr = edge.join(',');
      if (!usedEdges.has(edgeStr)) {
        edges.push(edge);
        usedEdges.add(edgeStr);
      }
    }
  }
  return edges;
}

class FoldingObject {
  rotor: Rotor4D;
  renderer: WireframeRenderer;
  frames: number[][][] | undefined;

  constructor(scene: THREE.Scene, data?: HyperObjectData) {
    this.rotor = new Rotor4D();
    this.renderer = new WireframeRenderer(scene);
    if (data) {
      this.loadData(data);
    }
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData): void {
    const volumeNeighbours = data.volumes.map((volume, i) => {
      const neighbours = [];
      for (let j = 0; j < data.volumes.length; j++) {
        if (i != j) {
          const otherVolume = data.volumes[j];
          for (const face of otherVolume) {
            if (volume.includes(face)) {
              neighbours.push({
                index: j,
                commonFace: face,
              });
            }
          }
        }
      }
      return neighbours;
    });

    let vertices: number[][] = [];
    const faces: number[][] = [];

    type Tree = {
      myVertices: number[];
      center: number[];
      anchor: number[];
      children: Tree[];
    };

    const genTree = (source: number): Tree => {
      const visited = new Set<number>([source]);
      const queue: {
        index: number;
        joiningFace?: number;
        parentVertexMap: Map<number, number>;
        tree: Tree;
      }[] = [];
      const treeRoot = {
        myVertices: [],
        center: [],
        anchor: [],
        children: [],
      };
      queue.push({
        index: source,
        parentVertexMap: new Map(),
        tree: treeRoot,
      });

      while (queue.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { index, joiningFace, parentVertexMap, tree } = queue.shift()!;

        const vertexMap = new Map<number, number>();

        const validFaces = data.volumes[index].filter((f) => f !== joiningFace);
        const volumeVerts = Array.from(new Set<number>(validFaces.flatMap((f) => data.faces[f])));

        for (const vIdx of volumeVerts) {
          const pv = parentVertexMap.get(vIdx);
          if (pv) {
            vertexMap.set(vIdx, pv);
          } else {
            tree.myVertices.push(vertices.length);
            vertexMap.set(vIdx, vertices.length);
            vertices.push(data.vertices[vIdx].slice());
          }
        }

        for (const face of validFaces) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          faces.push(data.faces[face].map((vIdx) => vertexMap.get(vIdx)!));
        }

        // Calculate center
        tree.center = VMath.mean(...volumeVerts.map((i) => data.vertices[i]));

        // Calculate anchor
        tree.anchor =
          joiningFace === undefined
            ? [0, 0, 0, 0]
            : VMath.mean(...data.faces[joiningFace].map((i) => data.vertices[i]));

        // Fill in children
        volumeNeighbours[index].forEach((n) => {
          if (!visited.has(n.index)) {
            visited.add(n.index);
            const subtree = {
              myVertices: [],
              center: [],
              anchor: [],
              children: [],
            };
            tree.children.push(subtree);
            queue.push({
              index: n.index,
              joiningFace: n.commonFace,
              parentVertexMap: vertexMap,
              tree: subtree,
            });
          }
        });
      }
      return treeRoot;
    };

    let tree = genTree(0);

    const rotateAllInTree = (tree: Tree, center?: number[]): void => {
      for (const vertex of tree.myVertices) {
        vertices[vertex] = this.rotor.rotate(vertices[vertex], center);
      }
      tree.center = this.rotor.rotate(tree.center, center);
      tree.anchor = this.rotor.rotate(tree.anchor, center);
      for (const child of tree.children) {
        rotateAllInTree(child, center);
      }
    };

    const translateAllInTree = (tree: Tree, translation: number[]): void => {
      for (const vertex of tree.myVertices) {
        VMath.translate(vertices[vertex], translation);
      }
      VMath.translate(tree.center, translation);
      VMath.translate(tree.anchor, translation);
      for (const child of tree.children) {
        translateAllInTree(child, translation);
      }
    };

    //// Problem:
    // The object could unfold into any hyperplane in 4D space, but I want it to unfold
    // along the x-y-z hyperplane. So I need to rotate the root node to lie entirely in
    // the x-y-z hyperplane.
    const root = tree;

    // First make vertex 0 lie at the origin, to make the math easier.
    translateAllInTree(tree, VMath.mult(vertices[root.myVertices[0]], -1));

    // v1 will be vertex 1
    const v1 = vertices[root.myVertices[1]].slice();
    // Pick a non-parallel vertex as v2
    let pick = (): number[] => {
      for (let i = 2; i < root.myVertices.length; i++) {
        const potential = vertices[root.myVertices[i]].slice();
        if (!VMath.parallel(v1, potential)) {
          return potential;
        }
      }
      throw new Error('Could not find a non-parallel vertex');
    };
    const v2 = pick();
    // Now pick a non-coplanar vertex as v3
    pick = (): number[] => {
      const v12plane = orientedArea4D(v1, v2);
      for (let i = 2; i < root.myVertices.length; i++) {
        const potential = vertices[root.myVertices[i]].slice();
        const v13plane = orientedArea4D(v1, potential);
        if (!coplanar(v12plane, v13plane)) {
          return potential;
        }
      }
      throw new Error('Could not find a non-coplanar vertex');

      function coplanar(a: number[], b: number[]): boolean {
        const bInv = VMath.mult(b, -1);
        return VMath.equal(a, b) || VMath.equal(a, bInv);
      }
    };
    const v3 = pick();

    // console.log(v1, v2, v3);
    console.log('v1', v1);
    console.log('v2', v2);
    console.log('v3', v3);

    function orientedVolume4D(u: number[], v: number[], w: number[]): number[] {
      const oa = orientedArea4D(u, v);
      return VMath.normalize([
        w[2] * oa[0] - w[1] * oa[1] + w[0] * oa[3],
        w[3] * oa[0] - w[1] * oa[2] + w[0] * oa[4],
        w[3] * oa[1] - w[2] * oa[2] + w[0] * oa[5],
        w[3] * oa[3] - w[2] * oa[4] + w[1] * oa[5],
      ]);
    }

    const ov = orientedVolume4D(v1, v2, v3);
    const normal = [-ov[3], ov[2], -ov[1], ov[0]];
    const target = [0, 0, 0, 1];

    console.log('normal', normal);

    if (!VMath.parallel(normal, target)) {
      const angle = VMath.angle(normal, target);
      this.rotor.setAngle(angle);
      this.rotor.setPlane(normal, target);
      rotateAllInTree(tree);
    }

    const forceAllInTreeToBePositiveW = (tree: Tree): void => {
      for (const vertex of tree.myVertices) {
        vertices[vertex][3] = Math.abs(vertices[vertex][3]);
      }
      tree.center[3] = Math.abs(tree.center[3]);
      tree.anchor[3] = Math.abs(tree.anchor[3]);
      for (const child of tree.children) {
        forceAllInTreeToBePositiveW(child);
      }
    };
    const forceAllInTreeToBeNegativeW = (tree: Tree): void => {
      for (const vertex of tree.myVertices) {
        vertices[vertex][3] = -Math.abs(vertices[vertex][3]);
      }
      tree.center[3] = -Math.abs(tree.center[3]);
      tree.anchor[3] = -Math.abs(tree.anchor[3]);
      for (const child of tree.children) {
        forceAllInTreeToBeNegativeW(child);
      }
    };

    // forceAllInTreeToBePositiveW(tree);
    forceAllInTreeToBeNegativeW(tree);
    // Finally translate so that the root node is centered at the origin.
    translateAllInTree(tree, VMath.mult(root.center, -1));

    const unfold = (tree: Tree, percentage: number): void => {
      for (const child of tree.children) {
        const a = VMath.sub(child.center, child.anchor);
        const b = VMath.sub(tree.center, child.anchor);
        const angle = VMath.angle(a, b);

        // Rotate
        this.rotor.setAngle(-(Math.PI - angle) * percentage);
        this.rotor.setPlane(a, b);
        rotateAllInTree(child, child.anchor);
      }
      for (const child of tree.children) {
        unfold(child, percentage);
      }
    };

    const cloneTree = (tree: Tree): Tree => {
      return {
        myVertices: [...tree.myVertices],
        center: [...tree.center],
        anchor: [...tree.anchor],
        children: tree.children.map((child) => cloneTree(child)),
      };
    };

    const cloneVertices = (): number[][] => {
      return vertices.map((v) => [...v]);
    };

    this.frames = [];
    const FRAME_COUNT = 100;
    for (let i = 0; i <= FRAME_COUNT; i++) {
      const treeCopy = cloneTree(tree);
      const verticesCopy = cloneVertices();
      unfold(tree, i / FRAME_COUNT);
      this.frames.push(vertices);
      vertices = verticesCopy;
      tree = treeCopy;
    }

    const edges = getEdgesFromFaces(faces);

    this.renderer.init(vertices.length, edges, faces, data.optimalThickness * 0.9);
  }

  update(frame: number) {
    if (!this.frames) {
      console.error('No frames');
      return;
    }

    const points4D = this.frames[frame];
    const points3D = perspectiveProject(points4D, -3).map((p) => VMath.mult(p, 1.5));
    const MAX_W = 1;
    const color = points4D.map((p) => ((p[3] + MAX_W) / MAX_W) * 0.5 + 0.25);

    this.renderer.update(points3D, color);
  }

  /** Toggles visibility of all face meshes */
  setFacesVisible(visible: boolean): void {
    this.renderer.setFacesVisible(visible);
  }

  /** Toggles visibility of all meshes but only toggles face meshes if facesVisible is true */
  setVisible(visible: boolean): void {
    this.renderer.setVisible(visible);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

export default FoldingObject;
