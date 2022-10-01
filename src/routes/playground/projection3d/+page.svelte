<script lang="ts">
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import WireframeObject3D from '../../../scripts/wireframeobject3d';
  import type { Rotation3D } from 'src/types/common';
  import AnimatedScene from '../../../ui/components/AnimatedScene.svelte';
  import { d3 } from '../../../data';
  import { tweened } from 'svelte/motion';
  import { quadInOut } from 'svelte/easing';
  import polygen from '$utils/geometry/polygen';

  type Names = keyof typeof d3;
  let selected: Names = 'cube';

  let planes = ['xy', 'xz', 'yz'] as const;
  let rotation: Rotation3D = { xz: 0, xy: 0, yz: 0 };

  let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
  let cube: WireframeObject3D;

  let loading = true;

  let pp = false;
  const ppFactor = tweened(~~pp, {
    duration: 300,
    easing: quadInOut,
  });
  $: ppFactor.set(~~pp);

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

    switchShape(selected);
  }

  function frame() {
    cube.reset();
    cube.rotate(rotation);
    cube.update($ppFactor);
    renderer.render(scene, camera);
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

  async function switchShape(shape: string) {
    loading = true;
    selected = shape as Names;
    const data = polygen(d3[selected], true);
    cube.loadData(data);
    loading = false;
  }
</script>

<div class="flex h-full w-full p-4 md:space-x-5 md:p-5">
  <div class="h-full w-[70%] overflow-clip rounded-xl bg-white">
    <AnimatedScene callbacks={{ init, frame, resize, destroy }} {loading} />
  </div>
  <div class="h-full w-[30%]">
    <p class="ml-2.5 mt-0.5 mb-2.5 text-lg font-semibold text-gray-800">Controls</p>
    <div class="rounded-xl bg-white p-4 px-5">
      <div class="space-y-4">
        {#each planes as plane}
          <div class="flex items-center space-x-4">
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
          </div>
        {/each}
      </div>
      <div class="mt-5 flex items-start">
        <input id="pp" type="checkbox" bind:checked={pp} class="mt-2 mr-3 cursor-pointer" />
        <label for="pp" class="cursor-pointer">
          <p>Perspective project</p>
          <p class="text-sm text-gray-500">Perspective project the shape onto a 2d plane</p>
        </label>
      </div>
      <div class="mt-4">
        <p class="mb-0.5">Select solid</p>
        <select bind:value={selected} on:change={(e) => switchShape(e.currentTarget.value)}>
          {#each Object.keys(d3) as name}
            <option value={name}>{name}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
</div>

<svelte:head>
  <title>4D Playground · Projection3D</title>
</svelte:head>
