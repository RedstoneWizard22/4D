<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import WireframeObject from '../../../scripts/wireframeobject';

  import cell8Data from '../../../data/wireframe/cell8.json';
  import cell5Data from '../../../data/wireframe/cell5.json';
  import cell16Data from '../../../data/wireframe/cell16.json';
  import cell24Data from '../../../data/wireframe/cell24.json';
  import cell120Data from '../../../data/wireframe/cell120.json';
  import cell600Data from '../../../data/wireframe/cell600.json';
  const shapes = {
    cell8: cell8Data,
    cell5: cell5Data,
    cell16: cell16Data,
    cell24: cell24Data,
    cell120: cell120Data,
    cell600: cell600Data,
  };
  type Shapes = keyof typeof shapes;
  let selected: Shapes = 'cell8';

  import type { Rotation4D } from 'src/scripts/hyperobject';

  let planes = ['xy', 'xz', 'yz', 'xw', 'yw', 'zw'] as const;
  let rotation: Rotation4D = planes.reduce((acc, plane) => {
    acc[plane] = 0;
    return acc;
  }, {} as Rotation4D);

  let canvas: HTMLCanvasElement;
  // let height: number, width: number;
  let canvasParent: HTMLElement;
  let animationFrame: number;

  let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
  let cube: WireframeObject;

  onMount(() => {
    init();
    // Add resize event listener to the window
    window.addEventListener('resize', resize, false);
    startAnimating(90);

    return destroy;
  });

  function init() {
    // Set canvas width and height
    const sceneWidth = canvasParent.clientWidth;
    const sceneHeight = canvasParent.clientHeight;

    ////////// Inital Setup //////////
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, sceneWidth / sceneHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(sceneWidth, sceneHeight);
    renderer.sortObjects = false;

    // scene.background = new THREE.Color(0xf8f8ff);
    // scene.background = new THREE.Color( 0xffdf06 );
    scene.background = new THREE.Color(0xf9fafb);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.enabled = true;
    renderer.setSize(sceneWidth, sceneHeight);

    const controls = new OrbitControls(camera, renderer.domElement);

    ////////// Scene Setup //////////
    // Camera
    camera.position.set(0, 2, -5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    controls.update(); // OrbitControls must be updated after changes to camera position/rotation

    // Objects
    const floorGeometry = new THREE.PlaneGeometry(22, 22);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.name = 'floor';
    floor.position.y = -4;
    floor.rotateX(-Math.PI / 2);
    floor.receiveShadow = true;

    scene.add(floor);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xc4c4c4, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.position.y = 10;
    scene.add(directionalLight);

    cube = new WireframeObject(scene, shapes[selected]);
    cube.updateMeshes();
  }

  let fpsInterval: number, now: number, then: number, elapsed: number;

  // initialize the timer variables and start the animation

  function startAnimating(fps: number) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    animate();
  }

  function stopAnimating() {
    cancelAnimationFrame(animationFrame);
  }

  let frameNo = 0;
  let totTime = 0;
  let calcTime = 0;
  let renderTime = 0;
  function animate() {
    // request another frame
    animationFrame = requestAnimationFrame(animate);

    // calc elapsed time since last loop
    now = Date.now();
    elapsed = now - then;

    // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {
      // Get ready for next frame by setting then=now, but also adjust for your
      // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
      then = now - (elapsed % fpsInterval);

      // Put your drawing code here
      let start = performance.now();
      cube.setRotation(rotation);
      cube.projectTo3D();
      cube.updateMeshes();
      calcTime += performance.now() - start;
      start = performance.now();
      renderer.render(scene, camera);
      renderTime += performance.now() - start;
      totTime = calcTime + renderTime;
      frameNo++;
      if (frameNo % 100 == 0) {
        console.log(
          `100 frames in ${totTime} ms\n> ${calcTime} ms calc\n> ${renderTime} ms render`
        );
        totTime = calcTime = renderTime = 0;
      }
    }
  }

  function resize() {
    const sceneWidth = canvasParent.clientWidth;
    const sceneHeight = canvasParent.clientHeight;
    renderer.setSize(sceneWidth, sceneHeight);
    camera.aspect = sceneWidth / sceneHeight;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize, false);

    renderer.dispose();
  }

  let shadowsOn = true;
  function toggleShadows() {
    shadowsOn = !shadowsOn;
    // renderer.shadowMap.enabled = shadowsOn;
    cube.setCastShadows(shadowsOn);
  }

  let faces = true;
  function toggleFaces() {
    faces = !faces;
    cube.setFacesVisible(faces);
  }

  function switchShape(shape: string) {
    stopAnimating();
    selected = shape as Shapes;
    cube.loadData(shapes[shape as Shapes]);
    startAnimating(90);
  }
</script>

<div class="flex h-screen bg-gray-100 p-2">
  <div class="h-full w-8/12 p-2">
    <div class="h-full w-full bg-gray-50 shadow" bind:this={canvasParent}>
      <canvas width="100" height="100" bind:this={canvas} />
    </div>
  </div>
  <div class="h-full w-4/12 p-2">
    <div class="h-full w-full bg-gray-50 shadow p-2">
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
        <button on:click={toggleShadows}>Toggle shadows</button>
        <button on:click={toggleFaces}>Toggle faces</button>
      </div>
      <select bind:value={selected} on:change={(e) => switchShape(e.currentTarget.value)}>
        {#each Object.keys(shapes) as shape}
          <option value={shape}>{shape}</option>
        {/each}
      </select>
    </div>
  </div>
</div>
