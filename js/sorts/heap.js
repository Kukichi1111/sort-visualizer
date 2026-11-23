function* heapify(t, n, i) {
  const A = t.A;
  let largestIdx = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  t.setPointer('i', i);
  if (left < n) {
    yield t.compare(left, largestIdx);
    if (A[left] > A[largestIdx]) largestIdx = left;
  }
  if (right < n) {
    yield t.compare(right, largestIdx);
    if (A[right] > A[largestIdx]) largestIdx = right;
  }

  if (largestIdx !== i) {
    yield t.swap(i, largestIdx);
    yield* heapify(t, n, largestIdx);
  }
}

function* buildHeap(t, n) {
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    yield* heapify(t, n, i);
  }
}

export function* heapSort(t) {
  const n = t.A.length;
  t.setPhase('build heap');
  t.setRange(0, n - 1);
  yield* buildHeap(t, n);

  t.setPhase('extract');
  for (let nn = n - 1; nn > 0; nn--) {
    yield t.swap(0, nn);
    t.markSorted(nn, nn);
    t.setRange(0, nn - 1);
    yield* heapify(t, nn, 0);
  }
}
