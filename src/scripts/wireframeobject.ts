/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type * as THREE from 'three';
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
    this.renderer.init(data.vertices.length, data.faces, data.optimalThickness);
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
    const points3D = perspectiveProject(this.points4D, -1.5);
    const MAX_W = 1;
    const color = this.points4D.map((p) => ((p[3] + MAX_W) / MAX_W) * 0.5);

    this.renderer.update(points3D, color);
  }

  /** Deletes all meshes, use to dispose of object */
  dispose(): void {
    this.renderer.dispose();
  }
}

export default WireframeObject;
