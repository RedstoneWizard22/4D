import type { Rotation4D } from 'src/types/common';
import { Rotor4D } from './4dtools';
import MMath from './mmath';

interface HyperObjectData {
  vertices: number[][];
  faces: number[][];
  cells: number[][];
  optimalThickness?: number;
}

class HyperObject {
  data!: HyperObjectData;
  axes = MMath.identity(4);
  points4D!: number[][];
  rotor: Rotor4D;

  constructor(data?: HyperObjectData) {
    if (data) {
      this.loadData(data);
    } else {
      this.data = {
        vertices: [],
        faces: [],
        cells: [],
        optimalThickness: 0,
      };
    }
    this.rotor = new Rotor4D();
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData): void {
    this.data = data;
    this.reset();
  }

  /** Resets the hyperobject to it's original state */
  reset(): void {
    this.points4D = this.data.vertices.map((v) => v.slice());
    this.axes = MMath.identity(4);
  }

  /** Rotates points4D by a certain ammount */
  rotate(rotation: Partial<Rotation4D>, worldAxes = false): void {
    const axes = this.axes;
    const rotor = this.rotor;

    for (const [key, value] of Object.entries(rotation)) {
      if (Math.abs(value) > 0.00001) {
        // Set the plane of rotation
        if (!worldAxes) {
          switch (key) {
            case 'xy':
              rotor.setPlane(axes[0], axes[1]);
              break;
            case 'xz':
              rotor.setPlane(axes[0], axes[2]);
              break;
            case 'yz':
              rotor.setPlane(axes[1], axes[2]);
              break;
            case 'xw':
              rotor.setPlane(axes[0], axes[3]);
              break;
            case 'yw':
              rotor.setPlane(axes[1], axes[3]);
              break;
            case 'zw':
              rotor.setPlane(axes[2], axes[3]);
              break;
          }
        } else {
          switch (key) {
            case 'xy':
              rotor.setPlane([1, 0, 0, 0], [0, 1, 0, 0]);
              break;
            case 'xz':
              rotor.setPlane([1, 0, 0, 0], [0, 0, 1, 0]);
              break;
            case 'yz':
              rotor.setPlane([0, 1, 0, 0], [0, 0, 1, 0]);
              break;
            case 'xw':
              rotor.setPlane([1, 0, 0, 0], [0, 0, 0, 1]);
              break;
            case 'yw':
              rotor.setPlane([0, 1, 0, 0], [0, 0, 0, 1]);
              break;
            case 'zw':
              rotor.setPlane([0, 0, 1, 0], [0, 0, 0, 1]);
              break;
          }
        }

        // Set the angle of rotation
        rotor.setAngle(value);

        // Rotate the points and axes
        this.points4D = this.rotor.rotate(this.points4D);
        this.axes = this.rotor.rotate(this.axes);
      }
    }
  }
}

export default HyperObject;
export type { HyperObjectData };
