/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { getEdgesFromFaces } from './etc';
import * as vm from '$utils/vmath';
import { approx } from '$utils/number';

class WireframeRenderer {
  visble = true;
  facesVisible = true;
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
        mesh: THREE.Mesh;
        positionAttribute: THREE.Float32BufferAttribute;
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

    const defaultMatrix = new THREE.Matrix4();

    /// Create edges
    const edgeData = getEdgesFromFaces(faces);
    const edgeGeometry = new THREE.CylinderBufferGeometry(thickness, thickness, 1, 20);
    edgeGeometry.rotateX(-Math.PI / 2);
    const edgeMaterial = new THREE.MeshPhongMaterial({ shininess: 100 });
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
      new Float32Array(edgeData.length * 3),
      3
    );
    const edgeColor2Attribute = new THREE.InstancedBufferAttribute(
      new Float32Array(edgeData.length * 3),
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
    for (let i = 0; i < edgeData.length; i++) {
      edgeMesh.setMatrixAt(i, defaultMatrix);
    }

    /// Create vertices
    const vertexGeometry = new THREE.SphereBufferGeometry(thickness, 20, 20);
    const vertexMaterial = new THREE.MeshPhongMaterial({ shininess: 100 });
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
      new Float32Array(vertexCount * 3),
      3
    );
    vertexGeometry.setAttribute('color', vertexColorAttribute);
    const vertexMesh = new THREE.InstancedMesh(vertexGeometry, vertexMaterial, vertexCount);
    this.scene.add(vertexMesh);
    this.vertex = { mesh: vertexMesh, colorAttribute: vertexColorAttribute };
    for (let i = 0; i < vertexCount; i++) {
      vertexMesh.setMatrixAt(i, defaultMatrix);
    }

    /// Create faces
    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.Float32BufferAttribute(
      new Float32Array(vertexCount * 3),
      3
    );
    geometry.setAttribute('position', positionAttribute);

    const faceIndices = [];
    for (const face of faces) {
      for (let i = 0; i < face.length - 2; i++) {
        faceIndices.push(face[0], face[i + 1], face[i + 2]);
      }
    }

    geometry.setIndex(faceIndices);
    // When using flatShading, we do not need to specify normals

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      opacity: 0.15,
      transmission: 0.4,
      transparent: true,
      clearcoat: 1.0,
      reflectivity: 1.0,
      roughness: 0.0,
      flatShading: true,
      premultipliedAlpha: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    this.face = {
      data: faces,
      mesh,
      positionAttribute,
    };

    // Set visibility of everything
    this.setVisible(this.visble);
    this.setFacesVisible(this.facesVisible);
  }

  /** Sets the positions of the vertices */
  setVertexPositions(points: number[][]): void {
    if (!this.vertex || !this.edge || !this.face) throw new Error('Object not initialized');

    // Update edges
    const earr = this.edge.mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.edge.data.length; i++) {
      const edge = this.edge.data[i];
      const v0 = points[edge[0]];
      const v1 = points[edge[1]];

      const f = vm.sub(v0, v1);
      const mag = vm.mag(f);
      vm.smulti(f, 1 / mag);

      let u: number[], r: number[];
      if (approx(f[2], 1)) {
        u = [1, 0, 0];
        r = [0, -1, 0];
      } else if (approx(f[2], -1)) {
        u = [1, 0, 0];
        r = [0, 1, 0];
      } else {
        const d = Math.sqrt(1 - f[2] * f[2]);
        u = [-f[1] / d, f[0] / d, 0]; // Precomputation of normalize(cross(f, [0, 0, 1]))
        r = vm.cross(u, f);
      }

      const i16 = i * 16;
      earr[i16] = r[0];
      earr[i16 + 1] = r[1];
      earr[i16 + 2] = r[2];
      // earr[i16 + 3] = 0;
      earr[i16 + 4] = u[0];
      earr[i16 + 5] = u[1];
      earr[i16 + 6] = u[2];
      // earr[i16 + 7] = 0;
      earr[i16 + 8] = f[0] * mag;
      earr[i16 + 9] = f[1] * mag;
      earr[i16 + 10] = f[2] * mag;
      // earr[i16 + 11] = 0;
      earr[i16 + 12] = (v1[0] + v0[0]) / 2;
      earr[i16 + 13] = (v1[1] + v0[1]) / 2;
      earr[i16 + 14] = (v1[2] + v0[2]) / 2;
      // earr[i16 + 15] = 1;
    }
    this.edge.mesh.instanceMatrix.needsUpdate = true;

    // Update vertices and faces
    const varr = this.vertex.mesh.instanceMatrix.array as Float32Array;
    const farr = this.face.positionAttribute.array as Float32Array;
    for (let i = 0; i < points.length; i++) {
      const s = i * 16 + 12;
      varr[s] = points[i][0];
      varr[s + 1] = points[i][1];
      varr[s + 2] = points[i][2];

      const i3 = i * 3;
      farr[i3] = points[i][0];
      farr[i3 + 1] = points[i][1];
      farr[i3 + 2] = points[i][2];
    }
    this.vertex.mesh.instanceMatrix.needsUpdate = true;
    this.face.positionAttribute.needsUpdate = true;
  }

  /** Update the colors of the vertices (edge colors are interpolated from these)
   *  @param {number[][]} color - Array of rgb color values, one for each vertex
   */
  setVertexColors(color: number[][]): void {
    if (!this.vertex || !this.edge) throw new Error('Object not initialized');

    // Update edges
    const color1arr = this.edge.color1Attribute.array as Float32Array;
    const color2arr = this.edge.color2Attribute.array as Float32Array;
    for (let i = 0; i < this.edge.data.length; i++) {
      const edge = this.edge.data[i];
      const c1 = color[edge[0]];
      const c2 = color[edge[1]];
      color1arr[i * 3] = c1[0];
      color1arr[i * 3 + 1] = c1[1];
      color1arr[i * 3 + 2] = c1[2];
      color2arr[i * 3] = c2[0];
      color2arr[i * 3 + 1] = c2[1];
      color2arr[i * 3 + 2] = c2[2];
    }
    this.edge.color1Attribute.needsUpdate = true;
    this.edge.color2Attribute.needsUpdate = true;

    // Update vertices
    const colorarr = this.vertex.colorAttribute.array as Float32Array;
    for (let i = 0; i < color.length; i++) {
      colorarr[i * 3] = color[i][0];
      colorarr[i * 3 + 1] = color[i][1];
      colorarr[i * 3 + 2] = color[i][2];
    }
    this.vertex.colorAttribute.needsUpdate = true;
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
