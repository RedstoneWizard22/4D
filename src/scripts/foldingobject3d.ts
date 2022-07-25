/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type * as THREE from 'three';
import { orientedArea3D, Rotor3D } from './4dtools';
import VMath from './tools';
import { WireframeRenderer } from './wireframerenderer';

interface HyperObjectData3D {
  vertices: number[][];
  edges: number[][];
  faces: number[][];
}

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
    data.edges.forEach((edge) => edge.sort());
    const edgeMap = new Map<string, number>(data.edges.map((edge, i) => [edge.join(','), i]));
    const faceEdges = data.faces.map((face) => {
      const edges = [];
      for (let i = 0; i < face.length; i++) {
        const edge = [face[i], face[(i + 1) % face.length]].sort();
        edges.push(edgeMap.get(edge.join(','))!);
      }
      return edges;
    });

    const faceNeighbours = faceEdges.map((face, i) => {
      const neighbours = [];
      for (let j = 0; j < data.faces.length; j++) {
        if (i != j) {
          const otherFace = faceEdges[j];
          for (const edge of otherFace) {
            if (face.includes(edge)) {
              neighbours.push({
                index: j,
                commonEdge: edge,
              });
            }
          }
        }
      }
      return neighbours;
    });

    console.log(faceNeighbours);

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
        joiningEdge?: number;
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
        const { index, joiningEdge, parentVertexMap, tree } = queue.shift()!;

        const vertexMap = new Map<number, number>();

        faces.push([]);
        for (const vIdx of data.faces[index]) {
          if (joiningEdge !== undefined && data.edges[joiningEdge].includes(vIdx)) {
            const tmp = parentVertexMap.get(vIdx);
            if (tmp === undefined) throw new Error('Oh shit');
            faces[faces.length - 1].push(tmp);
            vertexMap.set(vIdx, tmp);
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
        tree.anchor =
          joiningEdge === undefined
            ? [0, 0, 0]
            : VMath.mean(...data.edges[joiningEdge].map((i) => data.vertices[i]));

        // Fill in children
        faceNeighbours[index].forEach((n) => {
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
              joiningEdge: n.commonEdge,
              parentVertexMap: vertexMap,
              tree: subtree,
            });
          }
        });
      }

      return treeRoot;
    };

    let tree = genTree(1);

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

    const edges = getEdgesFromFaces(faces);

    console.log({ faceNeighbours });
    console.log(tree);
    console.log({ vertices, edges, faces });

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

    // unfold(tree, 1);
    // this.frames = [vertices];

    this.renderer.init(vertices.length, edges, faces, 0.05);
    this.renderer.update(vertices);
  }

  update(frame: number) {
    if (!this.frames) {
      console.error('No frames');
      return;
    }

    const points3D = this.frames[frame];
    // const MAX_W = 1;
    // const color = points3D.map((p) => ((p[2] + MAX_W) / MAX_W) * 0.5);

    this.renderer.update(points3D);
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
