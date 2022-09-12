<script lang="ts">
  import { onMount } from 'svelte';
  import FastToddCoxeter from '../scripts/fast-todd-coxeter';

  onMount(() => {
    const start = performance.now();
    const ftc = new FastToddCoxeter(
      4,
      [
        [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [1, 2, 1, 2, 1, 2],
        [2, 3, 2, 3, 2, 3],
        [0, 2, 0, 2],
        [0, 3, 0, 3],
        [1, 3, 1, 3],
      ],
      [0, 2, 3]
    );
    ftc.solve();
    console.log(`Ftc took: ${performance.now() - start}ms`);
    console.log(ftc);
  });
</script>

<p>Toddcox</p>
