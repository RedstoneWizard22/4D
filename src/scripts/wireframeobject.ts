/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { perspectiveProject } from './4dtools';
import HyperObject, { type HyperObjectData } from './hyperobject';
import WireframeRenderer from './wireframerenderer';

class WireframeObject extends HyperObject {
  renderer: WireframeRenderer;

  constructor(scene: THREE.Scene, data?: HyperObjectData) {
    super();

    this.renderer = new WireframeRenderer(scene);

    if (data) {
      this.loadData(data);
    }
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData): void {
    super.loadData(data);
    this.renderer.init(data.vertices.length, data.faces, data.optimalThickness * 0.8 * 0.9);
  }

  /** Toggles visibility of all face meshes */
  setFacesVisible(visible: boolean): void {
    this.renderer.setFacesVisible(visible);
  }

  /** Toggles visibility of all meshes but only toggles face meshes if facesVisible is true */
  setVisible(visible: boolean): void {
    this.renderer.setVisible(visible);
  }

  /** Updates position and rotation of all meshes to the correct values */
  update(): void {
    const points3D = perspectiveProject(this.points4D, -2);

    const dummyColor = new THREE.Color(0xffffff);
    const MAX_W = 1;
    const color = this.points4D.map((p) => {
      const h = (60 - ((p[3] + MAX_W) / MAX_W) * 30) / 360;
      dummyColor.setHSL(h % 1, 1, 0.5);
      return dummyColor.toArray();
    });

    this.renderer.setVertexPositions(points3D);
    this.renderer.setVertexColors(color);
  }

  /** Deletes all meshes, use to dispose of object */
  dispose(): void {
    this.renderer.dispose();
  }
}

export default WireframeObject;
