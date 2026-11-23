import { randInt } from '../rng.js';

// C版は再帰だが、重複が多い入力では再帰が n 近くまで深くなり、
// yield* の連鎖が深いほど1ステップが重くなるので、明示的なスタックで同じ順に処理する
export function* quickSort(t, rng) {
  const stack = [[0, t.A.length - 1]];
  while (stack.length > 0) {
    const [left, right] = stack.pop();
    if (left >= right) {
      if (left === right) t.markSorted(left, left);
      continue;
    }

    const pivotIdx = yield* partition(t, rng, left, right);
    t.markSorted(pivotIdx, pivotIdx);

    // 左側を先に処理するため右側から積む
    stack.push([pivotIdx + 1, right]);
    stack.push([left, pivotIdx - 1]);
  }
}

function* partition(t, rng, left, right) {
  const A = t.A;
  t.setRange(left, right);

  const pivot = (left + right) >> 1;//randInt(rng, right - left + 1) + left;
  yield t.swap(pivot, right);  // pivotを末尾に
  t.setPivot(right);
  let l = left, r = right - 1;
  t.setPointer('l', l);
  t.setPointer('r', r);

  while (l <= r) {
    while (l < right) {
      yield t.compare(l, right);
      if (!(A[l] <= A[right])) break;
      l++;
      t.setPointer('l', l);
    }
    while (l <= r) {
      yield t.compare(r, right);
      if (!(A[r] > A[right])) break;
      r--;
      t.setPointer('r', r);
    }

    if (l < r) yield t.swap(l, r);
  }

  t.clearPointers();
  t.setPivot(-1);
  if (l < right) {
    yield t.swap(l, right);
    return l;
  }
  return right;
}
