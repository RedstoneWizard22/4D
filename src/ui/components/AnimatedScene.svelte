<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { useAnimationLoop } from '../utilities/use-animation-loop';

  type ErrorDetails = {
    title: string;
    message: string;
  };

  export let callbacks: {
    init: (canvas: HTMLCanvasElement, width: number, height: number) => void;
    frame: (delta: number) => void;
    resize: (canvas: HTMLCanvasElement, width: number, height: number) => void;
    destroy: (canvas: HTMLCanvasElement) => void;
  };
  export let maxFps = Infinity;
  export let loading = false;

  let parent: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let animationLoop = useAnimationLoop({ autoStart: false });
  let initialized = false;
  let error: ErrorDetails | undefined;

  $: animationLoop.setOptions({ maxFps });

  $: if (browser && initialized) {
    if (loading) {
      animationLoop.stop();
    } else {
      animationLoop.start();
    }
  }

  onMount(init);

  function init() {
    try {
      callbacks.init(canvas, parent.clientWidth, parent.clientHeight);
    } catch (e) {
      error = {
        title: 'Error initializing scene',
        message: 'The scene failed to initialize. Please reload the page to try again.',
      };
      destroy();
      console.error(e);
      return;
    }

    window.addEventListener('resize', resize, false);
    canvas.addEventListener(
      'webglcontextlost',
      () => {
        error = {
          title: 'WebGL context lost',
          message: 'Your browser lost the WebGL context. Please reload the page.',
        };
        destroy();
      },
      false
    );
    animationLoop.add(frame);
    initialized = true;

    return destroy;
  }

  function frame(delta: number) {
    try {
      callbacks.frame(delta);
    } catch (e) {
      error = {
        title: 'Error rendering frame',
        message: 'An error occured during rendering. Please reload the page to try again.',
      };
      destroy();
      console.error(e);
    }
  }

  function resize() {
    callbacks.resize(canvas, parent.clientWidth, parent.clientHeight);
  }

  function destroy() {
    callbacks.destroy(canvas);
    animationLoop.remove(frame);
    animationLoop.stop();
    window.removeEventListener('resize', resize, false);
  }
</script>

<div class="relative h-full w-full" bind:this={parent}>
  <canvas class="h-full w-full" bind:this={canvas} />
  {#if !error && (loading || !initialized)}
    <div class="absolute top-0 left-0 z-10 h-full w-full bg-gray-900 bg-opacity-10" transition:fade>
      <!-- loader from https://codepen.io/supah/pen/BjYLdW -->
      <svg class="spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
      </svg>
    </div>
  {/if}
  {#if error}
    <div class="absolute top-0 left-0 z-10 h-full w-full bg-white">
      <p>{error.title}</p>
      <p>{error.message}</p>
    </div>
  {/if}
</div>

<style>
  .spinner {
    -webkit-animation: rotate 2s linear infinite;
    animation: rotate 2s linear infinite;
    z-index: 2;
    position: absolute;
    top: 50%;
    left: 50%;
    margin: -25px 0 0 -25px;
    width: 50px;
    height: 50px;
  }
  .spinner .path {
    stroke: #ffffff;
    stroke-linecap: round;
    -webkit-animation: dash 1.5s ease-in-out infinite;
    animation: dash 1.5s ease-in-out infinite;
  }

  @-webkit-keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
  @-webkit-keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
</style>
