/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as THREE from 'three';
import { perspeciveProject } from './4dtools';
import HyperObject, { type HyperObjectData } from './hyperobject';

class WireframeObject extends HyperObject {
  points3D!: number[][];
  visible: boolean;
  facesVisible: boolean;
  castShadows: boolean;
  meshes: {
    vertices: THREE.Mesh[];
    edges: THREE.Mesh[];
    faces: THREE.Mesh[];
  };
  scene: THREE.Scene;

  constructor(scene: THREE.Scene, data?: HyperObjectData) {
    super();

    this.scene = scene;
    this.visible = true;
    this.facesVisible = true;
    this.castShadows = true;

    this.meshes = {
      vertices: [],
      edges: [],
      faces: [],
    };

    if (data) {
      this.loadData(data);
    }
  }

  /** Loades err... Data */
  loadData(data: HyperObjectData): void {
    super.loadData(data);
    this.points3D = Array.from({ length: this.points4D.length }, () => [0, 0, 0]);
    this.projectTo3D();
    this.createMeshes();
  }

  /** Projects points4D to 3D */
  projectTo3D(): void {
    this.points3D = perspeciveProject(this.points4D, 3, this.data.optimalCamW);
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

  /** Toggles shadow casting for edge and vertex meshes */
  setCastShadows(cast: boolean): void {
    this.castShadows = cast;
    this.meshes.vertices.forEach((m) => (m.castShadow = cast));
    this.meshes.edges.forEach((m) => (m.castShadow = cast));
  }

  /** Creates meshes that make up the wireframe and adds them to scene */
  createMeshes(): void {
    // Dispose of all old meshes and remove them from the scene
    this.meshes.vertices.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
    });
    this.meshes.edges.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
    });
    this.meshes.faces.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
    });
    this.meshes = {
      vertices: [],
      edges: [],
      faces: [],
    };

    // Define geometry for edges and vertices
    const edgeGeometry = new THREE.CylinderBufferGeometry(
      this.data.optimalThickness,
      this.data.optimalThickness,
      1,
      20
    );
    edgeGeometry.rotateX(-Math.PI / 2);
    const vertexGeometry = new THREE.SphereBufferGeometry(this.data.optimalThickness, 20, 20);

    // Create a mesh for each edge
    for (let i = 0; i < this.data.edges.length; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x2194ce,
        shininess: 100,
      });

      const color1 = { value: new THREE.Color(1, 0, 0) };
      const color2 = { value: new THREE.Color(1, 1, 0) };

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
    for (let i = 0; i < this.data.vertices[0].length; i++) {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x2194ce,
        shininess: 100,
      });

      const color = { value: new THREE.Color(1, 0, 0) };

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.myColor = color;
        shader.fragmentShader = `
        uniform vec3 myColor;
        ${shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( myColor, opacity );'
        )}
        `;
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mat.userData.color = color;

      const mesh = new THREE.Mesh(vertexGeometry, mat);
      this.meshes.vertices.push(mesh);
    }

    // Create a mesh for each face
    for (const face of this.data.faces) {
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
        opacity: 0.2,
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

    // Set shadow casting for meshes
    this.setCastShadows(this.castShadows);
  }

  /** Updates position and rotation of all meshes to the correct values */
  updateMeshes(): void {
    const maxW = this.data.maxW;

    // Update edge
    const edgeCount = this.data.edges.length;

    for (let i = 0; i < edgeCount; i++) {
      const edge = this.data.edges[i];

      const vertex1 = [
        this.points3D[0][edge[0]],
        this.points3D[1][edge[0]],
        this.points3D[2][edge[0]],
      ];
      const vertex2 = [
        this.points3D[0][edge[1]],
        this.points3D[1][edge[1]],
        this.points3D[2][edge[1]],
      ];

      const length = Math.sqrt(
        Math.pow(vertex1[0] - vertex2[0], 2) +
          Math.pow(vertex1[1] - vertex2[1], 2) +
          Math.pow(vertex1[2] - vertex2[2], 2)
      );

      // Update position
      this.meshes.edges[i].scale.z = length;

      const newPosx = (vertex1[0] + vertex2[0]) / 2;
      const newPosy = (vertex1[1] + vertex2[1]) / 2;
      const newPosz = (vertex1[2] + vertex2[2]) / 2;

      this.meshes.edges[i].position.set(newPosx, newPosy, newPosz);

      this.meshes.edges[i].lookAt(
        new THREE.Vector3(
          vertex1[0] - vertex2[0] + newPosx,
          vertex1[1] - vertex2[1] + newPosy,
          vertex1[2] - vertex2[2] + newPosz
        )
      );

      // Update colors
      // @ts-expect-error: Typescript doesn't know about our custom shader
      this.meshes.edges[i].material.userData.color1.value.g = Math.abs(
        ((this.points4D[3][edge[0]] + maxW) / maxW) * 0.5
      );

      // @ts-expect-error: Typescript doesn't know about our custom shader
      this.meshes.edges[i].material.userData.color2.value.g = Math.abs(
        ((this.points4D[3][edge[1]] + maxW) / maxW) * 0.5
      );
    }

    // Update vertices
    const vertexCount = this.data.vertices[0].length;
    for (let i = 0; i < vertexCount; i++) {
      // Update position
      this.meshes.vertices[i].position.set(
        this.points3D[0][i],
        this.points3D[1][i],
        this.points3D[2][i]
      );

      // Update colors
      // @ts-expect-error: Typescript doesn't know about our custom shader
      this.meshes.vertices[i].material.userData.color.value.g = Math.abs(
        ((this.points4D[3][i] + maxW) / maxW) * 0.5 * 0.8
      );
    }

    // Update faces
    const faceCount = this.data.faces.length;
    for (let i = 0; i < faceCount; i++) {
      const face = this.data.faces[i];

      // Find face center
      let xBar = 0,
        yBar = 0,
        zBar = 0;
      for (let j = 0; j < face.length; j++) {
        xBar += this.points3D[0][face[j]];
        yBar += this.points3D[1][face[j]];
        zBar += this.points3D[2][face[j]];
      }
      xBar /= face.length;
      yBar /= face.length;
      zBar /= face.length;

      // Get face mesh
      const mesh = this.meshes.faces[i];

      // Update face position
      mesh.position.set(xBar, yBar, zBar);

      // Update face vertices
      let k = 0;
      for (let j = 0; j < face.length; j++) {
        // @ts-expect-error: Tis ok as long as you set needsUpdate to true
        mesh.geometry.attributes.position.array[k] = this.points3D[0][face[j]] - xBar;
        // @ts-expect-error: Tis ok as long as you set needsUpdate to true
        mesh.geometry.attributes.position.array[k + 1] = this.points3D[1][face[j]] - yBar;
        // @ts-expect-error: Tis ok as long as you set needsUpdate to true
        mesh.geometry.attributes.position.array[k + 2] = this.points3D[2][face[j]] - zBar;

        k += 3;

        mesh.geometry.attributes.position.needsUpdate = true;
      }
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
  }
}

export default WireframeObject;
