/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { clamp } from '$utils/number';
import * as vm from '$utils/vmath';
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

    const { vertices, faces } = data;
    let totalFaceArea = 0;
    for (const face of faces) {
      const v0 = vertices[face[0]];
      for (let i = 1; i < face.length - 1; i++) {
        const v1 = vertices[face[i]];
        const v2 = vertices[face[i + 1]];
        const a = vm.sub(v1, v0);
        const b = vm.sub(v2, v0);
        totalFaceArea += vm.mag(a) * vm.mag(b) * Math.sin(vm.angle(a, b));
      }
    }

    const thickness = Math.sqrt(totalFaceArea / faces.length) * 0.025;

    this.renderer.init(vertices.length, faces, thickness);
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

    const MAX_W = 1;
    const depths = [];
    for (let i = 0; i < this.points4D.length; i++) {
      depths.push(clamp((this.points4D[i][3] / MAX_W + 1) / 2, 0, 1));
    }

    this.renderer.setVertexPositions(points3D);
    this.renderer.setVertexDepths(depths);
  }

  /** Deletes all meshes, use to dispose of object */
  dispose(): void {
    this.renderer.dispose();
  }
}

export default WireframeObject;
