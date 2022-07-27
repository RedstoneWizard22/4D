/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { getEdgesFromFaces } from './etc';
import VMath from './tools';

function splitFaceIntoTriangles(face: number[]) {
  const triangles = [];
  for (let i = 0; i < face.length - 2; i++) {
    triangles.push([face[0], face[i + 1], face[i + 2]]);
  }
  return triangles;
}

class WireframeRenderer {
  visble = true;
  facesVisible = true;
  vertex:
    | {
        meshes: THREE.Mesh[];
      }
    | undefined;
  edge:
    | {
        data: number[][];
        meshes: THREE.Mesh[];
      }
    | undefined;
  face:
    | {
        data: number[][];
        triangles: number[][];
        mesh: THREE.Mesh;
        positionAttribute: THREE.Float32BufferAttribute;
        normalAttribute: THREE.Float32BufferAttribute;
      }
    | undefined;
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Toggles visibility of all face meshes */
  setFacesVisible(visible: boolean): void {
    if (!this.face) throw new Error('Object not initialized');
    this.facesVisible = visible;
    if (this.visble) {
      this.face.mesh.visible = visible;
    }
  }

  /** Toggles visibility of all meshes but only toggles face meshes if facesVisible is true */
  setVisible(visible: boolean): void {
    if (!this.vertex || !this.edge || !this.face) throw new Error('Object not initialized');
    this.vertex.meshes.forEach((m) => (m.visible = visible));
    this.edge.meshes.forEach((m) => (m.visible = visible));
    if (this.facesVisible) {
      this.face.mesh.visible = visible;
    }
    this.visble = visible;
  }

  /** Creates meshes that make up the wireframe and adds them to scene */
  init(vertexCount: number, faces: number[][], thickness: number): void {
    // Dispose of all old meshes and remove them from the scene
    this.dispose();

    /// Create edges
    this.edge = { data: getEdgesFromFaces(faces), meshes: [] };

    const edgeGeometry = new THREE.CylinderBufferGeometry(thickness, thickness, 1, 20);
    edgeGeometry.rotateX(-Math.PI / 2);

    // Create a mesh for each edge
    for (let i = 0; i < this.edge.data.length; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x2194ce,
        shininess: 100,
      });

      const color1 = { value: new THREE.Color(1, 0.5, 0) };
      const color2 = { value: new THREE.Color(1, 0.5, 0) };

      mat.defines = { USE_UV: '' };

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.color1 = color1;
        shader.uniforms.color2 = color2;
        shader.fragmentShader = `
        uniform vec3 color1;
        uniform vec3 color2;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( mix( color1, color2, vec3(vUv.y) ), opacity );'
        )}
        `;
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mat.userData.color1 = color1;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mat.userData.color2 = color2;

      const mesh = new THREE.Mesh(edgeGeometry, mat);
      this.edge.meshes.push(mesh);
      this.scene.add(mesh);
    }

    /// Create vertices
    this.vertex = { meshes: [] };

    const vertexGeometry = new THREE.SphereBufferGeometry(thickness, 20, 20);

    // Create a mesh for each vertex
    for (let i = 0; i < vertexCount; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x2194ce,
        shininess: 100,
      });

      const color = { value: new THREE.Color(1, 0.5, 0) };

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.color = color;
        shader.fragmentShader = `
        uniform vec3 color;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( color, opacity );'
        )}
        `;
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mat.userData.color = color;

      const mesh = new THREE.Mesh(vertexGeometry, mat);
      this.vertex.meshes.push(mesh);
      this.scene.add(mesh);
    }

    /// Create faces
    const triangles = faces.map(splitFaceIntoTriangles).flat();

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < triangles.length; i++) {
      positions.push(...VMath.random(9, 0, 1));
      normals.push(...VMath.random(9, 0, 1));
    }

    const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
    const normalAttribute = new THREE.Float32BufferAttribute(normals, 3);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('normal', normalAttribute);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      opacity: 0.15,
      transparent: true,
      clearcoat: 1.0,
      reflectivity: 1.0,
      roughness: 0.0,
      flatShading: true,
      premultipliedAlpha: true,
      precision: 'highp',
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    this.face = {
      data: faces,
      triangles,
      mesh,
      positionAttribute,
      normalAttribute,
    };

    // Set visibility of everything
    this.setVisible(this.visble);
    this.setFacesVisible(this.facesVisible);
  }

  /** Updates position and rotation of all meshes to the correct values */
  update(points: number[][], color?: number[]): void {
    if (!this.vertex || !this.edge || !this.face) throw new Error('Object not initialized');

    // Update edges
    for (let i = 0; i < this.edge.data.length; i++) {
      const edge = this.edge.data[i];

      const vertex1 = points[edge[0]];
      const vertex2 = points[edge[1]];

      // Update position
      this.edge.meshes[i].scale.z = VMath.distance(vertex1, vertex2);

      const newPosx = (vertex1[0] + vertex2[0]) / 2;
      const newPosy = (vertex1[1] + vertex2[1]) / 2;
      const newPosz = (vertex1[2] + vertex2[2]) / 2;

      this.edge.meshes[i].position.set(newPosx, newPosy, newPosz);

      this.edge.meshes[i].lookAt(
        vertex1[0] - vertex2[0] + newPosx,
        vertex1[1] - vertex2[1] + newPosy,
        vertex1[2] - vertex2[2] + newPosz
      );

      // Update colors
      if (color) {
        // @ts-expect-error: Typescript doesn't know about the custom shader
        this.edge.meshes[i].material.userData.color1.value.setHSL(color[edge[0]] % 1, 1, 0.5);
        // @ts-expect-error: Typescript doesn't know about the custom shader
        this.edge.meshes[i].material.userData.color2.value.setHSL(color[edge[1]] % 1, 1, 0.5);
      }
    }

    // Update vertices
    for (let i = 0; i < points.length; i++) {
      // Update position
      this.vertex.meshes[i].position.set(...(points[i] as [number, number, number]));

      // Update colors
      if (color) {
        // @ts-expect-error: Typescript doesn't know about our custom shader
        this.vertex.meshes[i].material.userData.color.value.setHSL(color[i] % 1, 1, 0.5);
      }
    }

    // Update faces
    for (let i = 0; i < this.face.triangles.length; i++) {
      const v1 = points[this.face.triangles[i][0]];
      const v2 = points[this.face.triangles[i][1]];
      const v3 = points[this.face.triangles[i][2]];

      const normal = VMath.cross(VMath.sub(v2, v1), VMath.sub(v3, v1));

      // This is the fastest way to update the elements
      for (let j = 0; j < 3; j++) {
        //@ts-expect-error: Probably fine
        this.face.positionAttribute.array[i * 9 + j] = v1[j];
        //@ts-expect-error: Probably fine
        this.face.positionAttribute.array[i * 9 + j + 3] = v2[j];
        //@ts-expect-error: Probably fine
        this.face.positionAttribute.array[i * 9 + j + 6] = v3[j];
        for (let k = 0; k < 3; k++) {
          //@ts-expect-error: Probably fine
          this.face.normalAttribute.array[i * 9 + j * 3 + k] = normal[k];
        }
      }
    }
    this.face.positionAttribute.needsUpdate = true;
    this.face.normalAttribute.needsUpdate = true;
  }

  /** Deletes all meshes, use to dispose of object */
  dispose(): void {
    if (!this.vertex || !this.edge || !this.face) return;
    this.vertex.meshes.forEach((m) => this.scene.remove(m));
    this.edge.meshes.forEach((m) => this.scene.remove(m));
    this.scene.remove(this.face.mesh);

    this.vertex.meshes.forEach((m) => m.geometry.dispose());
    this.edge.meshes.forEach((m) => m.geometry.dispose());
    this.face.mesh.geometry.dispose();

    this.vertex = undefined;
    this.edge = undefined;
    this.face = undefined;
  }
}

export default WireframeRenderer;
export { WireframeRenderer };
