<script lang="ts">
  import lockOff from '@iconify/icons-akar-icons/lock-off';
  import Icon from '@iconify/svelte';
</script>

<div class="flex w-full items-center space-x-4">
  <span class="font-bold">
    <span class="text-red-500">X</span><span class="text-green-500">Y</span>
  </span>
  <div class="relative h-5 flex-grow">
    <div class="absolute top-1.5 h-2 w-full rounded-full bg-gray-200" />
    <div
      class="absolute top-[0.0625rem] left-1/2 h-[1.125rem] w-[1.125rem] -translate-x-1/2 rounded-full border-[3px] border-blue-500 bg-white shadow-sm"
    />
  </div>
  <Icon icon={lockOff} />
</div>
