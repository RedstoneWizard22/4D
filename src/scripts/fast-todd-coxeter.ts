/** An implementation of the Todd-Coxeter algorithm, assuming that:
 *  1) The generators are self-inverse
 *  2) The subgroup is a stabilizing subgroup of coset 0
 *
 *  It is written for maximum performance, and will make no attempt to
 *  handle coincidences (throws an error instead). It is intended for
 *  use in generating uniform polytopes.
 *
 *  @param generatorCount - Total number of generators
 *  @param relations - Relations between the generators (e.g. [0,1,0,1,0,1] means (g0 g1)^3 = I)
 *  @param subgroup - Stabilizing subgroup to generate for (e.g. [0,2])
 *
 *  @see https://pywonderland.com/polytopes/
 *  @see https://en.wikipedia.org/wiki/Todd%E2%80%93Coxeter_algorithm
 */
class FastToddCoxeter {
  generatorCount: number;
  relations: number[][];
  subgroup: number[];

  _cosetTable = [] as (number | undefined)[];

  _relationLeftValue = [] as number[][];
  _relationRightValue = [] as number[][];
  _relationLeftGeneratorPos = [] as number[][];
  _relationRightGeneratorPos = [] as number[][];

  constructor(generatorCount: number, relations: number[][], subgroup: number[]) {
    this.generatorCount = generatorCount;
    this.relations = relations;
    this.subgroup = subgroup;
  }

  solve(MAX_ITER = 20000) {
    this._cosetTable = [];
    this._relationLeftValue = Array.from({ length: this.relations.length }, () => []);
    this._relationRightValue = Array.from({ length: this.relations.length }, () => []);
    this._relationLeftGeneratorPos = Array.from({ length: this.relations.length }, () => []);
    this._relationRightGeneratorPos = Array.from({ length: this.relations.length }, () => []);

    this.addCoset();
    for (const generator of this.subgroup) {
      this.deduce(0, generator, 0);
    }

    let i = -1;
    let firstEmpty = 0;
    while (++i < MAX_ITER) {
      this.scan();
      for (; firstEmpty < this._cosetTable.length; firstEmpty++) {
        if (this._cosetTable[firstEmpty] === undefined) break;
      }
      if (firstEmpty >= this._cosetTable.length) break;
      const cosetCount = Math.floor(this._cosetTable.length / this.generatorCount);
      this.addCoset();
      this.deduce(
        Math.floor(firstEmpty / this.generatorCount),
        firstEmpty % this.generatorCount,
        cosetCount
      );
    }

    if (i == MAX_ITER) {
      console.error('Max iterations reached');
    }
  }

  scan() {
    for (let ri = 0; ri < this.relations.length; ri++) {
      const relation = this.relations[ri];
      const lv = this._relationLeftValue[ri];
      const rv = this._relationRightValue[ri];
      const lgp = this._relationLeftGeneratorPos[ri];
      const rgp = this._relationRightGeneratorPos[ri];
      const cosetCount = Math.floor(this._cosetTable.length / this.generatorCount);
      for (let coset = 0; coset < cosetCount; coset++) {
        /// Forward scan
        while (rgp[coset] > 0) {
          const generator = relation[lgp[coset]];
          const nextCoset = this.getCosetTableEntry(lv[coset], generator);
          if (rgp[coset] == lgp[coset]) {
            rgp[coset] = 0;
            if (nextCoset === undefined) {
              // We've made a deduction! Register it and restart the scan
              this.deduce(lv[coset], generator, rv[coset]);
              this.scan();
              return;
            } else if (nextCoset !== rv[coset]) {
              throw new Error('Conincidence found but not handled because code is unfinished');
            }
            break;
          }

          if (nextCoset === undefined) break;
          lv[coset] = nextCoset;
          lgp[coset]++;
        }

        /// Backward scan
        while (rgp[coset] > 0) {
          const generator = relation[rgp[coset]];
          const nextCoset = this.getCosetTableEntry(rv[coset], generator);
          if (lgp[coset] == rgp[coset]) {
            rgp[coset] = 0;
            if (nextCoset === undefined) {
              // We've made a deduction! Register it and restart the scan
              this.deduce(rv[coset], generator, lv[coset]);
              this.scan();
              return;
            } else if (nextCoset !== lv[coset]) {
              throw new Error('Conincidence found but not handled because code is unfinished');
            }
            break;
          }

          if (nextCoset === undefined) break;
          rv[coset] = nextCoset;
          rgp[coset]--;
        }
      }
    }
  }

  addCoset() {
    const cosetCount = Math.floor(this._cosetTable.length / this.generatorCount);

    for (let i = 0; i < this.generatorCount; i++) {
      this._cosetTable.push(undefined);
    }

    for (let i = 0; i < this.relations.length; i++) {
      this._relationLeftGeneratorPos[i].push(0);
      this._relationRightGeneratorPos[i].push(this.relations[i].length - 1);
      this._relationLeftValue[i].push(cosetCount);
      this._relationRightValue[i].push(cosetCount);
    }
  }

  /* Register the deduction that cosetA · generator = cosetB */
  deduce(cosetA: number, generator: number, cosetB: number) {
    this.setCosetTableEntry(cosetA, generator, cosetB);
    this.setCosetTableEntry(cosetB, generator, cosetA);
  }

  setCosetTableEntry(coset: number, generator: number, value: number) {
    this._cosetTable[generator + this.generatorCount * coset] = value;
  }

  getCosetTableEntry(coset: number, generator: number) {
    return this._cosetTable[generator + this.generatorCount * coset];
  }
}

export default FastToddCoxeter;
