<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  // WARNING: .js file extension is necessary here for ssr to work
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import FoldingObject3D from '../../../scripts/foldingobject3d';

  import tetrahedron from '../../../data/wireframe3d/tetrahedron.json';
  import cubeData from '../../../data/wireframe3d/cube.json';
  import octahedron from '../../../data/wireframe3d/octahedron.json';
  import icosahedron from '../../../data/wireframe3d/icosahedron.json';
  import dodecahedron from '../../../data/wireframe3d/dodecahedron.json';
  import cone from '../../../data/wireframe3d/cone.json';
  import sphere from '../../../data/wireframe3d/sphere.json';
  const shapes = {
    tetrahedron,
    cube: cubeData,
    octahedron,
    icosahedron,
    dodecahedron,
    cone,
    sphere,
  };
  type Shapes = keyof typeof shapes;
  let selected: Shapes = 'cube';

  let canvas: HTMLCanvasElement;
  // let height: number, width: number;
  let canvasParent: HTMLElement;
  let animationFrame: number;

  let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
  let cube: FoldingObject3D;

  let frame = 0;
  let prevFrame = -1;

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
    renderer.setSize(sceneWidth, sceneHeight);

    const controls = new OrbitControls(camera, renderer.domElement);

    ////////// Scene Setup //////////
    // Camera
    camera.position.set(0, 2, -5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    controls.update(); // OrbitControls must be updated after changes to camera position/rotation

    // TODO: Remove
    // Create sphere at origin
    // const sphere = new THREE.SphereGeometry(0.1, 32, 32);
    // const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const sphereMesh = new THREE.Mesh(sphere, sphereMaterial);
    // scene.add(sphereMesh);

    // Create a grid plane at the origin
    // const grid = new THREE.GridHelper(10, 10, 0x000000, 0x000000);
    // scene.add(grid);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xc4c4c4, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.y = 10;
    scene.add(directionalLight);

    cube = new FoldingObject3D(scene);
    cube.loadData(shapes[selected]);
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
      if (frame != prevFrame) {
        cube.update(frame);
        prevFrame = frame;
      }
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

    // cube.dispose();
    renderer.dispose();
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
    prevFrame = -1;
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
      <div>
        <input class="w-full" type="range" min="0" max="100" bind:value={frame} />
      </div>
      <div class="space-y-2">
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
