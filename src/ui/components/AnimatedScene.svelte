<script lang="ts">
  import { onMount } from 'svelte';
  import { useAnimationLoop } from '../utilities/use-animation-loop';

  export let callbacks: {
    init: (canvas: HTMLCanvasElement, width: number, height: number) => void;
    frame: (delta: number) => void;
    resize: (canvas: HTMLCanvasElement, width: number, height: number) => void;
    destroy: (canvas: HTMLCanvasElement) => void;
  };
  export let maxFps = Infinity;

  let parent: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let animationLoop = useAnimationLoop();

  $: animationLoop.setOptions({ maxFps });

  onMount(() => {
    init();
    // Add resize event listener to the window
    window.addEventListener('resize', resize, false);
    animationLoop.add(frame);

    return destroy;
  });

  function init() {
    callbacks.init(canvas, parent.clientWidth, parent.clientHeight);
  }

  function frame(delta: number) {
    callbacks.frame(delta);
  }

  function resize() {
    callbacks.resize(canvas, parent.clientWidth, parent.clientHeight);
  }

  function destroy() {
    animationLoop.remove(frame);
    animationLoop.stop();
    window.removeEventListener('resize', resize, false);
  }
</script>

<div class="h-full w-full" bind:this={parent}>
  <canvas class="h-full w-full" bind:this={canvas} />
</div>
