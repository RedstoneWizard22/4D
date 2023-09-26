<script lang="ts">
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import WireframeObject from '../../../scripts/wireframeobject';
  import type { Rotation4D } from 'src/types/common';
  import { AnimatedScene } from '$ui/components';
  import { useAnimationDebugger } from '../../../ui/utilities/use-animation-debugger';
  import { d4 } from '$data';
  import polygen from '$utils/geometry/polygen';
  import Icon from '@iconify/svelte';
  import arrowBack from '@iconify/icons-akar-icons/arrow-back';
  import arrowCounterClockwise from '@iconify/icons-akar-icons/arrow-counter-clockwise';
  import rotateOrbit from '@iconify/icons-mdi/rotate-orbit';
  import cubeUnfolded from '@iconify/icons-mdi/cube-unfolded';
  import arrowRightLeft from '@iconify/icons-akar-icons/arrow-right-left';
  import TempName from './TempName.svelte';

  type Names = keyof typeof d4;
  let selected: Names = 'cell8';

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
    renderer.sortObjects = true;

    scene.background = new THREE.Color(0xffffff);
    renderer.setSize(width, height);

    new OrbitControls(camera, renderer.domElement);

    ////////// Scene Setup //////////
    // Camera
    camera.position.set(0, 1.1, -2.75);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xd1d1d1, 0.75);
    scene.add(ambientLight);

    const directionalLight = new THREE.PointLight(0xffffff, 0.5);
    directionalLight.position.y = 10;
    scene.add(directionalLight);

    cube = new WireframeObject(scene);

    switchShape(selected);
  }

  const debug = useAnimationDebugger();
  function frame(delta: number) {
    debug.begin();
    // cube.reset();
    const MULT = (2 * delta) / 1000;
    cube.rotate(
      {
        xy: rotation.xy * MULT,
        xz: rotation.xz * MULT,
        yz: rotation.yz * MULT,
        xw: rotation.xw * MULT,
        yw: rotation.yw * MULT,
        zw: rotation.zw * MULT,
      },
      true
    );
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

  async function switchShape(shape: string) {
    console.log(shape);
    loading = true;
    selected = shape as Names;
    const data = polygen(d4[selected], true);
    cube.loadData(data);
    loading = false;
  }
</script>

<div class="flex h-full w-full p-4 md:space-x-5 md:p-5">
  <div class="relative h-full w-[70%]">
    <div class="h-full w-full overflow-clip rounded-xl bg-white">
      <AnimatedScene callbacks={{ init, frame, resize, destroy }} {loading} />
    </div>
    <div class="floaty absolute top-0 left-0 z-20 rounded-br-lg bg-gray-50">
      <button class="px-2 py-1 text-base">
        <Icon inline class="inline" icon={arrowBack} />
        <!-- <span class="pl-1">Back</span> -->
      </button>
    </div>
  </div>
  <div class="h-full w-[30%]">
    <p class="ml-2 py-2 text-xl font-semibold text-gray-600">Controls (WIP)</p>
    <div class="w-full space-y-4 rounded-lg bg-white p-3 px-4">
      <div class="flex space-x-6">
        <TempName plane="xy" bind:value={rotation.xy} />
        <TempName plane="xz" bind:value={rotation.xz} />
      </div>
      <div class="flex space-x-6">
        <TempName plane="yz" bind:value={rotation.yz} />
        <TempName plane="xw" bind:value={rotation.xw} />
      </div>
      <div class="flex space-x-6">
        <TempName plane="yw" bind:value={rotation.yw} />
        <TempName plane="zw" bind:value={rotation.zw} />
      </div>
      <div class="pb-0.5">
        <button
          class="mx-auto block rounded border px-3 py-1.5 text-sm shadow-sm"
          on:click={() => cube.reset()}
        >
          <Icon inline class="inline text-gray-400" icon={arrowCounterClockwise} />
          <span class="pl-1 font-semibold">Reset rotation</span>
        </button>
      </div>
    </div>
    <div class="mt-3 flex space-x-1 rounded-lg bg-gray-100 p-1">
      <div class="flex-1 rounded bg-white p-1.5 px-3 shadow">
        <Icon inline class="inline" icon={rotateOrbit} />
        <span class="pl-1">Rotate</span>
      </div>
      <div class="flex-1 rounded p-1.5 px-3">
        <Icon inline class="inline" icon={cubeUnfolded} />
        <span class="pl-1">Unfold</span>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between rounded-lg bg-white p-2.5 px-3.5">
      <div class="">
        <div class="font-medium">{selected.replace('cell8', 'Tesseract')}</div>
        <div class="text-xs text-gray-500">{d4[selected]}</div>
      </div>
      <div class="text-2xl">
        <Icon icon={arrowRightLeft} />
      </div>
    </div>
    <p class="mt-2">Temporary shape selection:</p>
    <select value={selected} on:change={(ev) => switchShape(ev.target.value)}>
      {#each Object.keys(d4) as v}
        <option value={v}>{v}</option>
      {/each}
    </select>
  </div>
</div>

<svelte:head>
  <title>4D Playground · Projection</title>
</svelte:head>

<style>
  .floaty::after {
    width: 0.5rem;
    height: 0.5rem;
    background: transparent;
    bottom: -0.5rem;
    left: 0px;
    position: absolute;
    content: '';
    border-top-left-radius: 100%;
    box-shadow: 0px 0px 0px 50px rgb(249 250 251 / var(--tw-bg-opacity));
    clip: rect(0px, 0.5rem, 0.5rem, 0px);
    display: block;
  }

  .floaty::before {
    width: 0.5rem;
    height: 0.5rem;
    background: transparent;
    top: 0px;
    right: -0.5rem;
    position: absolute;
    content: '';
    border-top-left-radius: 100%;
    box-shadow: 0px 0px 0px 50px rgb(249 250 251 / var(--tw-bg-opacity));
    clip: rect(0px, 0.5rem, 0.5rem, 0px);
    display: block;
  }
</style>
