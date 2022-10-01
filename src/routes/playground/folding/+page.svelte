<script lang="ts">
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import FoldingObject from '../../../scripts/foldingobject';
  import AnimatedScene from '../../../ui/components/AnimatedScene.svelte';
  import { useAnimationDebugger } from '../../../ui/utilities/use-animation-debugger';
  import { d4 } from '../../../data';
  import polygen from '$utils/geometry/polygen';

  type Names = keyof typeof d4;
  let selected: Names = 'cell8';

  let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
  let cube: FoldingObject;
  let loading = true;

  let currentFrame = 0;
  let prevFrame = -1;

  function init(canvas: HTMLCanvasElement, width: number, height: number) {
    ////////// Inital Setup //////////
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.sortObjects = false;

    scene.background = new THREE.Color(0xffffff);

    new OrbitControls(camera, renderer.domElement);

    ////////// Scene Setup //////////
    // Camera
    camera.position.set(0, 2, -5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xc4c4c4, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.PointLight(0xffffff, 0.5);
    directionalLight.position.y = 10;
    scene.add(directionalLight);

    cube = new FoldingObject(scene);
    switchShape(selected);
  }

  const debug = useAnimationDebugger();
  function frame() {
    debug.begin();
    if (currentFrame != prevFrame) {
      cube.update(currentFrame);
      prevFrame = currentFrame;
    }
    debug.endSection('update');
    renderer.render(scene, camera);
    debug.endSection('render');
  }

  function resize(_: unknown, width: number, height: number) {
    const sceneWidth = width;
    const sceneHeight = height;
    renderer.setSize(sceneWidth, sceneHeight);
    camera.aspect = sceneWidth / sceneHeight;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    cube.dispose();
    renderer.dispose();
  }

  let faces = true;
  function toggleFaces() {
    faces = !faces;
    cube.setFacesVisible(faces);
  }

  async function switchShape(shape: string) {
    loading = true;
    selected = shape as Names;
    const data = polygen(d4[selected], true);
    cube.loadData(data);
    prevFrame = -1;
    loading = false;
  }
</script>

<div class="flex h-full w-full p-4 md:space-x-5 md:p-5">
  <div class="h-full w-[70%] overflow-clip rounded-xl bg-white">
    <AnimatedScene callbacks={{ init, frame, resize, destroy }} {loading} />
  </div>
  <div class="h-full w-[30%]">
    <a href="/">Home</a>
    <div>
      <input class="w-full" type="range" min="0" max="100" bind:value={currentFrame} />
    </div>
    <div class="space-y-2">
      <button on:click={toggleFaces}>Toggle faces</button>
    </div>
    <select bind:value={selected} on:change={(e) => switchShape(e.currentTarget.value)}>
      {#each Object.keys(d4) as name}
        <option value={name}>{name}</option>
      {/each}
    </select>
  </div>
</div>

<svelte:head>
  <title>4D Playground · Folding</title>
</svelte:head>
