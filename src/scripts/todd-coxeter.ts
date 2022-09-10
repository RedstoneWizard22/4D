class Table {
  protected _data: (number | undefined)[][] = [];
  protected _columns: number;

  constructor(columns: number) {
    this._columns = columns;
  }

  get rows() {
    return this._data.length;
  }

  protected _checkColInBounds(col: number) {
    if (col + 1 > this._columns) throw new Error('Column index out of bounds');
  }

  protected _checkRowInBounds(row: number) {
    if (row + 1 > this.rows) throw new Error('Row index out of bounds');
  }

  protected _checkInBounds(row: number, col: number) {
    this._checkRowInBounds(row);
    this._checkColInBounds(col);
  }
}

class CosetTable extends Table {
  _emptyEntries = 0;

  /* Adds a new empty coset row to the table */
  addCoset() {
    this._data.push(new Array(this._columns).fill(undefined));
    this.set(this.rows - 1, 0, this.rows - 1);
    this._emptyEntries += this._columns;
  }

  /* Register the deduction that cosetA · generator = cosetB */
  deduce(cosetA: number, cosetB: number, generator: number) {
    this.set(cosetA, generator + 1, cosetB);
    this.set(cosetB, generator + 1, cosetA);
  }

  /* Are all entries filled? */
  isComplete() {
    return this._emptyEntries == 0;
  }

  /* Returns the coset obtained after applying `generator` to `cosetA`,
   * or -1 if none is present */
  findCosetAfterGenerator(cosetA: number, generator: number) {
    return this._data[cosetA][generator + 1] ?? -1;
  }

  /* Returns the coset that would result in `cosetB` when `generator` is
   * applied to it. If none is found -1 is returned */
  findCosetBeforeGenerator(cosetB: number, generator: number) {
    return this._data.findIndex((row) => row[generator + 1] == cosetB);
  }

  /* Returns the first empty entry [coset, generator] */
  findFirstEmpty(): [number, number] {
    for (let i = 0; i < this._data.length; i++) {
      for (let j = 1; j < this._columns; j++) {
        if (this._data[i][j] === undefined) return [i, j - 1];
      }
    }
    throw new Error('No empty entry found in coset table');
  }

  /* Set a row and column to have value */
  set(row: number, col: number, value: number) {
    this._checkInBounds(row, col);
    const currentValue = this._data[row][col];
    if (currentValue === undefined) {
      this._emptyEntries -= 1;
    }
    this._data[row][col] = value;
  }
}

class RelationTable extends Table {
  _rowFirstEntries = [] as number[];
  _rowLastEntries = [] as number[];

  addCoset() {
    const count = this.rows;
    this._data.push(new Array(this._columns).fill(undefined));
    this._data[count][this._columns - 1] = count;
    this._data[count][0] = count;
    this._rowFirstEntries.push(0);
    this._rowLastEntries.push(this._columns - 1);
  }

  /* Set a row and column to have value */
  set(row: number, col: number, value: number) {
    this._checkInBounds(row, col);
    this._data[row][col] = value;
    const first = this._rowFirstEntries[row];
    const last = this._rowLastEntries[row];
    if (first == last) {
      throw new Error('This row is already filled!');
    } else if (col == first + 1) {
      this._rowFirstEntries[row] += 1;
    } else if (col == last - 1) {
      this._rowLastEntries[row] -= 1;
    } else {
      throw new Error('You should only insert alongside an existing entry');
    }
  }

  get(row: number, col: number) {
    this._checkInBounds(row, col);
    return this._data[row][col];
  }

  *scanRows() {
    for (let row = 0; row < this._data.length; row++) {
      const first = this._rowFirstEntries[row];
      const last = this._rowLastEntries[row];
      if (first === last + 1 || first == last - 1) continue;
      yield row;
    }
  }

  *forwardScanRow(row: number) {
    const first = this._rowFirstEntries[row];
    const last = this._rowLastEntries[row];
    for (let col = first; col < last; col++) {
      const value = this._data[row][col];
      if (value === undefined) {
        throw new Error('Oh shit');
      }
      yield [col, value];
    }
  }

  *backwardScanRow(row: number) {
    const first = this._rowFirstEntries[row];
    const last = this._rowLastEntries[row];
    for (let col = last; col > first; col--) {
      const value = this._data[row][col];
      if (value === undefined) {
        throw new Error('Oh shit');
      }
      yield [col, value];
    }
  }
}

/** Runs the todd coxeter algorithm upon construction. Generating a coset table
 *
 * @param generatorCount - Total number of generators
 * @param relations - Relations between the generators (e.g. [0,1,0,1,0,1] means (g0 g1)^3 = I)
 * @param subgroup - Subgroup to generate for (e.g. [0,2])
 */
class ToddCoxeter {
  generatorCount: number;
  relations: number[][];
  subgroup: number[];

  cosetTable: CosetTable;
  relationTables: RelationTable[];

  constructor(generatorCount: number, relations: number[][], subgroup: number[]) {
    this.generatorCount = generatorCount;
    this.relations = relations;
    this.subgroup = subgroup;

    this.cosetTable = new CosetTable(generatorCount + 1);
    this.relationTables = relations.map((relation) => new RelationTable(relation.length + 1));
    this.run();
  }

  /* Runs the Todd-Coxeter algorithm */
  run() {
    /// Setup
    // 1) Create coset 0
    this.cosetTable.addCoset();
    this.relationTables.forEach((rt) => rt.addCoset());
    // 2) Register the fact that H fixes coset 0
    for (const generator of this.subgroup) {
      this.cosetTable.set(0, generator + 1, 0);
    }

    /// Loop
    const MAX_ITER = 1000;
    let i = -1;
    while (!this.cosetTable.isComplete() && ++i < MAX_ITER) {
      this.step();
    }

    if (i == MAX_ITER) {
      console.error('Max iterations reached');
    }
  }

  /* Perform one step of the algoritm */
  step() {
    this.scan();
    if (!this.cosetTable.isComplete()) {
      this.cosetTable.addCoset();
      this.relationTables.forEach((rt) => rt.addCoset());
      const empty = this.cosetTable.findFirstEmpty();
      const count = this.cosetTable.rows;
      this.cosetTable.deduce(empty[0], count - 1, empty[1]);
    }
  }

  /* Perfroms one scan of all the tables. If it encounters a deduction it will
   * register it and restart the scan
   */
  scan() {
    this.relationTables.forEach((rt, rti) => {
      for (const row of rt.scanRows()) {
        for (const [col, thisCoset] of rt.forwardScanRow(row)) {
          const generator = this.relations[rti][col];
          const currentNextCoset = rt.get(row, col + 1);
          if (currentNextCoset !== undefined) {
            this.cosetTable.deduce(thisCoset, currentNextCoset, generator);
            this.scan();
            return;
          }

          const nextCoset = this.cosetTable.findCosetAfterGenerator(thisCoset, generator);
          if (nextCoset < 0) {
            break;
          }
          rt.set(row, col + 1, nextCoset);
        }

        for (const [col, thisCoset] of rt.backwardScanRow(row)) {
          const generator = this.relations[rti][col - 1];
          const currentNextCoset = rt.get(row, col - 1);
          if (currentNextCoset !== undefined) {
            this.cosetTable.deduce(thisCoset, currentNextCoset, generator);
            this.scan();
            return;
          }

          const nextCoset = this.cosetTable.findCosetBeforeGenerator(thisCoset, generator);
          if (nextCoset < 0) {
            break;
          }
          rt.set(row, col - 1, nextCoset);
        }
      }
    });
  }
}

export default ToddCoxeter;
