import { bubbleBasic } from './bubbleBasic.js';
import { bubbleOptimized } from './bubbleOptimized.js';
import { selectionSort } from './selection.js';
import { insertionSort } from './insertion.js';
import { mergeSort } from './merge.js';
import { quickSort } from './quick.js';
import { heapSort } from './heap.js';

// usesAux: 補助配列の段を描画するか
// fast: O(n log n) のソート。これが全部終わると自動加速が始まる
// temps: 退避・書き戻し（一時変数とのコピー）の回数を表示するか
export const SORTS = [
  { name: 'バブルソート（通常）', fn: bubbleBasic },
  { name: 'バブルソート（改良）', fn: bubbleOptimized },
  { name: '選択ソート', fn: selectionSort },
  { name: '挿入ソート', fn: insertionSort, usesAux: true, temps: true },
  { name: 'マージソート', fn: mergeSort, usesAux: true, fast: true },
  { name: 'クイックソート', fn: quickSort, fast: true },
  { name: 'ヒープソート', fn: heapSort, fast: true },
];
