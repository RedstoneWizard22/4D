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

interface HyperObjectData3D {
  vertices: number[][];
  faces: number[][];
}

export type { Rotation3D, Rotation4D, HyperObjectData3D };
