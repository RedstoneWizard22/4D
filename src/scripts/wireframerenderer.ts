/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { getEdgesFromFaces } from './etc';
import VMath from './tools';

class WireframeRenderer {
  visible: boolean;
  facesVisible: boolean;
  meshes: {
    vertices: THREE.Mesh[];
    edges: THREE.Mesh[];
    faces: THREE.Mesh[];
  };
  scene: THREE.Scene;
  edges: number[][] | undefined;
  faces: number[][] | undefined;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.visible = true;
    this.facesVisible = true;

    this.meshes = {
      vertices: [],
      edges: [],
      faces: [],
    };
  }

  /** Toggles visibility of all face meshes */
  setFacesVisible(visible: boolean): void {
    this.facesVisible = visible;
    this.meshes.faces.forEach((m) => (m.visible = visible));
  }

  /** Toggles visibility of all meshes but only toggles face meshes if facesVisible is true */
  setVisible(visible: boolean): void {
    this.meshes.vertices.forEach((m) => (m.visible = visible));
    this.meshes.edges.forEach((m) => (m.visible = visible));
    if (this.facesVisible) {
      this.meshes.faces.forEach((m) => (m.visible = visible));
    }
  }

  /** Creates meshes that make up the wireframe and adds them to scene */
  init(vertexCount: number, faces: number[][], thickness: number): void {
    // Dispose of all old meshes and remove them from the scene
    this.dispose();

    const edges = getEdgesFromFaces(faces);
    this.edges = edges;
    this.faces = faces;

    // Define geometry for edges and vertices
    const edgeGeometry = new THREE.CylinderBufferGeometry(thickness, thickness, 1, 20);
    edgeGeometry.rotateX(-Math.PI / 2);
    const vertexGeometry = new THREE.SphereBufferGeometry(thickness, 20, 20);

    // Create a mesh for each edge
    for (let i = 0; i < edges.length; i++) {
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
      this.meshes.edges.push(mesh);
    }

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
      this.meshes.vertices.push(mesh);
    }

    // Create a mesh for each face
    for (const face of faces) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      for (let i = 0; i < face.length - 1; i++) {
        shape.lineTo(1, i);
      }

      // Create gemotry and mesh
      const geometry = new THREE.ShapeBufferGeometry(shape);
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
      this.meshes.faces.push(mesh);
    }

    // Add meshes to scene
    this.meshes.vertices.forEach((m) => this.scene.add(m));
    this.meshes.edges.forEach((m) => this.scene.add(m));
    this.meshes.faces.forEach((m) => this.scene.add(m));

    // Set visibility of meshes to true
    this.setVisible(true);

    // Set visibility of faces
    this.setFacesVisible(this.facesVisible);
  }

  /** Updates position and rotation of all meshes to the correct values */
  update(points: number[][], color?: number[]): void {
    // const points3D = perspectiveProject4D(vertices, -1.5);
    // const MAX_W = 1;

    if (!this.edges || !this.faces) {
      console.error('WireframeRenderer not initialized');
      return;
    }

    // Update edges
    const edgeCount = this.edges.length;
    for (let i = 0; i < edgeCount; i++) {
      const edge = this.edges[i];

      const vertex1 = points[edge[0]];
      const vertex2 = points[edge[1]];

      // Update position
      this.meshes.edges[i].scale.z = VMath.distance(vertex1, vertex2);

      const newPosx = (vertex1[0] + vertex2[0]) / 2;
      const newPosy = (vertex1[1] + vertex2[1]) / 2;
      const newPosz = (vertex1[2] + vertex2[2]) / 2;

      this.meshes.edges[i].position.set(newPosx, newPosy, newPosz);

      this.meshes.edges[i].lookAt(
        vertex1[0] - vertex2[0] + newPosx,
        vertex1[1] - vertex2[1] + newPosy,
        vertex1[2] - vertex2[2] + newPosz
      );

      // Update colors
      if (color) {
        // @ts-expect-error: Typescript doesn't know about the custom shader
        this.meshes.edges[i].material.userData.color1.value.setHSL(color[edge[0]] % 1, 1, 0.5);
        // @ts-expect-error: Typescript doesn't know about the custom shader
        this.meshes.edges[i].material.userData.color2.value.setHSL(color[edge[1]] % 1, 1, 0.5);
      }
    }

    // Update vertices
    const vertexCount = points.length;
    for (let i = 0; i < vertexCount; i++) {
      // Update position
      this.meshes.vertices[i].position.set(...(points[i] as [number, number, number]));

      // Update colors
      if (color) {
        // @ts-expect-error: Typescript doesn't know about our custom shader
        this.meshes.vertices[i].material.userData.color.value.setHSL(color[i] % 1, 1, 0.5);
      }
    }

    // Update faces
    const faceCount = this.faces.length;
    for (let i = 0; i < faceCount; i++) {
      const face = this.faces[i];

      // Find face center
      const center = VMath.mean(...face.map((i) => points[i])) as [number, number, number];

      // Get face mesh
      const mesh = this.meshes.faces[i];

      // Update face position
      mesh.position.set(...center);

      // Update face vertices
      let k = 0;
      for (let j = 0; j < face.length; j++) {
        // @ts-expect-error: Tis ok as long as you set needsUpdate to true
        mesh.geometry.attributes.position.array[k] = points[face[j]][0] - center[0];
        // @ts-expect-error: Tis ok as long as you set needsUpdate to true
        mesh.geometry.attributes.position.array[k + 1] = points[face[j]][1] - center[1];
        // @ts-expect-error: Tis ok as long as you set needsUpdate to true
        mesh.geometry.attributes.position.array[k + 2] = points[face[j]][2] - center[2];

        k += 3;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  /** Deletes all meshes, use to dispose of object */
  dispose(): void {
    this.meshes.vertices.forEach((m) => this.scene.remove(m));
    this.meshes.edges.forEach((m) => this.scene.remove(m));
    this.meshes.faces.forEach((m) => this.scene.remove(m));

    this.meshes.vertices.forEach((m) => m.geometry.dispose());
    this.meshes.edges.forEach((m) => m.geometry.dispose());
    this.meshes.faces.forEach((m) => m.geometry.dispose());

    this.meshes = {
      vertices: [],
      edges: [],
      faces: [],
    };
  }
}

export default WireframeRenderer;
export { WireframeRenderer };
