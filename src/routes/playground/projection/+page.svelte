<script lang="ts">
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import WireframeObject from '../../../scripts/wireframeobject';
  import type { Rotation4D } from 'src/types/common';
  import AnimatedScene from '../../../ui/components/AnimatedScene.svelte';
  import { useAnimationDebugger } from '../../../ui/utilities/use-animation-debugger';
  import * as wireframes from '../../../data/wireframe';

  type Wireframes = keyof typeof wireframes;
  let selected: Wireframes = 'cell8';

  let planes = ['xy', 'xz', 'yz', 'xw', 'yw', 'zw'] as const;
  let rotation: Rotation4D = { xz: 0, xy: 0, yz: 0, xw: 0, yw: 0, zw: 0 };

  let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
  let cube: WireframeObject;

  let loading = true;

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

    cube = new WireframeObject(scene);

    switchShape(selected);
  }

  const debug = useAnimationDebugger();
  function frame() {
    debug.begin();
    cube.reset();
    cube.rotate(rotation);
    debug.endSection('rotate');
    cube.update();
    debug.endSection('update');
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

  let faces = true;
  function toggleFaces() {
    faces = !faces;
    cube.setFacesVisible(faces);
  }

  async function switchShape(shape: string) {
    loading = true;
    selected = shape as Wireframes;
    const data = await wireframes[selected].load();
    cube.loadData(data);
    loading = false;
  }
</script>

<div class="flex h-full w-full bg-gray-50 p-4 md:space-x-5 md:p-5">
  <div class="h-full w-[70%] overflow-clip rounded-xl bg-white">
    <AnimatedScene callbacks={{ init, frame, resize, destroy }} {loading} />
  </div>
  <div class="h-full w-[30%]">
    <a href="/">Home</a>
    <div class="space-y-2">
      {#each planes as plane}
        <p>{plane}</p>
        <input
          name={plane}
          class="w-full"
          type="range"
          min={-Math.PI}
          max={Math.PI}
          step={Math.PI / 180}
          bind:value={rotation[plane]}
        />
      {/each}
    </div>
    <div class="space-y-2">
      <button on:click={toggleFaces}>Toggle faces</button>
    </div>
    <select bind:value={selected} on:change={(e) => switchShape(e.currentTarget.value)}>
      {#each Object.keys(wireframes) as wireframe}
        <option value={wireframe}>{wireframe}</option>
      {/each}
    </select>
  </div>
</div>
