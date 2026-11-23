import { Tracer } from './tracer.js';
import { Renderer } from './renderer.js';
import { mulberry32 } from './rng.js';

const SORT_STATS = (def) => `
  <span>比較 <b data-k="cmp">0</b></span>
  <span>交換 <b data-k="swaps">0</b></span>
  <span>代入 <b data-k="writes">0</b></span>
  ${def.temps ? '<span>退避・書き戻し <b data-k="temps">0</b></span>' : ''}
  <span>計 <b data-k="steps">0</b></span>`;

// ソート1つ分の表示（DOM + Tracer + ジェネレータ + Renderer）
// def.input が true なら、ソートせずに初期配列を表示するだけのパネルになる
export class Panel {
  constructor(def, container) {
    this.def = def;
    const el = document.createElement('section');
    el.className = 'panel';
    el.innerHTML = `
      <header>
        <h2></h2>
        <span class="phase"></span>
        <span class="state"></span>
      </header>
      <canvas></canvas>
      <footer>
        ${def.input ? '<span>n <b data-k="n">0</b></span>' : SORT_STATS(def)}
      </footer>`;
    el.querySelector('h2').textContent = def.name;
    container.appendChild(el);

    this.el = el;
    this.phaseEl = el.querySelector('.phase');
    this.stateEl = el.querySelector('.state');
    this.statEls = [...el.querySelectorAll('b[data-k]')];
    this.renderer = new Renderer(el.querySelector('canvas'), !!def.usesAux);
  }

  reset(input, seed) {
    this.tracer = new Tracer(input);
    this.dirty = true;
    if (this.def.input) {
      this.gen = null;
      this.done = true;  // 再生対象にしない
      return;
    }
    this.gen = this.def.fn(this.tracer, mulberry32(seed ^ 0x9e3779b9));
    this.done = false;
  }

  // 最大 c ステップ進める
  advance(c) {
    const g = this.gen;
    for (let k = 0; k < c; k++) {
      if (g.next().done) {
        this.tracer.finish();
        this.done = true;
        break;
      }
    }
    this.dirty = true;
  }

  // phase: 次のステップまでの進み具合 (0..1)。アニメーションしないときは 1
  render(phase) {
    const t = this.tracer;
    const animating = phase < 1 && t.last.type === 'swap';
    if (!this.dirty && !animating) return;
    this.renderer.draw(t, phase);
    for (const b of this.statEls) b.textContent = t[b.dataset.k].toLocaleString();
    this.phaseEl.textContent = t.phase;
    const finished = this.done && !this.def.input;
    this.stateEl.textContent = finished ? '完了' : '';
    this.el.classList.toggle('done', finished);
    this.dirty = false;
  }
}
