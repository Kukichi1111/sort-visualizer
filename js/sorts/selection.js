export function* selectionSort(t) {
  const A = t.A, n = A.length;
  for (let pass = 0; pass < n - 1; pass++) {
    let minI = pass;
    t.setPointer('min', minI);
    for (let i = pass + 1; i < n; i++) {
      t.setPointer('i', i);
      yield t.compare(minI, i);
      if (A[minI] > A[i]) {
        minI = i;
        t.setPointer('min', minI);
      }
    }
    if (minI !== pass) yield t.swap(pass, minI);
    t.markSorted(pass, pass);
  }
}
