export function* bubbleOptimized(t) {
  const A = t.A, n = A.length;
  for (let pass = 0; pass < n - 1; pass++) {
    let isSwapped = false;
    for (let i = 0; i + pass < n - 1; i++) {
      t.setPointer('i', i);
      yield t.compare(i, i + 1);
      if (A[i] > A[i + 1]) {
        isSwapped = true;
        yield t.swap(i, i + 1);
      }
    }
    t.markSorted(n - 1 - pass, n - 1 - pass);
    if (!isSwapped) break;
  }
}
