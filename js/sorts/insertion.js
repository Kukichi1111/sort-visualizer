// 退避する変数 v を長さ1の補助配列 'v' として扱い、A[i] の下に表示する
export function* insertionSort(t) {
  const A = t.A, n = A.length;
  for (let i = 1; i < n; i++) {
    t.setRange(0, i);
    const V = t.alloc('v', 1, i);
    yield t.save('v', 0, 'A', i);
    let j = i - 1;
    while (j >= 0) {
      t.setPointer('j', j);
      yield t.compareBuf('A', j, 'v', 0);
      if (!(A[j] > V[0])) break;
      yield t.copy('A', j + 1, 'A', j);
      j--;
    }
    yield t.save('A', j + 1, 'v', 0);
    t.free('v');
  }
}
