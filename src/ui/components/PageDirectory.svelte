<script lang="ts">
  import { page } from '$app/stores';

  export let title = 'Page Directory';
  export let pages = [] as string[];
</script>

<p class="text-center">{title}</p>
<div class="flex flex-col text-center">
  {#each pages as name}
    <a href={$page.route.id + '/' + name}>{name}</a>
  {/each}
</div>
