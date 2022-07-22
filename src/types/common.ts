type Rotation3D = {
  xy: number;
  xz: number;
  yz: number;
};
type Rotation4D = {
  xy: number;
  xz: number;
  yz: number;
  xw: number;
  yw: number;
  zw: number;
};
type OrientedArea3D = [e12: number, e13: number, e23: number];
type OrientedArea4D = [
  e12: number,
  e13: number,
  e14: number,
  e23: number,
  e24: number,
  e34: number
];

export type { Rotation3D, Rotation4D, OrientedArea3D, OrientedArea4D };
