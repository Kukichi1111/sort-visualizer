export function* mergeSort(t) {
  yield* sort(t, 0, t.A.length - 1);
}

function* sort(t, left, right) {
  if (left >= right) return;
  const mid = (left + right) >> 1;
  yield* sort(t, left, mid);
  yield* sort(t, mid + 1, right);

  yield* merge(t, left, mid, right);
}

function* merge(t, left, mid, right) {
  const A = t.A;
  const n1 = mid - left + 1;
  const n2 = right - mid;
  t.setRange(left, right);

  const L = t.alloc('L', n1, left);
  const R = t.alloc('R', n2, mid + 1);

  for (let i = 0; i < n1; i++) yield t.copy('L', i, 'A', left + i);
  for (let i = 0; i < n2; i++) yield t.copy('R', i, 'A', mid + i + 1);

  let l = 0, r = 0, idx = left;

  while (l < n1 && r < n2) {
    t.setPointer('l', l, 'L');
    t.setPointer('r', r, 'R');
    t.setPointer('k', idx);
    yield t.compareBuf('L', l, 'R', r);
    if (L[l] <= R[r]) {
      yield t.copy('A', idx, 'L', l);
      l++;
    } else {
      yield t.copy('A', idx, 'R', r);
      r++;
    }
    idx++;
  }

  while (l < n1) {
    t.setPointer('l', l, 'L');
    t.setPointer('k', idx);
    yield t.copy('A', idx, 'L', l);
    l++;
    idx++;
  }

  while (r < n2) {
    t.setPointer('r', r, 'R');
    t.setPointer('k', idx);
    yield t.copy('A', idx, 'R', r);
    r++;
    idx++;
  }

  t.free('L');
  t.free('R');
  t.clearPointers();
}
