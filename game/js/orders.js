// Warung Kilat — the order board: spawning, timers, matching, scoring.

import { DISHES, DISH_IDS, plateMatchesDish } from './recipes.js';

let nextOrderId = 1;

export function createOrders() {
  return {
    list: [],
    spawnTimer: 4,
    maxActive: 3,
  };
}

function randomDish(rng) {
  return DISH_IDS[Math.floor(rng() * DISH_IDS.length)];
}

// A fresh order. Timers shrink as the day goes on, so the rush builds.
export function spawnOrder(orders, elapsedDay, rng = Math.random) {
  const dishId = randomDish(rng);
  const pressure = Math.min(1, elapsedDay / 120);
  const total = 48 - 16 * pressure;
  const order = { id: nextOrderId++, dishId, timeLeft: total, total, fresh: 0.6 };
  orders.list.push(order);
  return order;
}

export function updateOrders(orders, dt, elapsedDay, rng = Math.random) {
  for (const o of orders.list) {
    o.timeLeft -= dt;
    if (o.fresh > 0) o.fresh -= dt;
  }
  // Expired orders leave the board and cost the player.
  const expired = orders.list.filter((o) => o.timeLeft <= 0);
  orders.list = orders.list.filter((o) => o.timeLeft > 0);
  // Keep the board fed: spawn faster as the day goes on.
  orders.spawnTimer -= dt;
  const interval = 13 - 6 * Math.min(1, elapsedDay / 120);
  if (orders.spawnTimer <= 0 && orders.list.length < orders.maxActive) {
    spawnOrder(orders, elapsedDay, rng);
    orders.spawnTimer = interval;
  }
  return expired;
}

export function findMatchingOrder(orders, plateItems) {
  for (const o of orders.list) {
    if (plateMatchesDish(plateItems, DISHES[o.dishId])) return o;
  }
  return null;
}

export function orderScore(order, combo) {
  const dish = DISHES[order.dishId];
  const timeBonus = Math.round((order.timeLeft / order.total) * 60);
  const comboBonus = combo * 15;
  return { points: dish.price + timeBonus + comboBonus, coins: 8 + combo * 2, timeBonus };
}

export function dishName(order) {
  return DISHES[order.dishId].name;
}
