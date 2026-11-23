import { SORTS } from './sorts/index.js';
import { INPUT_KINDS, makeInput } from './input.js';
import { Panel } from './panel.js';
import { Player } from './player.js';

const $ = (id) => document.getElementById(id);
const playBtn = $('play');
const resetBtn = $('reset');
const speedIn = $('speed');
const speedOut = $('speedOut');
const nIn = $('n');
const kindIn = $('kind');
const seedIn = $('seed');
const reseedBtn = $('reseed');
const recommendBtn = $('recommend');
const boostIn = $('boost');

for (const k of INPUT_KINDS) kindIn.add(new Option(k.label, k.id));

const grid = $('grid');
const panels = [{ name: '初期配列', input: true }, ...SORTS].map((def) => new Panel(def, grid));
const player = new Player(panels, { onStop: updatePlayButton, onBoost: showSpeed });

// 速度スライダー: 0..70 を 10^(v/10) step/s に、最大値は MAX
const SPEED_MAX_POS = Number(speedIn.max);
function applySpeed() {
  const v = Number(speedIn.value);
  player.max = v >= SPEED_MAX_POS;
  player.speed = Math.round(10 ** (v / 10));
  showSpeed();
}

function showSpeed() {
  if (player.max) {
    speedOut.textContent = 'MAX';
    return;
  }
  const s = Math.round(player.effectiveSpeed).toLocaleString();
  speedOut.textContent = player.boost > 1
    ? `${s} step/s（×${Math.round(player.boost).toLocaleString()} 加速中）`
    : `${s} step/s`;
}

// おすすめ速度: O(n log n) のソート（約 3·n·log2(n) ステップ）が約20秒で終わる速さ
const RECOMMEND_SEC = 20;
function setRecommendedSpeed() {
  const n = Number(nIn.value);
  const speed = (3 * n * Math.log2(n)) / RECOMMEND_SEC;
  speedIn.value = Math.min(SPEED_MAX_POS - 1, Math.max(0, Math.round(10 * Math.log10(speed))));
  applySpeed();
}

function updatePlayButton() {
  playBtn.textContent = player.running ? '❚❚ 一時停止' : '▶ 再生';
}

function reset() {
  let n = Math.round(Number(nIn.value)) || 64;
  n = Math.min(10000, Math.max(8, n));
  nIn.value = n;
  const seed = Math.round(Number(seedIn.value)) || 0;
  const input = makeInput(n, kindIn.value, seed);
  for (const p of panels) p.reset(input, seed);
  player.pause();
  player.resetBoost();
  showSpeed();
  updatePlayButton();
}

playBtn.addEventListener('click', () => {
  if (player.running) player.pause();
  else {
    if (player.allDone) reset();
    player.play();
  }
  updatePlayButton();
});
resetBtn.addEventListener('click', reset);
speedIn.addEventListener('input', applySpeed);
recommendBtn.addEventListener('click', setRecommendedSpeed);
boostIn.addEventListener('change', () => {
  player.autoBoost = boostIn.checked;
  if (!boostIn.checked) player.resetBoost();
  showSpeed();
});
nIn.addEventListener('change', () => {
  reset();
  setRecommendedSpeed();
});
kindIn.addEventListener('change', reset);
seedIn.addEventListener('change', reset);
reseedBtn.addEventListener('click', () => {
  seedIn.value = Math.floor(Math.random() * 100000);
  reset();
});

new ResizeObserver(() => {
  for (const p of panels) p.dirty = true;
}).observe(grid);

reset();
setRecommendedSpeed();
