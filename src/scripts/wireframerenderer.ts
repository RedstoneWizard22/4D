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
  dummyObject = new THREE.Object3D(); // Used for calculations
  dummyColor = new THREE.Color(); // Used for calculations
  vertex:
    | {
        mesh: THREE.InstancedMesh;
        colorAttribute: THREE.InstancedBufferAttribute;
      }
    | undefined;
  edge:
    | {
        data: number[][];
        mesh: THREE.InstancedMesh;
        color1Attribute: THREE.InstancedBufferAttribute;
        color2Attribute: THREE.InstancedBufferAttribute;
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
    this.vertex.mesh.visible = visible;
    this.edge.mesh.visible = visible;
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
    const edgeData = getEdgesFromFaces(faces);
    const edgeGeometry = new THREE.CylinderBufferGeometry(thickness, thickness, 1, 20);
    edgeGeometry.rotateX(-Math.PI / 2);
    const edgeMaterial = new THREE.MeshPhongMaterial({
      color: 0x2194ce,
      shininess: 100,
    });
    edgeMaterial.defines = { USE_UV: '' };
    edgeMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#define PHONG',
          `#define PHONG
          varying vec3 vColor1;
          varying vec3 vColor2;`
        )
        .replace(
          '#include <common>',
          `#include <common>
          attribute vec3 color1;
          attribute vec3 color2;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vColor1 = color1;
          vColor2 = color2;`
        );

      shader.fragmentShader = `
        varying vec3 vColor1;
        varying vec3 vColor2;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( mix( vColor1, vColor2, vec3(vUv.y) ), opacity );'
        )}
        `;
    };
    const edgeColor1Attribute = new THREE.InstancedBufferAttribute(
      new Float32Array(VMath.random(edgeData.length * 3, 0, 1)),
      3
    );
    const edgeColor2Attribute = new THREE.InstancedBufferAttribute(
      new Float32Array(VMath.random(edgeData.length * 3, 0, 1)),
      3
    );
    edgeGeometry.setAttribute('color1', edgeColor1Attribute);
    edgeGeometry.setAttribute('color2', edgeColor2Attribute);
    const edgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, edgeData.length);
    this.scene.add(edgeMesh);
    this.edge = {
      data: edgeData,
      mesh: edgeMesh,
      color1Attribute: edgeColor1Attribute,
      color2Attribute: edgeColor2Attribute,
    };

    /// Create vertices
    const vertexGeometry = new THREE.SphereBufferGeometry(thickness, 20, 20);
    const vertexMaterial = new THREE.MeshPhongMaterial({
      color: 0x2194ce,
      shininess: 100,
    });
    vertexMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#define PHONG',
          `#define PHONG
          varying vec3 vColor;`
        )
        .replace(
          '#include <common>',
          `#include <common>
          attribute vec3 color;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vColor = color;`
        );

      shader.fragmentShader = `
        varying vec3 vColor;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( vColor, opacity );'
        )}
        `;
    };
    const vertexColorAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(VMath.random(vertexCount * 3, 0, 1)),
      3
    );
    vertexGeometry.setAttribute('color', vertexColorAttribute);
    const vertexMesh = new THREE.InstancedMesh(vertexGeometry, vertexMaterial, vertexCount);
    this.scene.add(vertexMesh);
    this.vertex = { mesh: vertexMesh, colorAttribute: vertexColorAttribute };

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
      // transmission: 0.5,
      // specularIntensity: 1,
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

      const vec = VMath.sub(points[edge[1]], points[edge[0]]);
      const mean = VMath.mean(points[edge[1]], points[edge[0]]);

      this.dummyObject.scale.z = VMath.norm(vec);
      this.dummyObject.position.set(mean[0], mean[1], mean[2]);
      this.dummyObject.lookAt(vec[0] + mean[0], vec[1] + mean[1], vec[2] + mean[2]);
      this.dummyObject.updateMatrix();
      this.edge.mesh.setMatrixAt(i, this.dummyObject.matrix);

      if (color) {
        const c1 = this.dummyColor.setHSL(color[edge[0]] % 1, 1, 0.5).toArray();
        const c2 = this.dummyColor.setHSL(color[edge[1]] % 1, 1, 0.5).toArray();
        this.edge.color1Attribute.set(c1, i * 3);
        this.edge.color2Attribute.set(c2, i * 3);
      }
    }
    this.edge.mesh.instanceMatrix.needsUpdate = true;
    this.edge.color1Attribute.needsUpdate = true;
    this.edge.color2Attribute.needsUpdate = true;

    // Update vertices
    this.dummyObject.scale.z = 1;
    for (let i = 0; i < points.length; i++) {
      this.dummyObject.position.set(points[i][0], points[i][1], points[i][2]);
      this.dummyObject.updateMatrix();
      this.vertex.mesh.setMatrixAt(i, this.dummyObject.matrix);

      if (color) {
        const c = this.dummyColor.setHSL(color[i] % 1, 1, 0.5).toArray();
        this.vertex.colorAttribute.set(c, i * 3);
      }
    }
    this.vertex.colorAttribute.needsUpdate = true;
    this.vertex.mesh.instanceMatrix.needsUpdate = true;

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
    this.scene.remove(this.vertex.mesh);
    this.scene.remove(this.edge.mesh);
    this.scene.remove(this.face.mesh);

    this.vertex.mesh.geometry.dispose();
    this.edge.mesh.dispose();
    this.face.mesh.geometry.dispose();

    this.vertex = undefined;
    this.edge = undefined;
    this.face = undefined;
  }
}

export default WireframeRenderer;
export { WireframeRenderer };
