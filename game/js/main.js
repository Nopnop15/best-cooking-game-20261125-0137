// Warung Kilat — game loop, input, screens, and the deterministic
// ?shot= states used for the entry screenshots.

import { DISHES } from './recipes.js';
import { createAudio } from './audio.js';
import { createKitchen, interact, updateKitchen, nearestStation } from './kitchen.js';
import { createOrders, spawnOrder, updateOrders, findMatchingOrder, orderScore } from './orders.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();

const DAY_SECONDS = 150;
const COOK_SPEED = 230;

function newState() {
  return {
    screen: 'title',
    time: 0,
    dayTime: DAY_SECONDS,
    dayLeft: DAY_SECONDS,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    best: Number(localStorage.getItem('warung-kilat-best') || 0),
    cook: { x: 480, y: 470, tx: null, ty: null },
    hand: [],
    plateCarried: null,
    kitchen: createKitchen(),
    orders: createOrders(),
    message: '',
    messageT: 0,
    shot: null,
  };
}

let state = newState();
const keys = new Set();
let mouseTarget = null;

function say(text) {
  state.message = text;
  state.messageT = 3;
}

function startDay() {
  state = newState();
  state.screen = 'playing';
  spawnOrder(state.orders, 0);
  spawnOrder(state.orders, 0);
  state.orders.spawnTimer = 9;
  audio.unlock();
  audio.click();
}

function gameOver() {
  state.screen = 'over';
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('warung-kilat-best', String(state.best));
  }
  audio.gameOver();
}

function servePlate() {
  const plate = state.plateCarried;
  const order = findMatchingOrder(state.orders, plate.items);
  if (!order) {
    audio.error();
    say('Piring ini belum sesuai pesanan!');
    return;
  }
  state.orders.list = state.orders.list.filter((o) => o.id !== order.id);
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const { points, coins, timeBonus } = orderScore(order, state.combo);
  state.score += points;
  state.coins += coins;
  state.served += 1;
  state.plateCarried = null;
  audio.serve();
  say(`Disajikan! +${points} (${DISHES[order.dishId].name}, bonus waktu +${timeBonus})`);
}

// ---- Input ---------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  audio.unlock();
  if (state.screen === 'title' && (k === 'enter' || k === ' ')) { startDay(); return; }
  if (state.screen === 'over' && k === 'r') { startDay(); return; }
  if (k === 'p' && (state.screen === 'playing' || state.screen === 'paused')) {
    state.screen = state.screen === 'playing' ? 'paused' : 'playing';
    audio.click();
    return;
  }
  if (k === 'm') { say(audio.toggleMute() ? 'Suara mati' : 'Suara hidup'); return; }
  if (state.screen === 'playing' && k === 'e') {
    const ev = interact(state, audio);
    if (ev && ev.type === 'serve') servePlate();
    else if (ev && ev.type === 'message') say(ev.text);
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (state.screen === 'title') { startDay(); return; }
  if (state.screen === 'over') { startDay(); return; }
  if (state.screen !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const near = nearestStation(state.cook);
  // A click on the station the cook already stands at acts like E.
  if (near && x >= near.x - 6 && x <= near.x + near.w + 6 && y >= near.y - 6 && y <= near.y + near.h + 40) {
    const ev = interact(state, audio);
    if (ev && ev.type === 'serve') servePlate();
    else if (ev && ev.type === 'message') say(ev.text);
    return;
  }
  mouseTarget = { x, y };
});

// ---- Update --------------------------------------------------------------
function update(dt) {
  state.time += dt;
  if (state.messageT > 0) state.messageT -= dt;

  // Movement: keys win over a mouse target.
  const c = state.cook;
  let dx = 0;
  let dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (dx || dy) {
    mouseTarget = null;
    const len = Math.hypot(dx, dy);
    c.x += (dx / len) * COOK_SPEED * dt;
    c.y += (dy / len) * COOK_SPEED * dt;
  } else if (mouseTarget) {
    const d = Math.hypot(mouseTarget.x - c.x, mouseTarget.y - c.y);
    if (d < 6) {
      mouseTarget = null;
    } else {
      c.x += ((mouseTarget.x - c.x) / d) * COOK_SPEED * dt;
      c.y += ((mouseTarget.y - c.y) / d) * COOK_SPEED * dt;
    }
  }
  c.x = Math.max(24, Math.min(936, c.x));
  c.y = Math.max(168, Math.min(576, c.y));

  if (state.screen !== 'playing') return;

  state.dayLeft -= dt;
  if (state.dayLeft <= 0) {
    state.dayLeft = 0;
    gameOver();
    return;
  }
  const holdingChop = keys.has(' ');
  updateKitchen(state.kitchen, dt, c, holdingChop, audio);
  const expired = updateOrders(state.orders, dt, state.dayTime - state.dayLeft);
  for (const o of expired) {
    state.combo = 0;
    state.missed += 1;
    state.score = Math.max(0, state.score - 50);
    audio.missed();
    say(`Pesanan ${DISHES[o.dishId].name} hangus! -50`);
  }
}

// ---- Deterministic screenshot states -------------------------------------
// ?shot=start|play|serve freezes a staged scene so screenshots are stable.
function setupShot(name) {
  state.shot = name;
  state.screen = name === 'start' ? 'title' : 'playing';
  const k = state.kitchen;
  if (name === 'start') {
    spawnOrder(state.orders, 0);
    spawnOrder(state.orders, 0);
    state.cook.x = 480;
    state.cook.y = 470;
    return;
  }
  if (name === 'play') {
    state.score = 250;
    state.coins = 35;
    state.combo = 2;
    state.served = 2;
    state.dayLeft = 96;
    spawnOrder(state.orders, 40);
    spawnOrder(state.orders, 40);
    spawnOrder(state.orders, 40);
    state.orders.list[0].timeLeft = 28;
    state.orders.list[1].timeLeft = 41;
    state.orders.list[2].timeLeft = 18;
    state.cook.x = 640;
    state.cook.y = 300;
    state.hand = [{ type: 'bawang', prep: 'chopped' }];
    k.board.item = { type: 'ayam', prep: 'raw' };
    k.board.progress = 0.6;
    k.woks[0].item = { type: 'mie', prep: 'raw' };
    k.woks[0].progress = 0.55;
    k.woks[1].item = null;
    k.plateOnCounter.items = [
      { type: 'nasi', prep: 'cooked' },
      { type: 'telur', prep: 'cooked' },
    ];
    say('Wajan jalan, ayam dicincang…');
    state.messageT = 99;
    return;
  }
  if (name === 'serve') {
    state.score = 480;
    state.coins = 62;
    state.combo = 3;
    state.bestCombo = 3;
    state.served = 4;
    state.dayLeft = 74;
    spawnOrder(state.orders, 60);
    spawnOrder(state.orders, 60);
    const first = state.orders.list[0];
    first.dishId = 'nasiGoreng';
    first.timeLeft = 22;
    state.orders.list[1].timeLeft = 35;
    state.cook.x = 800;
    state.cook.y = 400;
    state.plateCarried = {
      items: [
        { type: 'nasi', prep: 'cooked' },
        { type: 'telur', prep: 'cooked' },
        { type: 'bawang', prep: 'chopped' },
      ],
    };
    k.woks[0].item = { type: 'nasi', prep: 'cooked' };
    k.woks[0].done = true;
    k.woks[0].progress = 1;
    say('Nasi Goreng siap! Antar ke Meja Saji — E');
    state.messageT = 99;
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot === 'start' || shot === 'play' || shot === 'serve') setupShot(shot);

// ---- Loop ----------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.shot) update(dt);
  else state.time += dt;
  render(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
