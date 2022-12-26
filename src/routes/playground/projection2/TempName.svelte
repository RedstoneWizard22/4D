<script lang="ts">
  import { Slider } from '$ui/components';
  import lockOff from '@iconify/icons-akar-icons/lock-off';
  import lockOn from '@iconify/icons-akar-icons/lock-on';
  import Icon from '@iconify/svelte';

  export let plane: string;
  export let value = 0;
  let locked = false;

  function onChangeEnd() {
    if (!locked) {
      value = 0;
    }
  }

  function onToggleLock() {
    locked = !locked;
    onChangeEnd();
  }

  const colors = {
    X: 'text-red-500',
    Y: 'text-green-500',
    Z: 'text-blue-500',
    W: 'text-cyan-500',
  };
</script>

<div class="flex w-full items-center space-x-4">
  <span class="font-bold">
    {#each plane.toUpperCase().split('') as char}
      <span class={colors[char]}>{char}</span>
    {/each}
  </span>
  <div class="flex-grow">
    <Slider min={-1} max={1} fillFrom="zero" bind:value on:changeend={onChangeEnd} />
  </div>
  <button on:click={onToggleLock}><Icon icon={locked ? lockOn : lockOff} /></button>
</div>
