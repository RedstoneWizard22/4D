<script lang="ts">
  import { CosetTable } from '$utils/geometry';

  function runCosetTable() {
    const start = performance.now();
    const ct = new CosetTable(
      'abcd',
      ['ababababab', 'bcbcbc', 'cdcdcd', 'acac', 'adad', 'bdbd'],
      []
    );
    // const ct = new CosetTable('ab', ['aaaaaaaa', 'bbbbbbb', 'abab', 'AbAbAb'], ['aa', 'Ab'], false);
    try {
      ct.solve();
    } catch (e) {
      console.log(`CosetTable broke after: ${performance.now() - start}ms`);
      console.log(ct);
      throw e;
    }

    console.log(`CosetTable took: ${performance.now() - start}ms`);
    console.log(ct);
  }
</script>

<button class="rounded-full bg-blue-500 px-6 py-3 text-white" on:click={runCosetTable}>
  Run coset
</button>
