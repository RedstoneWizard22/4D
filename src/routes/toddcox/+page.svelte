<script lang="ts">
  import { CosetTable } from '$utils/geometry/polygen';
  import { parsePlaintextCoxeterDiagram } from '$utils/geometry/polygen';

  function runParser() {
    console.log(parsePlaintextCoxeterDiagram('x4o3x'));
    console.log(parsePlaintextCoxeterDiagram('x x x'));
    console.log(parsePlaintextCoxeterDiagram('x5/2o3o'));
    console.log(parsePlaintextCoxeterDiagram('x3o3o3*a'));
    console.log(parsePlaintextCoxeterDiagram('x3o4o*b5o'));
    console.log(parsePlaintextCoxeterDiagram('x3o4o*b5/2o'));
    console.log(parsePlaintextCoxeterDiagram('x3o4o*b5o5/2*c'));
    console.log(parsePlaintextCoxeterDiagram('xxo3oxx&#xt'));
    console.log(parsePlaintextCoxeterDiagram('xo4oo3od'));
  }

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

<button class="rounded-full bg-blue-500 px-6 py-3 text-white" on:click={runParser}>
  Run parser
</button>
