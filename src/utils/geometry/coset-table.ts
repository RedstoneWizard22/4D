/**
 * An implementation of the Todd-Coxeter algorithm using the HLT (Hasselgrove, Leech
 * and Trotter) strategy.
 *
 * Letters are used to represent generators, with uppercase variants representing
 * their inverse (i.e. A = a^-1).
 *
 * @param generators - Generators of the group G (e.g. "abc") (inverses can be omitted)
 * @param relations - Relations between the generators
 *   (e.g. ["aa", "bbb", "ababab"] means a^2 = b^3 = (ab)^3 = I)
 * @param subgroup - Generators of stabilizing subgroup H (e.g. ["a", "c"])
 * @param isCoxeter - If true the generators are self-inverse (i.e. A = a^-1)
 *
 * This is really just a rip off of the Python implementation here:
 * https://github.com/neozhaoliang/pywonderland/blob/master/src/polytopes/polytopes/todd_coxeter.py
 */
class CosetTable {
  /** If true the generators are self-inverse */
  _isCoxeter: boolean;
  /** Number of generators (if isCoxeter is false this includes inverses!) */
  _genCount: number;
  /** Generator relations represented as integer arrays */
  _relations: number[][];
  /** Generators of stabilizing subgroup H represented as integer arrays */
  _subgens: number[][];

  /**
   * Holds the equivalence classes of the cosets. equivalence[i] = j means that
   * coset i is equivalent to j. If equivalence[i] = i then coset i is "alive",
   * otherwise it is considered "dead". Note equivalence[i] <= i always holds.
   */
  _equivalence: number[];
  /**
   * Queue holding "dead" cosets for processing. This is needed as when handling
   * a coincidence, more coincidences may be discovered.
   */
  _deadQueue: number[];

  /** The coset table itself :D */
  _table: (number | undefined)[][];
  /** Returns the inverse to a generator */
  _inv: (g: number) => number;

  /** Map from generator characters and integers */
  _char2int: Map<string, number>;
  /**
   * Stores the complete alphabet including inverses. You can use this to convert
   * from integers to characters. (e.g. `c = alphabet[i]`)
   */
  _alphabet: string;

  /** Is the coset table solved? */
  _isSolved = false;

  constructor(generators: string, relations: string[], subgens: string[], isCoxeter = true) {
    // Determine maps between generator characters and integers
    const char2int = new Map<string, number>();
    let alphabet = '';
    for (let i = 0; i < generators.length; i++) {
      const c = generators[i].toLowerCase();
      if (!char2int.has(c)) {
        char2int.set(c, alphabet.length);
        alphabet += c;

        if (!isCoxeter) {
          const C = c.toUpperCase();
          if (C === c) throw new Error(`Generator char ${c} has no uppercase equivalent`);
          char2int.set(C, alphabet.length);
          alphabet += C;
        }
      }
    }
    this._alphabet = alphabet;
    this._char2int = char2int;

    // Convert relations to integer arrays, checking that they are valid
    const relationsInt = relations.map((r) => {
      const rInt = [];
      for (let i = 0; i < r.length; i++) {
        const c = r[i];
        const g = char2int.get(c);
        if (g === undefined) throw new Error(`Invalid generator ${c} in relation ${r}`);
        rInt.push(g);
      }
      return rInt;
    });
    this._relations = relationsInt;

    // Convert subgroup generators to integer arrays, checking that they are valid
    const subgensInt = subgens.map((r) => {
      const rInt = [];
      for (let i = 0; i < r.length; i++) {
        const c = r[i];
        const g = char2int.get(c);
        if (g === undefined) throw new Error(`Invalid generator ${c} in subgroup generator ${r}`);
        rInt.push(g);
      }
      return rInt;
    });
    this._subgens = subgensInt;

    this._genCount = char2int.size;
    this._isCoxeter = isCoxeter;
    // Initially we have only the 0th coset
    this._equivalence = [0];
    this._table = [Array(this._genCount).fill(undefined)];
    this._deadQueue = []; // Start with all cosets alive

    if (isCoxeter) {
      this._inv = (g: number) => g;
    } else {
      this._inv = (g: number) => g ^ 1;
    }
  }

  /** Register the deduction that `cosetA * gen = cosetB` */
  _deduce(cosetA: number, cosetB: number, gen: number) {
    this._table[cosetA][gen] = cosetB;
    this._table[cosetB][this._inv(gen)] = cosetA;
  }

  /** Define a new coset for which `coset * gen = newCoset` */
  _define(coset: number, gen: number) {
    const n = this._table.length;
    this._table.push(Array(this._genCount).fill(undefined));
    this._deduce(coset, n, gen);
    this._equivalence.push(n);
  }

  /** Checks if a coset is alive */
  _isAlive(coset: number) {
    return this._equivalence[coset] === coset;
  }

  /**
   * Returns the smallest (index wise) coset that is equivalent to `coset`.
   * This method will also compress the equivalence chain as an optimization.
   */
  _rep(coset: number) {
    let r = coset;
    while (r !== this._equivalence[r]) {
      r = this._equivalence[r];
    }

    // Path compression
    // e.g. if coset is 6, and equivalence is [0, 0, 2, 3, 1, 5, 4]
    // r would be 0 and equivalcence is compressed to [0, 0, 2, 3, 0, 5, 0]
    let c = coset;
    while (c !== r) {
      const tmp = this._equivalence[c];
      this._equivalence[c] = r;
      c = tmp;
    }
    return r;
  }

  /**
   * Given two equivalent cosets, declare the larger one to be dead and add
   * it to the dead queue.
   */
  _merge(cosetA: number, cosetB: number) {
    const a = this._rep(cosetA);
    const b = this._rep(cosetB);
    if (a !== b) {
      // Remember equivalence[i] <= i must hold
      const s = Math.min(a, b);
      const t = Math.max(a, b);
      this._equivalence[t] = s;
      this._deadQueue.push(t);
    }
  }

  /** Process the coincidence that `cosetA = cosetB` */
  _coincidence(cosetA: number, cosetB: number) {
    this._merge(cosetA, cosetB);

    // Process all dead cosets
    // The queue holds only one coset at this point, but more may be added
    while (this._deadQueue.length > 0) {
      const dead = this._deadQueue.shift()!;
      // For each coset `next` this dead one connects to
      for (let g = 0; g < this._genCount; g++) {
        const next = this._table[dead][g];
        if (next !== undefined) {
          // Delete next's reference to the dead coset
          this._table[next][this._inv(g)] = undefined;

          // Copy the existing information to the representative of the dead coset
          // But watch out for new coincidences. next may be dead already, so we
          // need to watch out for that too.
          const deadRep = this._rep(dead);
          const nextRep = this._rep(next);

          const existingNext = this._table[deadRep][g];
          const existingDead = this._table[nextRep][this._inv(g)];
          if (existingNext !== undefined && existingNext != nextRep) {
            // we have a coincidence
            this._merge(nextRep, existingNext);
          } else if (existingDead !== undefined && existingDead != deadRep) {
            // we have a coincidence
            this._merge(deadRep, existingDead);
          } else {
            // No coincidence, so we can just copy the information
            this._deduce(deadRep, nextRep, g);
          }
        }
      }
    }
  }

  /** Scan the row of a coset under a given word, defining cosets as needed. */
  _scanAndFill(coset: number, word: number[]) {
    let lv = coset; // Left value
    let rv = coset; // Right value
    let lp = 0; // left position
    let rp = word.length - 1; // right position

    let iter = 0;
    while (iter++ < word.length) {
      // Scan forward as far as possible
      while (lp <= rp && this._table[lv][word[lp]] !== undefined) {
        lv = this._table[lv][word[lp]]!;
        lp++;
      }

      // If complete check for coincidence, then stop
      if (lp > rp) {
        if (lv != rv) {
          this._coincidence(lv, rv);
        }
        return;
      }

      // Scan backward as far as possible untill it meets the forward scan
      while (rp >= lp && this._table[rv][this._inv(word[rp])] !== undefined) {
        rv = this._table[rv][this._inv(word[rp])]!;
        rp--;
      }

      // If rp and lp overlap, a coincidence has been found
      if (rp < lp) {
        this._coincidence(lv, rv);
        return;
      }

      // If they are about to meet, a deduction can be made
      if (rp == lp) {
        this._deduce(lv, rv, word[lp]);
        return;
      }

      // Otherwise, define a new coset and continue scanning forward
      this._define(lv, word[lp]);
    }

    throw new Error('Iteration limit exceeded');
  }

  /** Run the HLT strategy with the provided iteration limit */
  _hlt(MAX_ITER: number) {
    for (const word of this._subgens) {
      this._scanAndFill(0, word);
    }

    let current = 0;
    let iter = 0;
    while (current < this._table.length && iter++ < MAX_ITER) {
      for (const rel of this._relations) {
        if (!this._isAlive(current)) {
          break;
        }
        this._scanAndFill(current, rel);
      }

      if (this._isAlive(current)) {
        for (let g = 0; g < this._genCount; g++) {
          if (this._table[current][g] === undefined) {
            this._define(current, g);
          }
        }
      }

      current++;
    }

    if (iter >= MAX_ITER) {
      throw new Error('Iteration limit exceeded');
    }
  }

  /** Delete all dead cosets in the table, renumbering the live ones */
  _compress() {
    let ind = -1;
    for (let coset = 0; coset < this._table.length; coset++) {
      if (this._isAlive(coset)) {
        ind++;
        if (ind != coset) {
          for (let g = 0; g < this._genCount; g++) {
            const next = this._table[coset][g];
            if (next === coset) {
              this._table[ind][g] = ind;
            } else {
              if (next === undefined) {
                throw new Error('compress should not be called before the table is solved!');
              }
              this._deduce(ind, next, g);
            }
          }
        }
      }
    }

    this._equivalence = Array(ind + 1)
      .fill(0)
      .map((_, i) => i);
    this._table = this._table.slice(0, ind + 1);
  }

  /** Solves the coset table */
  solve(MAX_ITER = 100_000) {
    if (!this._isSolved) {
      this._hlt(MAX_ITER);
      this._compress();
      this._isSolved = true;
    }
  }

  /** Get an entry from the coset table */
  getEntry(coset: number, gen: number) {
    return this._table[coset][gen];
  }

  /** Get the number of cosets */
  get length() {
    return this._table.length;
  }

  /** Returns the coset obtained by applying `word` to `coset` */
  applyWord(coset: number, word: string) {
    let result = coset;
    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      const g = this._char2int.get(c);
      if (g === undefined) {
        throw new Error(`Invalid generator ${c} in word ${word}`);
      }
      const next = this._table[result][g];
      if (next === undefined) {
        throw new Error(`Error applying ${word} to coset ${coset}, is the coset table solved?`);
      }
      result = next;
    }
    return result;
  }

  /**
   * Returns the representative words for each coset. These are in the same
   * order as the cosets, so `r[i]` is the representative for coset `i`.
   */
  getRepresentatives() {
    const result = [[]] as number[][];
    const q = [0];
    while (q.length > 0) {
      const coset = q.shift()!;
      for (let g = 0; g < this._genCount; this._isCoxeter ? g++ : (g += 2)) {
        const next = this._table[coset][g];
        if (next === undefined) {
          throw new Error(`Found empty entry, is the coset table solved?`);
        }
        if (result[next] === undefined) {
          result[next] = result[coset].concat(g);
          q.push(next);
        }
      }
    }
    return result.map((word) => word.map((g) => this._alphabet[g]).join(''));
  }
}

export default CosetTable;
