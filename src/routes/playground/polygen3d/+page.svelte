<script lang="ts">
  import polygen from '$utils/geometry/polygen';
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import WireframeObject3D from '../../../scripts/wireframeobject3d';
  import AnimatedScene from '../../../ui/components/AnimatedScene.svelte';
  import { useAnimationDebugger } from '../../../ui/utilities/use-animation-debugger';

  let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
  let cube: WireframeObject3D;

  let loading = true;
  let diagram = 'x4o3o';

  function init(canvas: HTMLCanvasElement, width: number, height: number) {
    ////////// Inital Setup //////////
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.sortObjects = false;

    scene.background = new THREE.Color(0xffffff);
    renderer.setSize(width, height);

    new OrbitControls(camera, renderer.domElement);

    ////////// Scene Setup //////////
    // Camera
    camera.position.set(0, 1.3, -3.25);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xd1d1d1, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.PointLight(0xffffff, 0.5);
    directionalLight.position.y = 10;
    scene.add(directionalLight);

    cube = new WireframeObject3D(scene);
    loadDiagram(diagram);
  }

  const debug = useAnimationDebugger();
  function frame() {
    debug.begin();
    renderer.render(scene, camera);
    debug.endSection('render');
  }

  function resize(_: unknown, width: number, height: number) {
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    cube.dispose();
    renderer.dispose();
  }

  let error = '';
  async function loadDiagram(diagram: string) {
    loading = true;
    try {
      const data = polygen(diagram);
      if (data.faces.length === 0) {
        throw new Error('WireframeRenderer cannot render 2D shapes (yet)');
      }
      console.log(data);
      cube.loadData(data);
      cube.update();
      loading = false;
      error = '';
    } catch (e) {
      //@ts-ignore
      error = e.message ?? 'Unknown error';
      console.error(e);
    }
  }
</script>

<div class="flex h-full w-full p-4 md:space-x-5 md:p-5">
  <div class="h-full w-[70%] overflow-clip rounded-xl bg-white">
    <AnimatedScene callbacks={{ init, frame, resize, destroy }} {loading} />
  </div>
  <div class="h-full w-[30%]">
    <a href="/">Home</a>
    <br />
    <input type="text" class="rounded border px-2 py-1" placeholder="x4o3o" bind:value={diagram} />
    <button
      class="rounded bg-blue-500 py-1 px-2 font-medium text-white"
      on:click={() => loadDiagram(diagram)}>Load</button
    >
    {#if error}
      <p class="whitespace-pre text-red-500">Error: {error}</p>
    {/if}
  </div>
</div>

<svelte:head>
  <title>4D Playground · Polygen 3D</title>
</svelte:head>
