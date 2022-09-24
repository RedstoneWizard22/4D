/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { HyperObjectData3D, Rotation3D } from 'src/types/common';
import * as THREE from 'three';
import { Rotor3D } from './4dtools';
import * as vm from '$utils/vmath';
import WireframeRenderer from './wireframerenderer';

export default class WireframeObject3D {
  renderer: WireframeRenderer;
  data: HyperObjectData3D | undefined;
  vertices: number[][] | undefined;
  rotor: Rotor3D;

  constructor(scene: THREE.Scene, data?: HyperObjectData3D) {
    this.renderer = new WireframeRenderer(scene);
    this.rotor = new Rotor3D();
    if (data) {
      this.loadData(data);
    }
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData3D): void {
    this.dispose();
    this.data = data;
    this.reset();
    this.renderer.init(data.vertices.length, data.faces, 0.05);
  }

  /** Resets the hyperobject to it's original state */
  reset(): void {
    if (!this.data) {
      throw new Error('No data loaded');
    }
    this.vertices = this.data.vertices.map((v) => v.slice());
  }

  /** Rotates points4D by a certain ammount */
  rotate(rotation: Partial<Rotation3D>): void {
    if (!this.vertices) {
      throw new Error('No data loaded');
    }

    for (const [key, value] of Object.entries(rotation)) {
      if (Math.abs(value) > 0.00001) {
        switch (key) {
          case 'xy':
            this.rotor.setPlane([1, 0, 0], [0, 1, 0]);
            break;
          case 'xz':
            this.rotor.setPlane([1, 0, 0], [0, 0, 1]);
            break;
          case 'yz':
            this.rotor.setPlane([0, 1, 0], [0, 0, 1]);
            break;
          default:
            throw new Error(`Unknown rotation axis: ${key}`);
        }
        this.rotor.setAngle(value);
        this.vertices = this.rotor.rotate(this.vertices);
      }
    }
  }

  /** Updates position and rotation of all meshes to the correct values */
  update(ppFactor = 0): void {
    if (!this.vertices) {
      throw new Error('No data loaded');
    }

    const dummyColor = new THREE.Color(0xffffff);
    const MAX_W = 1;
    const color = this.vertices.map((p) => {
      const h = (((p[1] + MAX_W) / MAX_W) * 30) / 360;
      dummyColor.setHSL(h % 1, 1, 0.5);
      return dummyColor.toArray();
    });
    this.renderer.setVertexColors(color);

    if (ppFactor) {
      const interpPoints = [];
      const CAM_DIST = 2;
      const perspPoints = this.vertices.map((point) =>
        vm.smult([point[0], 0, point[2]], 1.5 / (CAM_DIST - point[1]))
      );
      for (let i = 0; i < this.vertices.length; i++) {
        interpPoints.push(vm.lerp(this.vertices[i], perspPoints[i], ppFactor));
      }
      this.renderer.setVertexPositions(interpPoints);
    } else {
      this.renderer.setVertexPositions(this.vertices);
    }
  }

  /** Use to dispose of the WireframeObject3D (you can still reuse it if you load new data) */
  dispose(): void {
    this.data = undefined;
    this.vertices = undefined;
    this.renderer.dispose();
  }
}
