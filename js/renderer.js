import { MARK_CMP, MARK_READ, MARK_WRITE, MARK_SWAP } from './tracer.js';

// n がこれ以下なら棒グラフ + ラベル + 矢印の詳細モード、超えたら点プロットの俯瞰モード
export const DETAIL_MAX = 100;

const C = {
  bg: '#15171c',
  rangeBg: '#212634',
  bar: '#8a93a6',
  dim: '#4a5060',
  aux: '#c9a46a',
  sorted: '#4f8fd8',
  pivot: '#bb6bd9',
  pointer: '#e6e6e6',
  pointerLine: '#5a6275',
  arrow: '#3ecf8e',
  separator: '#2c3240',
};

const MARK_COLOR = [];
MARK_COLOR[MARK_CMP] = '#f2c94c';
MARK_COLOR[MARK_READ] = '#56ccf2';
MARK_COLOR[MARK_WRITE] = '#3ecf8e';
MARK_COLOR[MARK_SWAP] = '#eb5757';

// ImageData 用（リトルエンディアンの ABGR）
function toU32(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
const U = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, toU32(v)]));
const MARK_U = MARK_COLOR.map((c) => c && toU32(c));

const LABEL_H = 14;

export class Renderer {
  constructor(canvas, usesAux) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.usesAux = usesAux;
    this.img = null;
    this.px = null;
  }

  draw(t, phase) {
    if (t.n <= DETAIL_MAX) this._detail(t, phase);
    else this._overview(t);
  }

  _fit(dpr) {
    const c = this.canvas;
    this.w = c.clientWidth;
    this.h = c.clientHeight;
    this.dpr = dpr;
    const pw = Math.max(1, Math.round(this.w * dpr));
    const ph = Math.max(1, Math.round(this.h * dpr));
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
      this.img = null;
    }
  }

  _layout(labels) {
    const lab = labels ? LABEL_H : 0;
    const top = 6;
    if (!this.usesAux) {
      return { mainTop: top, mainBottom: this.h - lab - 2, auxTop: 0, auxBottom: 0 };
    }
    const auxH = Math.round((this.h - 2 * lab) * 0.28);
    const mainBottom = this.h - 2 * lab - auxH - 8;
    const auxTop = mainBottom + lab + 6;
    return { mainTop: top, mainBottom, auxTop, auxBottom: auxTop + auxH };
  }

  _colorA(t, i) {
    const m = t.marks.A[i];
    if (m) return MARK_COLOR[m];
    if (i === t.pivot) return C.pivot;
    if (t.sorted[i]) return C.sorted;
    if (t.range && (i < t.range[0] || i > t.range[1])) return C.dim;
    return C.bar;
  }

  // ---- 詳細モード（棒グラフ） ----

  _detail(t, phase) {
    this._fit(window.devicePixelRatio || 1);
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const L = this._layout(true);
    const n = t.n, A = t.A, bw = w / n, gap = bw > 4 ? 1 : 0;
    const mainH = L.mainBottom - L.mainTop;
    const auxH = L.auxBottom - L.auxTop;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    if (t.range) {
      ctx.fillStyle = C.rangeBg;
      ctx.fillRect(t.range[0] * bw, 0, (t.range[1] - t.range[0] + 1) * bw, L.mainBottom);
    }

    // swap は低速時に2本が入れ替わるアニメーションにする（配列は交換済み）
    let si = -1, sj = -1, p = 1;
    if (phase < 1 && t.last.type === 'swap') {
      si = t.last.ai;
      sj = t.last.bi;
      const q = Math.min(1, phase / 0.6);
      p = q * q * (3 - 2 * q);
    }

    for (let i = 0; i < n; i++) {
      let x = i;
      if (i === si) x = sj + (si - sj) * p;
      else if (i === sj) x = si + (sj - si) * p;
      const bh = Math.max(1, (A[i] / t.maxV) * mainH);
      ctx.fillStyle = this._colorA(t, i);
      ctx.fillRect(x * bw + gap / 2, L.mainBottom - bh, bw - gap, bh);
    }

    if (this.usesAux) {
      ctx.fillStyle = C.separator;
      ctx.fillRect(0, L.auxTop - 3, w, 1);
      for (const name in t.bufs) {
        if (name === 'A') continue;
        const b = t.bufs[name], off = t.offsets[name], m = t.marks[name];
        for (let k = 0; k < b.length; k++) {
          if (b[k] === 0) continue;  // まだコピーされていない
          const bh = Math.max(1, (b[k] / t.maxV) * auxH);
          ctx.fillStyle = m[k] ? MARK_COLOR[m[k]] : C.aux;
          ctx.fillRect((off + k) * bw + gap / 2, L.auxBottom - bh, bw - gap, bh);
        }
        ctx.fillStyle = C.pointerLine;
        ctx.font = '10px sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(name, off * bw + 2, L.auxTop - 1);
      }
    }

    this._arrow(t, L, bw, mainH, auxH);
    this._labels(t, L, bw);
  }

  _top(t, L, bw, mainH, auxH, buf, i) {
    const b = t.bufs[buf];
    const x = (t.offsets[buf] + i + 0.5) * bw;
    if (buf === 'A') return [x, L.mainBottom - (b[i] / t.maxV) * mainH];
    return [x, L.auxBottom - (b[i] / t.maxV) * auxH];
  }

  // 代入: コピー元 → コピー先の矢印
  _arrow(t, L, bw, mainH, auxH) {
    const e = t.last;
    if (e.type !== 'write' || !t.bufs[e.aBuf] || !t.bufs[e.bBuf]) return;
    const [x1, y1] = this._top(t, L, bw, mainH, auxH, e.bBuf, e.bi);
    const [x2, y2] = this._top(t, L, bw, mainH, auxH, e.aBuf, e.ai);
    const cx = (x1 + x2) / 2;
    const cy = Math.max(2, Math.min(y1, y2) - 24);
    const { ctx } = this;
    ctx.strokeStyle = C.arrow;
    ctx.fillStyle = C.arrow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
    const ang = Math.atan2(y2 - cy, x2 - cx);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 7 * Math.cos(ang - 0.4), y2 - 7 * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - 7 * Math.cos(ang + 0.4), y2 - 7 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  // 変数名ラベル（同じ位置の変数はまとめる）
  _labels(t, L, bw) {
    const groups = new Map();
    for (const [name, p] of t.pointers) {
      const b = t.bufs[p.buf];
      if (!b || p.i < 0 || p.i >= b.length) continue;
      const key = p.buf + ':' + p.i;
      const g = groups.get(key);
      if (g) g.names.push(name);
      else groups.set(key, { buf: p.buf, i: p.i, names: [name] });
    }
    const { ctx } = this;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.pointer;
    for (const g of groups.values()) {
      const x = (t.offsets[g.buf] + g.i + 0.5) * bw;
      const y = (g.buf === 'A' ? L.mainBottom : L.auxBottom) + 2;
      ctx.fillText(g.names.join(','), x, y);
    }
    ctx.textAlign = 'start';
  }

  // ---- 俯瞰モード（点プロット、ImageData に直接書く） ----

  _overview(t) {
    this._fit(1);
    const W = this.canvas.width, H = this.canvas.height;
    if (!this.img) {
      this.img = this.ctx.createImageData(W, H);
      this.px = new Uint32Array(this.img.data.buffer);
    }
    const px = this.px;
    px.fill(U.bg);
    this.h = H;
    const L = this._layout(false);
    const cw = W / t.n;

    if (t.range) {
      const x0 = Math.floor(t.range[0] * cw);
      const x1 = Math.max(x0 + 1, Math.floor((t.range[1] + 1) * cw));
      for (let y = 0; y < L.mainBottom; y++) px.fill(U.rangeBg, y * W + x0, y * W + x1);
    }
    for (const p of t.pointers.values()) {
      if (!t.bufs[p.buf]) continue;
      const i = t.offsets[p.buf] + p.i;
      if (i < 0 || i >= t.n) continue;
      const [top, bottom] = p.buf === 'A' ? [L.mainTop, L.mainBottom] : [L.auxTop, L.auxBottom];
      this._vline(Math.floor(i * cw), top, bottom, U.pointerLine);
    }
    if (t.pivot >= 0) this._vline(Math.floor((t.pivot + 0.5) * cw), L.mainTop, L.mainBottom, U.pivot);

    this._plot(t, 'A', L.mainTop, L.mainBottom);
    if (this.usesAux) {
      px.fill(U.separator, (L.auxTop - 3) * W, (L.auxTop - 2) * W);
      for (const name in t.bufs) if (name !== 'A') this._plot(t, name, L.auxTop, L.auxBottom);
    }
    this.ctx.putImageData(this.img, 0, 0);
  }

  _vline(x, top, bottom, color) {
    const W = this.canvas.width, px = this.px;
    for (let y = top; y < bottom; y++) px[y * W + x] = color;
  }

  _plot(t, buf, top, bottom) {
    const W = this.canvas.width, px = this.px;
    const arr = t.bufs[buf], off = t.offsets[buf], m = t.marks[buf];
    const isA = buf === 'A';
    const cw = W / t.n;
    const span = bottom - top - 1;
    const base = Math.max(3, Math.min(3, Math.floor(cw)));
    const range = t.range;

    for (let k = 0; k < arr.length; k++) {
      const v = arr[k];
      if (v === 0) continue;
      const i = off + k;
      const mk = m[k];
      let color, size = base;
      if (mk) {
        color = MARK_U[mk];
        size = Math.max(base, 3);
      } else if (!isA) color = U.aux;
      else if (i === t.pivot) color = U.pivot;
      else if (t.sorted[i]) color = U.sorted;
      else if (range && (i < range[0] || i > range[1])) color = U.dim;
      else color = U.bar;

      const x0 = Math.floor(i * cw);
      const x1 = Math.min(W, x0 + size);
      const y0 = bottom - 1 - Math.round((v / t.maxV) * span);
      const y1 = Math.min(bottom, y0 + size);
      for (let y = y0; y < y1; y++) px.fill(color, y * W + x0, y * W + x1);
    }
  }
}
