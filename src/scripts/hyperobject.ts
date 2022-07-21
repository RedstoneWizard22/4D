import { Rotor4D } from './4dtools';

interface HyperObjectData {
  vertices: number[][];
  edges: number[][];
  faces: number[][];
  volumes: number[][];
  optimalCamW: number;
  optimalThickness: number;
  maxW: number;
}

type Rotation4D = {
  xy: number;
  xz: number;
  yz: number;
  xw: number;
  yw: number;
  zw: number;
};

class HyperObject {
  data!: HyperObjectData;
  axes!: {
    x: number[];
    y: number[];
    z: number[];
    w: number[];
  };
  points4D!: number[][];
  rotor: Rotor4D;

  constructor(data?: HyperObjectData) {
    if (data) {
      this.loadData(data);
    } else {
      this.data = {
        vertices: [],
        edges: [],
        faces: [],
        volumes: [],
        optimalCamW: 0,
        optimalThickness: 0,
        maxW: 0,
      };
    }
    this.rotor = new Rotor4D();
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData): void {
    this.data = data;
    this.axes = {
      x: [1, 0, 0, 0],
      y: [0, 1, 0, 0],
      z: [0, 0, 1, 0],
      w: [0, 0, 0, 1],
    };
    // Deep copy vertices to points4D
    this.points4D = data.vertices.map((v) => v.slice());
  }

  /** Sets points4D to data.vertices rotated by rotation */
  setRotation(rotation: Rotation4D): void {
    this.points4D = this.data.vertices.map((v) => v.slice());
    this.rotate(rotation);
  }

  /** Rotates points4D by a certain ammount */
  rotate(rotation: Partial<Rotation4D>): void {
    const axes = this.axes;
    const rotor = this.rotor;

    // Rotation array
    const rot = [
      rotation.xy ?? 0,
      rotation.xz ?? 0,
      rotation.yz ?? 0,
      rotation.xw ?? 0,
      rotation.yw ?? 0,
      rotation.zw ?? 0,
    ];

    // For each rotation in order apply the rotation around the corresponding plane
    for (let i = 0; i < rot.length; i++) {
      // Continue if angle is undefined
      if (Math.abs(rot[i]) < 0.00001) {
        continue;
      }

      // Set the plane of rotation
      switch (i) {
        case 0:
          rotor.setPlane(axes.x, axes.y);
          break;
        case 1:
          rotor.setPlane(axes.x, axes.z);
          break;
        case 2:
          rotor.setPlane(axes.y, axes.z);
          break;
        case 3:
          rotor.setPlane(axes.x, axes.w);
          break;
        case 4:
          rotor.setPlane(axes.y, axes.w);
          break;
        case 5:
          rotor.setPlane(axes.z, axes.w);
          break;
      }

      // Set the angle of rotation
      rotor.setAngle(rot[i]);

      // Calculate the rotation matrix
      rotor.calculateRotationMatrix();

      // Rotate the points
      this.points4D = this.rotor.rotate(this.points4D);

      // Rotate every axis by the same amount
      this.axes.x = this.rotor.rotate(this.axes.x);
      this.axes.y = this.rotor.rotate(this.axes.y);
      this.axes.z = this.rotor.rotate(this.axes.z);
      this.axes.w = this.rotor.rotate(this.axes.w);
    }
  }
}

export default HyperObject;
export type { HyperObjectData, Rotation4D };
