// 全パネルを同じステップ数ずつ進める再生ループ
const BUDGET_MS = 12;   // 1フレームで計算に使う時間の上限
const CHUNK = 4096;     // 時間チェックの間隔（ステップ）
const ANIM_MAX_SPEED = 40;  // これ未満の速度なら swap をアニメーションする
const BOOST_CAP = 1e7;      // 自動加速で到達する最大速度 (step/s)

export class Player {
  // onStop: 全部終わったとき、onBoost: 加速倍率が変わったとき
  constructor(panels, { onStop, onBoost }) {
    this.panels = panels;
    this.onStop = onStop;
    this.onBoost = onBoost;
    this.speed = 10;  // step/s（スライダーで決めた基本速度）
    this.max = false;
    this.autoBoost = true;
    this.running = false;
    this.acc = 0;
    this.lastTs = 0;
    this.resetBoost();
    requestAnimationFrame((ts) => this._loop(ts));
  }

  get allDone() {
    return this.panels.every((p) => p.done);
  }

  get fastDone() {
    return this.panels.every((p) => !p.def.fast || p.done);
  }

  get effectiveSpeed() {
    return Math.min(this.speed * this.boost, Math.max(this.speed, BOOST_CAP));
  }

  play() {
    this.running = true;
    this.acc = 0;
  }

  pause() {
    this.running = false;
  }

  resetBoost() {
    this.boost = 1;
    this.boostTime = 0;
  }

  // O(n log n) が全部終わったら、再生中の経過時間1秒ごとに速度を2倍にする
  _updateBoost(dt) {
    if (!this.autoBoost || this.max || !this.fastDone || this.allDone) return;
    const cap = Math.max(1, BOOST_CAP / this.speed);  // これ以上上げても速度は変わらない
    if (this.boost >= cap) return;
    this.boostTime += dt;
    const b = 2 ** this.boostTime;
    if (b !== this.boost) {
      this.boost = b;
      this.onBoost();
    }
  }

  _loop(ts) {
    const dt = this.lastTs ? Math.min(ts - this.lastTs, 100) / 1000 : 0;
    this.lastTs = ts;

    if (this.running) {
      this._updateBoost(dt);
      const active = this.panels.filter((p) => !p.done);
      let k;
      if (this.max) k = Infinity;
      else {
        this.acc += dt * this.effectiveSpeed;
        k = Math.floor(this.acc);
        this.acc -= k;
      }
      if (k > 0) {
        for (const p of active) p.tracer.beginFrame();
        this._advance(active, k);
      }
      if (this.allDone) {
        this.running = false;
        this.onStop();
      }
    }

    const animate = this.running && !this.max && this.effectiveSpeed < ANIM_MAX_SPEED;
    const phase = animate ? this.acc : 1;
    for (const p of this.panels) p.render(phase);
    requestAnimationFrame((t) => this._loop(t));
  }

  // 全パネルに同じ数ずつ配り、時間切れになったら残りは捨てる（同期は保たれる）
  _advance(active, k) {
    const deadline = performance.now() + BUDGET_MS;
    let remaining = k;
    while (remaining > 0) {
      const c = Math.min(remaining, CHUNK);
      let any = false;
      for (const p of active) {
        if (p.done) continue;
        p.advance(c);
        any = true;
      }
      remaining -= c;
      if (!any || performance.now() > deadline) break;
    }
  }
}
