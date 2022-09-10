<script lang="ts">
  import { onMount } from 'svelte';
  import ToddCoxeter from '../scripts/todd-coxeter';

  onMount(() => {
    console.log(
      new ToddCoxeter(
        3,
        [
          [0, 1, 0, 1, 0, 1, 0, 1],
          [1, 2, 1, 2, 1, 2],
          [0, 2, 0, 2],
        ],
        [1, 2]
      )
    );
    console.log(
      new ToddCoxeter(
        3,
        [
          [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
          [1, 2, 1, 2, 1, 2],
          [0, 2, 0, 2],
        ],
        []
      )
    );
  });
</script>

<p>Toddcox</p>
