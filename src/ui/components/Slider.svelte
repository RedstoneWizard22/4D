<script lang="ts">
  import { draggable, hotkeys } from '$ui/actions';
  import { clamp } from '$utils/number';
  import { createEventDispatcher } from 'svelte';

  /// Props
  /** Upper limit */
  export let max = 100;
  /** Lower limit */
  export let min = 0;
  /** Step size */
  export let step = (max - min) / 100;
  /** Current value */
  export let value = 0;
  /** Where should the track be filled from - "start", "end" or "zero" */
  export let fillFrom = 'start';
  /** Values at which to display a mark */
  export let marks: number[] = [];

  /// Logic
  let track: HTMLDivElement | null = null;
  let thumb: HTMLDivElement | null = null;

  function handleDrag(evt: CustomEvent<{ x: number; y: number }>) {
    if (!track || !thumb) return;

    let { left, right } = track.getBoundingClientRect();

    left += thumb.offsetWidth / 2;
    right -= thumb.offsetWidth / 2;

    const parentWidth = right - left;
    const p = (evt.detail.x - left) / parentWidth;
    value = clamp(Math.round((p * (max - min)) / step) * step + min, min, max);
  }

  function getPos(value: number) {
    return `calc(0.5625rem + ${(value - min) / (max - min)} * (100% - 1.125rem))`;
  }

  const dispatch = createEventDispatcher();
</script>

<!-- part: root -->
<div class="h-5 w-full min-w-[2.5rem]" on:keydown={(ev) => console.log('root keydown')}>
  <!-- part: track -->
  <div
    class="relative h-2 w-full translate-y-1.5 rounded-full bg-gray-200"
    bind:this={track}
    use:draggable
    on:dragstart|stopPropagation={(ev) => {
      thumb?.focus();
      //@ts-expect-error: mlem
      handleDrag(ev);
    }}
    on:dragmove|stopPropagation={handleDrag}
    on:dragend|stopPropagation={(ev) => {
      dispatch('changeend');
    }}
  >
    <!-- part: thumb -->
    <div
      class="ring-color-100 absolute top-1/2 z-10 h-[1.125rem] w-[1.125rem] -translate-y-1/2 -translate-x-1/2 cursor-pointer rounded-full border-[3px] border-blue-500 bg-white shadow-sm focus-visible:outline-none focus-visible:ring"
      role="slider"
      aria-valuenow={value}
      bind:this={thumb}
      use:draggable
      style:left={getPos(value)}
      tabindex="0"
      use:hotkeys={[
        ['ArrowUp,ArrowRight', () => (value = clamp(value + step, min, max))],
        ['ArrowDown,ArrowLeft', () => (value = clamp(value - step, min, max))],
        ['Home', () => (value = min)],
        ['End', () => (value = max)],
      ]}
    />
    {#if fillFrom === 'start'}
      <div class="h-full rounded-full bg-blue-500" style:width={getPos(value)} />
    {:else if fillFrom === 'end'}
      <div
        class="h-full rounded-full bg-blue-500"
        style:width={getPos(min + max - value)}
        style:float="right"
      />
    {:else}
      <div
        class="absolute h-full rounded-full bg-blue-500"
        style:left={value < (min + max) / 2 ? getPos(value) : '50%'}
        style:right={value < (min + max) / 2 ? '50%' : getPos(min + max - value)}
      />
    {/if}
    <!-- markers -->
    {#each marks as value}
      <div
        class="absolute top-1/2 h-1 w-1 -translate-y-1/2 -translate-x-0.5 rounded-full bg-white"
        style:left={getPos(value)}
      />
    {/each}
  </div>
</div>
