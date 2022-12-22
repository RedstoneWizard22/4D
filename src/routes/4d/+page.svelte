<script lang="ts">
  import Icon from '@iconify/svelte';
  import githubFill from '@iconify/icons-akar-icons/github-fill';
</script>

<div class="absolute top-0 left-0 flex w-full items-center justify-between p-4 px-6">
  <div class="flex items-center space-x-4">
    <div class="h-10 w-10 overflow-clip rounded">
      <img src="/wizard-items.png" alt="RedstoneWizard22's avatar" class="h-full w-full" />
    </div>
    <div class="text-[1.375rem] font-semibold text-gray-600">
      <span class="cursor-pointer hover:text-blue-500">rwizard22.com</span>
      <span>/</span>
      <span class="cursor-pointer hover:text-blue-500">4d</span>
    </div>
  </div>

  <div />

  <div class="flex items-center space-x-4 text-2xl text-gray-600">
    <Icon icon={githubFill} class="cursor-pointer hover:text-blue-500" />
  </div>
</div>

<div class="mt-[4.5rem]">
  <div class="mx-auto max-w-screen-md pt-10">
    <h1>Exploring the 4th Dimension</h1>
    <span class="text-gray-400">4th December 2022</span>
    <p>This is a tesseract - the 4D equivalent of a cube</p>

    <p>
      More specifically, it's the three dimensional projection of a tesseract performing a double
      rotation along two orthogonal planes. Which is a sentance that likely has you going "huuuh?"
      It sure looks trippy! But what does this all mean?
    </p>

    <p>
      Today I'd like to show you two ways in which we can explore the fourth dimension from the
      comfort of our third, and use them to understand how these 4D shapes behave.
    </p>
  </div>
</div>

<style lang="postcss">
  h1 {
    @apply text-4xl font-semibold text-gray-600;
  }

  p {
    @apply py-3.5 text-lg text-gray-600;
  }
</style>
