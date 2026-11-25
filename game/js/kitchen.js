// Warung Kilat — the kitchen: stations, what E does at each, and the
// timers that run while food chops, cooks and brews.

import { INGREDIENTS, BIN_TYPES, BURN_AFTER_SECONDS } from './recipes.js';

export const STATIONS = [
  ...BIN_TYPES.map((type, i) => ({
    id: `bin-${type}`, kind: 'bin', type,
    label: INGREDIENTS[type].name, emoji: INGREDIENTS[type].emoji,
    x: 24 + i * 92, y: 170, w: 84, h: 62,
  })),
  { id: 'board', kind: 'board', label: 'Talenan', emoji: '🔪', x: 600, y: 170, w: 124, h: 62 },
  { id: 'wok', kind: 'wok', label: 'Wajan', emoji: '🍳', x: 748, y: 170, w: 188, h: 62 },
  { id: 'plate', kind: 'plate', label: 'Piring Saji', emoji: '🍽️', x: 24, y: 300, w: 276, h: 62 },
  { id: 'drink', kind: 'drink', label: 'Es Teh', emoji: '🧋', x: 324, y: 300, w: 128, h: 62 },
  { id: 'trash', kind: 'trash', label: 'Sampah', emoji: '🗑️', x: 476, y: 300, w: 104, h: 62 },
  { id: 'pass', kind: 'pass', label: 'Meja Saji', emoji: '🔔', x: 748, y: 300, w: 188, h: 62 },
];

for (const s of STATIONS) {
  s.cx = s.x + s.w / 2;
  s.cy = s.y + s.h / 2;
}

export function nearestStation(cook) {
  let best = null;
  let bestD = 110;
  for (const s of STATIONS) {
    const d = Math.hypot(cook.x - s.cx, cook.y - (s.y + s.h + 26));
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

export function canCook(item) {
  const ing = INGREDIENTS[item.type];
  if (!ing || ing.cook <= 0) return false;
  if (ing.chop && item.prep !== 'chopped') return false;
  return item.prep === 'raw' || item.prep === 'chopped';
}

export function createKitchen() {
  return {
    board: { item: null, progress: 0, chopTick: 0 },
    woks: [
      { item: null, progress: 0, done: false, burnt: 0, announced: false },
      { item: null, progress: 0, done: false, burnt: 0, announced: false },
    ],
    brew: { active: false, progress: 0, ready: false },
    plateOnCounter: { items: [] },
    plateCarried: null,
  };
}

// Runs every frame: wok cooking, brewing, and hold-to-chop.
export function updateKitchen(k, dt, cook, holdingChop, audio) {
  // Chopping: hold Space near the board while a raw item sits on it.
  const board = k.board;
  if (board.item && board.item.prep === 'raw' && INGREDIENTS[board.item.type].chop) {
    const near = Math.hypot(cook.x - 662, cook.y - 258) < 130;
    if (holdingChop && near) {
      board.progress += dt / 1.5;
      board.chopTick -= dt;
      if (board.chopTick <= 0) { audio.chop(); board.chopTick = 0.28; }
      if (board.progress >= 1) {
        board.item.prep = 'chopped';
        board.progress = 0;
        audio.chopDone();
      }
    }
  }
  // Woks cook on their own; a finished dish burns if left sitting.
  for (const w of k.woks) {
    if (!w.item) continue;
    if (!w.done) {
      w.progress += dt / INGREDIENTS[w.item.type].cook;
      if (w.progress >= 1) {
        w.progress = 1;
        w.done = true;
        w.item.prep = 'cooked';
        if (!w.announced) { w.announced = true; audio.cooked(); }
      }
    } else if (w.item.prep !== 'burnt') {
      w.burnt += dt;
      if (w.burnt >= BURN_AFTER_SECONDS) {
        w.item.prep = 'burnt';
        w.done = false;
      }
    }
  }
  // The tea brewer.
  if (k.brew.active && !k.brew.ready) {
    k.brew.progress += dt / 2.5;
    if (k.brew.progress >= 1) {
      k.brew.progress = 1;
      k.brew.ready = true;
      k.brew.active = false;
      audio.brew();
    }
  }
}

// E pressed near a station. Returns an event for main.js, or a message.
export function interact(state, audio) {
  const { cook, hand, kitchen: k } = state;
  const st = nearestStation(cook);
  if (!st) return { type: 'message', text: 'Dekati meja dulu!' };
  const room = hand.length < 3;

  if (st.kind === 'bin') {
    if (!room) return { type: 'message', text: 'Tangan penuh! (maks 3)' };
    hand.push({ type: st.type, prep: 'raw' });
    audio.pickup();
    return { type: 'message', text: `Ambil ${INGREDIENTS[st.type].name}` };
  }

  if (st.kind === 'board') {
    if (k.board.item) {
      if (k.board.item.prep === 'chopped' && room) {
        hand.push(k.board.item);
        k.board.item = null;
        k.board.progress = 0;
        audio.pickup();
        return { type: 'message', text: 'Ambil hasil cincangan' };
      }
      if (k.board.item.prep === 'raw') return { type: 'message', text: 'Tahan SPASI untuk mencincang!' };
      return { type: 'message', text: 'Talenan sedang dipakai' };
    }
    const idx = hand.findIndex((i) => i.prep === 'raw' && INGREDIENTS[i.type].chop);
    if (idx === -1) return { type: 'message', text: 'Butuh bahan mentah yang bisa dicincang' };
    k.board.item = hand.splice(idx, 1)[0];
    k.board.progress = 0;
    audio.drop();
    return { type: 'message', text: 'Tahan SPASI untuk mencincang!' };
  }

  if (st.kind === 'wok') {
    const doneSlot = k.woks.find((w) => w.item && w.done);
    if (doneSlot && room) {
      hand.push(doneSlot.item);
      Object.assign(doneSlot, { item: null, progress: 0, done: false, burnt: 0, announced: false });
      audio.pickup();
      return { type: 'message', text: 'Angkat masakan matang!' };
    }
    const burntSlot = k.woks.find((w) => w.item && w.item.prep === 'burnt');
    if (burntSlot && room) {
      hand.push(burntSlot.item);
      Object.assign(burntSlot, { item: null, progress: 0, done: false, burnt: 0, announced: false });
      audio.error();
      return { type: 'message', text: 'Gosong! Buang ke tempat sampah' };
    }
    const free = k.woks.find((w) => !w.item);
    if (!free) return { type: 'message', text: 'Wajan penuh!' };
    const idx = hand.findIndex((i) => canCook(i));
    if (idx === -1) return { type: 'message', text: 'Butuh bahan yang bisa dimasak (cincang ayam dulu!)' };
    free.item = hand.splice(idx, 1)[0];
    free.progress = 0;
    free.done = false;
    free.burnt = 0;
    free.announced = false;
    audio.sizzle();
    return { type: 'message', text: 'Masuk wajan… awas gosong!' };
  }

  if (st.kind === 'drink') {
    if (k.brew.ready) {
      if (!room) return { type: 'message', text: 'Tangan penuh!' };
      hand.push({ type: 'teh', prep: 'ready' });
      k.brew.ready = false;
      k.brew.progress = 0;
      audio.pickup();
      return { type: 'message', text: 'Es Teh siap!' };
    }
    if (k.brew.active) return { type: 'message', text: 'Teh sedang diseduh…' };
    k.brew.active = true;
    k.brew.progress = 0;
    audio.brew();
    return { type: 'message', text: 'Menyeduh Es Teh…' };
  }

  if (st.kind === 'plate') {
    if (state.plateCarried && k.plateOnCounter.items.length === 0) {
      k.plateOnCounter = state.plateCarried;
      state.plateCarried = null;
      audio.drop();
      return { type: 'message', text: 'Piring diletakkan' };
    }
    if (hand.length > 0 && !state.plateCarried) {
      if (k.plateOnCounter.items.length + hand.length > 4) {
        return { type: 'message', text: 'Piring penuh! (maks 4 bahan)' };
      }
      k.plateOnCounter.items.push(...hand.splice(0));
      audio.drop();
      return { type: 'message', text: 'Bahan ditata di piring' };
    }
    if (hand.length === 0 && !state.plateCarried && k.plateOnCounter.items.length > 0) {
      state.plateCarried = k.plateOnCounter;
      k.plateOnCounter = { items: [] };
      audio.pickup();
      return { type: 'message', text: 'Piring diangkat' };
    }
    return { type: 'message', text: 'Taruh bahan di piring dulu' };
  }

  if (st.kind === 'trash') {
    if (hand.length === 0) return { type: 'message', text: 'Tangan sudah kosong' };
    hand.length = 0;
    audio.drop();
    return { type: 'message', text: 'Dibuang!' };
  }

  if (st.kind === 'pass') {
    if (!state.plateCarried) return { type: 'message', text: 'Bawa piring yang sudah sesuai pesanan!' };
    return { type: 'serve', plate: state.plateCarried };
  }

  return null;
}
