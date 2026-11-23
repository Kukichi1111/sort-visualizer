// ソートの操作を記録しつつ実際の配列も更新する。
// ソート側は「1ステップ」の操作(compare / swap / copy)を呼んだ直後に yield し、
// 表示用の情報(range / pivot / pointer / sorted / phase)は yield せずに更新する。

// マーク種別（大きいほど優先して表示）
export const MARK_CMP = 1;
export const MARK_READ = 2;
export const MARK_WRITE = 3;
export const MARK_SWAP = 4;

export class Tracer {
  constructor(input) {
    const n = input.length;
    this.n = n;
    this.A = Int32Array.from(input);
    this.maxV = 1;
    for (let i = 0; i < n; i++) if (this.A[i] > this.maxV) this.maxV = this.A[i];

    // 'A' がメイン配列。'L' 'R' 'v' などの補助配列は alloc で追加される
    this.bufs = { A: this.A };
    this.offsets = { A: 0 };  // 補助配列を A のどの位置の下に描くか
    this.marks = { A: new Uint8Array(n) };

    this.sorted = new Uint8Array(n);
    this.range = null;          // [lo, hi]
    this.pivot = -1;
    this.pointers = new Map();  // 変数名 -> { buf, i }
    this.phase = '';

    this.cmp = 0;
    this.swaps = 0;
    this.writes = 0;
    this.temps = 0;  // 一時変数への退避・書き戻し（挿入ソートの v）

    // 直前のステップ（オブジェクトは使い回す）
    this.last = { type: '', aBuf: '', ai: -1, bBuf: '', bi: -1 };
    this.done = false;
  }

  get steps() {
    return this.cmp + this.swaps + this.writes + this.temps;
  }

  _mark(buf, i, v) {
    const m = this.marks[buf];
    if (m[i] < v) m[i] = v;
  }

  _setLast(type, aBuf, ai, bBuf, bi) {
    const l = this.last;
    l.type = type; l.aBuf = aBuf; l.ai = ai; l.bBuf = bBuf; l.bi = bi;
  }

  // ---- 1ステップの操作 ----

  compare(i, j) {
    this.compareBuf('A', i, 'A', j);
  }

  compareBuf(aBuf, ai, bBuf, bi) {
    this.cmp++;
    this._mark(aBuf, ai, MARK_CMP);
    this._mark(bBuf, bi, MARK_CMP);
    this._setLast('compare', aBuf, ai, bBuf, bi);
  }

  swap(i, j) {
    const A = this.A;
    const t = A[i]; A[i] = A[j]; A[j] = t;
    this.swaps++;
    this._mark('A', i, MARK_SWAP);
    this._mark('A', j, MARK_SWAP);
    this._setLast('swap', 'A', i, 'A', j);
  }

  // dst[di] = src[si]
  copy(dBuf, di, sBuf, si) {
    this.writes++;
    this._copy(dBuf, di, sBuf, si);
  }

  // copy と同じだが「退避」として別に数える
  save(dBuf, di, sBuf, si) {
    this.temps++;
    this._copy(dBuf, di, sBuf, si);
  }

  _copy(dBuf, di, sBuf, si) {
    this.bufs[dBuf][di] = this.bufs[sBuf][si];
    this._mark(sBuf, si, MARK_READ);
    this._mark(dBuf, di, MARK_WRITE);
    this._setLast('write', dBuf, di, sBuf, si);
  }

  // ---- 補助配列 ----

  alloc(name, size, offset) {
    const b = new Int32Array(size);
    this.bufs[name] = b;
    this.offsets[name] = offset;
    this.marks[name] = new Uint8Array(size);
    return b;
  }

  free(name) {
    delete this.bufs[name];
    delete this.offsets[name];
    delete this.marks[name];
    for (const [k, p] of this.pointers) if (p.buf === name) this.pointers.delete(k);
  }

  // ---- 表示用の情報（ステップを消費しない） ----

  setRange(lo, hi) {
    if (this.range) { this.range[0] = lo; this.range[1] = hi; }
    else this.range = [lo, hi];
  }

  setPivot(i) {
    this.pivot = i;
  }

  setPointer(name, i, buf = 'A') {
    const p = this.pointers.get(name);
    if (p) { p.i = i; p.buf = buf; }
    else this.pointers.set(name, { buf, i });
  }

  clearPointers() {
    this.pointers.clear();
  }

  markSorted(lo, hi) {
    this.sorted.fill(1, lo, hi + 1);
  }

  setPhase(s) {
    this.phase = s;
  }

  // 1フレーム分のマークを消す（ステップが進むフレームの最初に呼ぶ）
  beginFrame() {
    for (const k in this.marks) this.marks[k].fill(0);
  }

  finish() {
    this.done = true;
    this.sorted.fill(1);
    this.range = null;
    this.pivot = -1;
    this.pointers.clear();
    this.phase = '';
    this.last.type = '';
    for (const k of Object.keys(this.bufs)) if (k !== 'A') this.free(k);
    this.beginFrame();
  }
}
