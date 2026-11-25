// Warung Kilat — everything the player sees, drawn on one canvas.
// No images are loaded: counters, food and the cook are all canvas shapes.

import { INGREDIENTS, DISHES } from './recipes.js';
import { STATIONS, nearestStation } from './kitchen.js';
import { findMatchingOrder } from './orders.js';

const W = 960;
const H = 600;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, bg = '#3a2e22') {
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

// Status words float over the light floor, so they sit on a dark pill.
function textPill(ctx, text, x, y, fg = '#fff') {
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  rr(ctx, x - tw / 2, y - 14, tw, 19, 9);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, x, y);
}

function stationBase(ctx, s, highlight) {
  ctx.fillStyle = highlight ? '#ffe9a8' : '#b5793e';
  rr(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 10);
  ctx.fill();
  ctx.fillStyle = '#8a5a24';
  rr(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.fillStyle = '#f7e8c9';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${s.emoji} ${s.label}`, s.cx, s.y + s.h - 10);
}

function drawItemChip(ctx, item, x, y, r = 15) {
  const ing = INGREDIENTS[item.type];
  ctx.fillStyle = ing.color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = item.prep === 'burnt' ? '#3a2a1a' : '#7a5a30';
  ctx.stroke();
  ctx.font = `${r}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ing.emoji, x, y + 1);
  if (item.prep === 'burnt') {
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText('🔥', x + r - 4, y - r + 2);
  }
  ctx.textBaseline = 'alphabetic';
}

export function render(ctx, state) {
  const { kitchen: k, orders, cook } = state;
  ctx.clearRect(0, 0, W, H);

  // Floor.
  ctx.fillStyle = '#f2e3c6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8d3a8';
  for (let y = 170; y < H; y += 46) {
    for (let x = ((y / 46) % 2) * 46; x < W; x += 92) ctx.fillRect(x, y, 44, 44);
  }
  // Floor mat and potted plants dress up the open floor.
  ctx.fillStyle = '#c98f5e';
  rr(ctx, 300, 430, 360, 110, 14);
  ctx.fill();
  ctx.fillStyle = '#e8b07d';
  rr(ctx, 312, 442, 336, 86, 10);
  ctx.fill();
  ctx.strokeStyle = '#b5793e';
  ctx.lineWidth = 3;
  rr(ctx, 330, 458, 300, 54, 8);
  ctx.stroke();
  ctx.fillStyle = '#8a5a24';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍜  WARUNG KILAT  🍜', 480, 490);
  for (const px of [70, 890]) {
    ctx.fillStyle = '#c96f4a';
    ctx.beginPath();
    ctx.moveTo(px - 18, 540);
    ctx.lineTo(px + 18, 540);
    ctx.lineTo(px + 12, 566);
    ctx.lineTo(px - 12, 566);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4e9e57';
    for (const [ox, oy, r] of [[-10, -8, 12], [8, -12, 13], [0, -22, 11]]) {
      ctx.beginPath();
      ctx.arc(px + ox, 540 + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Wall strip behind the top counters.
  ctx.fillStyle = '#2e6f5e';
  ctx.fillRect(0, 150, W, 20);

  drawHud(ctx, state);
  drawOrderBoard(ctx, state);

  // Stations.
  const near = state.screen === 'playing' ? nearestStation(cook) : null;
  for (const s of STATIONS) stationBase(ctx, s, near && near.id === s.id);

  // Ingredient bins show one sample of what they hand out.
  for (const s of STATIONS.filter((x) => x.kind === 'bin')) {
    drawItemChip(ctx, { type: s.type, prep: 'raw' }, s.cx, s.y + 24, 16);
  }

  // Cutting board.
  if (k.board.item) {
    drawItemChip(ctx, k.board.item, 662, 196, 17);
    if (k.board.item.prep === 'raw') {
      textPill(ctx, 'TAHAN SPASI', 662, 254);
      bar(ctx, 622, 240, 80, 7, k.board.progress, '#ffd23e');
    } else {
      textPill(ctx, 'SIAP ✓', 662, 254, '#b8ff9e');
    }
  }

  // Woks.
  k.woks.forEach((w, i) => {
    const cx = 800 + i * 86;
    ctx.fillStyle = '#2b2b33';
    ctx.beginPath();
    ctx.arc(cx, 200, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#454550';
    ctx.beginPath();
    ctx.arc(cx, 200, 24, 0, Math.PI * 2);
    ctx.fill();
    if (w.item) {
      drawItemChip(ctx, w.item, cx, 200, 15);
      if (!w.done && w.item.prep !== 'burnt') {
        bar(ctx, cx - 26, 240, 52, 7, w.progress, '#ff9d3c');
      } else if (w.done) {
        textPill(ctx, 'MATANG!', cx, 254, '#b8ff9e');
      } else if (w.item.prep === 'burnt') {
        textPill(ctx, 'GOSONG!', cx, 254, '#ff6b5e');
      }
    }
  });

  // Drink station.
  if (k.brew.active) {
    bar(ctx, 348, 312, 80, 8, k.brew.progress, '#7ec8ff');
    textPill(ctx, 'MENYEDUH…', 388, 296);
  } else if (k.brew.ready) {
    drawItemChip(ctx, { type: 'teh', prep: 'ready' }, 388, 322, 16);
    textPill(ctx, 'SIAP ✓', 388, 296, '#b8ff9e');
  }

  // Plating counter + plate on it.
  drawPlate(ctx, k.plateOnCounter, 162, 330);

  // Serving pass — glows when a matching plate is carried.
  const readyOrder = state.plateCarried ? findMatchingOrder(state.orders, state.plateCarried.items) : null;
  if (readyOrder) {
    ctx.fillStyle = '#ffe9a8';
    rr(ctx, 744, 296, 196, 70, 10);
    ctx.fill();
    ctx.fillStyle = '#7a4d00';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ SIAP DISAJIKAN ✦', 842, 322);
  }

  drawCook(ctx, state);
  drawPrompt(ctx, state);

  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  if (state.screen === 'over') drawGameOver(ctx, state);

  // Toast message.
  if (state.messageT > 0) {
    ctx.globalAlpha = Math.min(1, state.messageT);
    ctx.fillStyle = '#2b2118';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(state.message).width + 28;
    rr(ctx, W / 2 - tw / 2, 566, tw, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(state.message, W / 2, 584);
    ctx.globalAlpha = 1;
  }
}

function drawPlate(ctx, plate, x, y) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, 52, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#eef2f5';
  ctx.beginPath();
  ctx.ellipse(x, y, 38, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  plate.items.forEach((item, i) => {
    drawItemChip(ctx, item, x - 30 + i * 20, y - 2, 11);
  });
}

function drawCook(ctx, state) {
  const { cook } = state;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cook.x, cook.y + 22, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body (apron) and head.
  ctx.fillStyle = '#e4572e';
  rr(ctx, cook.x - 15, cook.y - 6, 30, 30, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  rr(ctx, cook.x - 11, cook.y + 2, 22, 20, 6);
  ctx.fill();
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.arc(cook.x, cook.y - 14, 13, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  rr(ctx, cook.x - 13, cook.y - 34, 26, 12, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cook.x - 8, cook.y - 26, 7, 0, Math.PI * 2);
  ctx.arc(cook.x + 8, cook.y - 26, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(cook.x - 5, cook.y - 15, 1.8, 0, Math.PI * 2);
  ctx.arc(cook.x + 5, cook.y - 15, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Hand items float above the cook.
  state.hand.forEach((item, i) => {
    drawItemChip(ctx, item, cook.x - (state.hand.length - 1) * 14 + i * 28, cook.y - 44, 12);
  });
  // Carried plate.
  if (state.plateCarried) {
    drawPlate(ctx, state.plateCarried, cook.x, cook.y - 48);
  }
}

function drawPrompt(ctx, state) {
  if (state.screen !== 'playing') return;
  const near = nearestStation(state.cook);
  if (!near) return;
  const labels = {
    bin: `E: Ambil ${near.label}`,
    board: 'E: Taruh / ambil  •  SPASI tahan: cincang',
    wok: 'E: Masak / angkat',
    drink: 'E: Seduh / ambil Es Teh',
    plate: 'E: Tata / angkat piring',
    trash: 'E: Buang isi tangan',
    pass: 'E: Sajikan!',
  };
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const text = labels[near.kind] || 'E: Pakai';
  const tw = ctx.measureText(text).width + 24;
  rr(ctx, state.cook.x - tw / 2, state.cook.y + 34, tw, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(text, state.cook.x, state.cook.y + 51);
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#1f3d33';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🍳 WARUNG KILAT', 16, 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`Skor ${state.score}`, 250, 30);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText(`🪙 ${state.coins}`, 380, 30);
  ctx.fillStyle = state.combo >= 2 ? '#ff9d3c' : '#cfe8d8';
  ctx.fillText(state.combo >= 2 ? `🔥 Kombo x${state.combo}` : `Kombo x${state.combo}`, 480, 30);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Sajian: ${state.served}  •  Gagal: ${state.missed}`, 250, 52);
  // Day timer.
  const frac = Math.max(0, state.dayLeft / state.dayTime);
  ctx.fillStyle = '#cfe8d8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`⏱ ${Math.ceil(state.dayLeft)} dtk`, 944, 22);
  bar(ctx, 700, 32, 244, 12, frac, frac > 0.3 ? '#7dd87d' : '#ff6b5e');
  ctx.textAlign = 'left';
}

function drawOrderBoard(ctx, state) {
  ctx.fillStyle = '#3a2e22';
  rr(ctx, 12, 68, W - 24, 82, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📋 PESANAN', 24, 86);
  ctx.fillStyle = '#cfe8d8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Susun piring sesuai resep, lalu sajikan di Meja Saji sebelum waktu habis!', 130, 86);
  state.orders.list.forEach((o, i) => {
    const dish = DISHES[o.dishId];
    const x = 24 + i * 224;
    const y = 94;
    const urgent = o.timeLeft < 12;
    ctx.fillStyle = o.fresh > 0 ? '#fff3c4' : '#fffaf0';
    rr(ctx, x, y, 212, 50, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#ff6b5e' : '#b5793e';
    ctx.lineWidth = urgent ? 3 : 1.5;
    ctx.stroke();
    ctx.font = '20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(dish.emoji, x + 8, y + 28);
    ctx.fillStyle = '#2b2118';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(dish.name, x + 36, y + 20);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#5a4632';
    const recipe = dish.recipe.map((s) => `${INGREDIENTS[s.type].emoji}${s.prep === 'cooked' ? '🔥' : s.prep === 'chopped' ? '🔪' : s.prep === 'ready' ? '✓' : ''}`).join(' ');
    ctx.fillText(recipe, x + 36, y + 38);
    bar(ctx, x + 8, y + 42, 196, 5, o.timeLeft / o.total, urgent ? '#ff6b5e' : '#2e9e6b');
  });
  if (state.orders.list.length === 0) {
    ctx.fillStyle = '#cfe8d8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Belum ada pesanan…', 24, 122);
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(20,30,26,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍳 WARUNG KILAT', W / 2, 210);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Warung cepat saji — masak, sajikan, jangan sampai gosong!', W / 2, 248);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('WASD / Panah: jalan   •   E: ambil / taruh / masak   •   SPASI tahan: cincang', W / 2, 300);
  ctx.fillText('Klik: jalan ke titik itu   •   P: jeda   •   M: bisu', W / 2, 326);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillText('▶  Tekan ENTER atau klik untuk mulai', W / 2, 380);
  ctx.globalAlpha = 1;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8d8';
  ctx.fillText('Nasi Goreng • Mie Goreng • Sate Ayam • Gado-Gado • Es Teh', W / 2, 420);
  ctx.fillText('Skor terbaik: ' + state.best, W / 2, 446);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20,30,26,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⏸ JEDA', W / 2, 290);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Tekan P untuk lanjut', W / 2, 326);
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(20,30,26,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⏰ TUTUP WARUNG!', W / 2, 220);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`Skor akhir: ${state.score}`, W / 2, 272);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(`🪙 ${state.coins} koin  •  🍽 ${state.served} sajian  •  Kombo terbaik x${state.bestCombo}`, W / 2, 306);
  ctx.fillText(`Skor terbaik: ${state.best}`, W / 2, 334);
  const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Tekan R untuk buka warung lagi', W / 2, 384);
  ctx.globalAlpha = 1;
}
