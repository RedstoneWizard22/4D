/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { Rotor3D } from './4dtools';
import VMath from './tools';
import { WireframeRenderer } from './wireframerenderer';

interface HyperObjectData3D {
  vertices: number[][];
  faces: number[][];
}

class FoldingObject3D {
  rotor: Rotor3D;
  renderer: WireframeRenderer;
  frames: number[][][] | undefined;

  constructor(scene: THREE.Scene, data?: HyperObjectData3D) {
    this.rotor = new Rotor3D();
    this.renderer = new WireframeRenderer(scene);
    if (data) {
      this.loadData(data);
    }
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData3D): void {
    /// Step1: Figure out which faces have which neighbours
    const faceNeighbours = data.faces.map((face, i) => {
      const neighbours = [];
      for (let j = 0; j < data.faces.length; j++) {
        if (i != j) {
          const intersection = face.filter((v) => data.faces[j].includes(v));
          if (intersection.length > 1) {
            if (intersection.length == 2) {
              neighbours.push(j);
            } else {
              throw new Error('Something funny with your data');
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
        const { index, parentVertexMap, tree } = queue.shift()!;

        const vertexMap = new Map<number, number>();

        faces.push([]);
        const toSum = [];
        for (const vIdx of data.faces[index]) {
          const tmp = parentVertexMap.get(vIdx);
          if (tmp !== undefined) {
            faces[faces.length - 1].push(tmp);
            vertexMap.set(vIdx, tmp);
            toSum.push(vertices[tmp]);
          } else {
            faces[faces.length - 1].push(vertices.length);
            tree.myVertices.push(vertices.length);
            vertexMap.set(vIdx, vertices.length);
            vertices.push(data.vertices[vIdx].slice());
          }
        }

        // Calculate center
        tree.center = VMath.mean(...data.faces[index].map((i) => data.vertices[i]));

        // Calculate anchor
        if (toSum.length != 0) {
          const v1 = VMath.sub(toSum[0], tree.center);
          const v2 = VMath.sub(toSum[0], toSum[1]);
          const v3 = VMath.project(v1, v2);
          tree.anchor = VMath.sum(toSum[0], v3);
        } else {
          tree.anchor = [0, 0, 0];
        }

        // Fill in children
        faceNeighbours[index].forEach((n) => {
          if (!visited.has(n)) {
            visited.add(n);
            const subtree = {
              myVertices: [],
              center: [],
              anchor: [],
              children: [],
            };
            tree.children.push(subtree);
            queue.push({
              index: n,
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

    // Rotate tree so that the root node lies in the xy plane
    const root = tree;
    translateAllInTree(tree, VMath.mult(vertices[root.myVertices[0]], -1));

    const v1 = vertices[root.myVertices[1]].slice();
    const v2 = vertices[root.myVertices[2]].slice();

    const normal = VMath.cross(v1, v2);
    const target = [0, 1, 0];

    if (!VMath.parallel(normal, target)) {
      const angle = VMath.angle(normal, target);
      this.rotor.setAngle(-angle);
      this.rotor.setPlane(normal, target);
      rotateAllInTree(tree);
    }

    const forceAllInTreeToBePositiveY = (tree: Tree): void => {
      for (const vertex of tree.myVertices) {
        vertices[vertex][1] = Math.abs(vertices[vertex][1]);
      }
      tree.center[1] = Math.abs(tree.center[1]);
      tree.anchor[1] = Math.abs(tree.anchor[1]);
      for (const child of tree.children) {
        forceAllInTreeToBePositiveY(child);
      }
    };

    forceAllInTreeToBePositiveY(tree); // So that shape expands/unfolds upwards
    translateAllInTree(tree, VMath.mult(root.center, -1));

    // DONE!

    const unfold = (tree: Tree, percentage: number): void => {
      for (const child of tree.children) {
        const a = VMath.sub(child.center, child.anchor);
        const b = VMath.sub(tree.center, child.anchor);
        const angle = VMath.angle(a, b);

        // Rotate
        this.rotor.setAngle((Math.PI - angle) * percentage);
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

    this.renderer.init(vertices.length, faces, 0.05);
  }

  update(frame: number) {
    if (!this.frames) {
      console.error('No frames');
      return;
    }

    const points3D = this.frames[frame];

    const dummyColor = new THREE.Color(0xffffff);
    dummyColor.setHSL(30 / 360, 1, 0.5);
    const color = points3D.map(() => dummyColor.toArray());

    this.renderer.setVertexPositions(points3D);
    this.renderer.setVertexColors(color);
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

export default FoldingObject3D;
export type { HyperObjectData3D };
