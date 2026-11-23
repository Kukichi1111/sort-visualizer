import { mulberry32, randInt } from './rng.js';

export const INPUT_KINDS = [
  { id: 'random', label: 'ランダム' },
  { id: 'sorted', label: '昇順' },
  { id: 'reversed', label: '逆順' },
  { id: 'nearly', label: 'ほぼ整列済み' },
  { id: 'few', label: '重複が多い' },
];

// 値は 1..n の範囲に収める（描画時の高さ計算を単純にするため）
export function makeInput(n, kind, seed) {
  const rng = mulberry32(seed);
  const a = new Int32Array(n);
  for (let i = 0; i < n; i++) a[i] = i + 1;

  switch (kind) {
    case 'random':
      // Fisher-Yates
      for (let i = n - 1; i > 0; i--) {
        const j = randInt(rng, i + 1);
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      break;
    case 'sorted':
      break;
    case 'reversed':
      for (let i = 0; i < n; i++) a[i] = n - i;
      break;
    case 'nearly': {
      // 近くの要素同士を少しだけ入れ替える
      const swaps = Math.max(1, Math.floor(n / 20));
      const win = Math.max(2, Math.floor(n / 50));
      for (let k = 0; k < swaps; k++) {
        const i = randInt(rng, n);
        const j = Math.min(n - 1, i + 1 + randInt(rng, win));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      break;
    }
    case 'few': {
      const levels = 8;
      for (let i = 0; i < n; i++) {
        a[i] = Math.max(1, Math.round(((randInt(rng, levels) + 1) * n) / levels));
      }
      break;
    }
  }
  return a;
}
