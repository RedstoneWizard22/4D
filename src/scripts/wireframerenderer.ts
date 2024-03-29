/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { getEdgesFromFaces } from './etc';
import { approx } from '$utils/number';

class WireframeRenderer {
  visble = true;
  facesVisible = true;
  vertex:
    | {
        mesh: THREE.InstancedMesh;
        depthAttribute: THREE.InstancedBufferAttribute;
      }
    | undefined;
  edge:
    | {
        data: number[][];
        mesh: THREE.InstancedMesh;
        depth1Attribute: THREE.InstancedBufferAttribute;
        depth2Attribute: THREE.InstancedBufferAttribute;
      }
    | undefined;
  face:
    | {
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

    // TODO: Make these modifiable
    const extraUniforms = {
      nearColor: { value: new THREE.Color().setHSL(60 / 360, 1, 0.5) },
      farColor: { value: new THREE.Color().setHSL(0 / 360, 1, 0.5) },
      depthScaling: { value: 0.2 },
    };

    /// Create edges
    const edgeData = getEdgesFromFaces(faces);
    const edgeGeometry = new THREE.CylinderGeometry(thickness, thickness, 1, 16, 1, true);
    edgeGeometry.rotateX(-Math.PI / 2);
    edgeGeometry.translate(0, 0, -0.5);
    const edgeMaterial = new THREE.MeshPhongMaterial({
      shininess: 100,
      transparent: false,
    });
    edgeMaterial.defines = { USE_UV: '' };
    edgeMaterial.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...extraUniforms };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#define PHONG',
          `#define PHONG
          uniform float depthScaling;
          varying float vDepth1;
          varying float vDepth2;`
        )
        .replace(
          '#include <common>',
          `#include <common>
          attribute float depth1;
          attribute float depth2;`
        )
        .replace(
          '#include <project_vertex>',
          `float scaleFactor = mix( 1.0 + depthScaling, 1.0 - depthScaling, depth1 + (depth2 - depth1) * vUv.y );
          transformed.x *= scaleFactor;
          transformed.y *= scaleFactor;
          #include <project_vertex>
          vDepth1 = depth1;
          vDepth2 = depth2;`
        );

      shader.fragmentShader = ` 
        uniform vec3 nearColor;
        uniform vec3 farColor;
        varying float vDepth1;
        varying float vDepth2;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( mix( nearColor, farColor, vDepth1 + (vDepth2 - vDepth1) * vUv.y ), opacity );'
        )}
        `;
    };
    const edgeDepth1Attribute = new THREE.InstancedBufferAttribute(
      new Float32Array(edgeData.length).fill(0),
      1
    );
    const edgeDepth2Attribute = new THREE.InstancedBufferAttribute(
      new Float32Array(edgeData.length).fill(0),
      1
    );
    edgeGeometry.setAttribute('depth1', edgeDepth1Attribute);
    edgeGeometry.setAttribute('depth2', edgeDepth2Attribute);
    const edgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, edgeData.length);
    this.scene.add(edgeMesh);
    this.edge = {
      data: edgeData,
      mesh: edgeMesh,
      depth1Attribute: edgeDepth1Attribute,
      depth2Attribute: edgeDepth2Attribute,
    };
    for (let i = 0; i < edgeData.length; i++) {
      edgeMesh.setMatrixAt(i, defaultMatrix);
    }

    /// Create vertices
    const vertexGeometry = new THREE.SphereGeometry(thickness, 16, 16);
    const vertexMaterial = new THREE.MeshPhongMaterial({ shininess: 100 });
    vertexMaterial.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ...extraUniforms };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#define PHONG',
          `#define PHONG
          uniform float depthScaling;
          varying float vDepth;`
        )
        .replace(
          '#include <common>',
          `#include <common>
          attribute float depth;`
        )
        .replace(
          '#include <project_vertex>',
          `transformed *= mix( 1.0 + depthScaling, 1.0 - depthScaling, depth );
          #include <project_vertex>
          vDepth = depth;`
        );

      shader.fragmentShader = `
        uniform vec3 nearColor;
        uniform vec3 farColor;
        varying float vDepth;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( mix(nearColor, farColor, vDepth), opacity );'
        )}
        `;
    };
    const vertexDepthAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(vertexCount),
      1
    );
    vertexGeometry.setAttribute('depth', vertexDepthAttribute);
    const vertexMesh = new THREE.InstancedMesh(vertexGeometry, vertexMaterial, vertexCount);
    this.scene.add(vertexMesh);
    this.vertex = { mesh: vertexMesh, depthAttribute: vertexDepthAttribute };
    for (let i = 0; i < vertexCount; i++) {
      vertexMesh.setMatrixAt(i, defaultMatrix);
    }

    /// Create faces
    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.Float32BufferAttribute(
      new Float32Array(vertexCount * 3),
      3
    );
    // positionAttribute.setUsage(THREE.DynamicDrawUsage);
    // vertexDepthAttribute.setUsage(THREE.DynamicDrawUsage);
    // edgeDepth1Attribute.setUsage(THREE.DynamicDrawUsage);
    // edgeDepth2Attribute.setUsage(THREE.DynamicDrawUsage);
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

      let fx = v0[0] - v1[0];
      let fy = v0[1] - v1[1];
      let fz = v0[2] - v1[2];
      const magf = Math.sqrt(fx * fx + fy * fy + fz * fz);

      fx /= magf;
      fy /= magf;
      fz /= magf;

      let ux = 1,
        uy = 0; // uz is always 0
      let rx = 0,
        ry = 1,
        rz = 0;
      if (approx(fz, 1)) {
        ry = -1;
      } else if (!approx(fz, -1)) {
        const d = Math.sqrt(1 - fz * fz);
        ux = -fy / d;
        uy = fx / d;
        rx = uy * fz;
        ry = -ux * fz;
        rz = ux * fy - uy * fx;
      }

      const i16 = i * 16;
      earr[i16] = rx;
      earr[i16 + 1] = ry;
      earr[i16 + 2] = rz;

      earr[i16 + 4] = ux;
      earr[i16 + 5] = uy;
      // earr[6] = uz; uz is always 0

      earr[i16 + 8] = fx * magf;
      earr[i16 + 9] = fy * magf;
      earr[i16 + 10] = fz * magf;

      earr[i16 + 12] = v0[0];
      earr[i16 + 13] = v0[1];
      earr[i16 + 14] = v0[2];
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

  /** Update the depths of the vertices (edge colors are interpolated from these)
   *  @param {number[]} depths - Array of depth values, one for each vertex
   */
  setVertexDepths(depths: number[]): void {
    if (!this.vertex || !this.edge) throw new Error('Object not initialized');

    // Update edges
    const depth1 = this.edge.depth1Attribute.array as Float32Array;
    const depth2 = this.edge.depth2Attribute.array as Float32Array;
    for (let i = 0; i < this.edge.data.length; i++) {
      const edge = this.edge.data[i];
      depth1[i] = depths[edge[0]];
      depth2[i] = depths[edge[1]];
    }
    this.edge.depth1Attribute.needsUpdate = true;
    this.edge.depth2Attribute.needsUpdate = true;

    // Update vertices
    const depth = this.vertex.depthAttribute.array as Float32Array;
    for (let i = 0; i < depths.length; i++) {
      depth[i] = depths[i];
    }
    this.vertex.depthAttribute.needsUpdate = true;
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
