// Warung Kilat — recipes and ingredients.
// Every dish is a small set of ingredients, each in a required state:
// raw -> chopped (cutting board) -> cooked (wok), or brewed (drink station).

export const INGREDIENTS = {
  nasi:   { name: 'Nasi',   emoji: '🍚', chop: false, cook: 4.0, color: '#fff3c4' },
  mie:    { name: 'Mie',    emoji: '🍜', chop: false, cook: 3.5, color: '#ffcf6e' },
  ayam:   { name: 'Ayam',   emoji: '🍗', chop: true,  cook: 5.0, color: '#e8a87c' },
  telur:  { name: 'Telur',  emoji: '🥚', chop: false, cook: 3.0, color: '#fff0a8' },
  sayur:  { name: 'Sayur',  emoji: '🥬', chop: true,  cook: 0,   color: '#7dd87d' },
  bawang: { name: 'Bawang', emoji: '🧅', chop: true,  cook: 0,   color: '#d9b3ff' },
  teh:    { name: 'Es Teh', emoji: '🧋', chop: false, cook: 0,   color: '#c98f5e', drink: true },
};

// A bin on the ingredient counter can hand out this ingredient raw.
export const BIN_TYPES = ['nasi', 'mie', 'ayam', 'telur', 'sayur', 'bawang'];

export const DISHES = {
  nasiGoreng: {
    name: 'Nasi Goreng', emoji: '🍛', price: 120,
    recipe: [
      { type: 'nasi', prep: 'cooked' },
      { type: 'telur', prep: 'cooked' },
      { type: 'bawang', prep: 'chopped' },
    ],
  },
  mieGoreng: {
    name: 'Mie Goreng', emoji: '🍜', price: 130,
    recipe: [
      { type: 'mie', prep: 'cooked' },
      { type: 'ayam', prep: 'cooked' },
      { type: 'sayur', prep: 'chopped' },
    ],
  },
  sateAyam: {
    name: 'Sate Ayam', emoji: '🍢', price: 150,
    recipe: [
      { type: 'ayam', prep: 'cooked' },
      { type: 'ayam', prep: 'cooked' },
      { type: 'bawang', prep: 'chopped' },
    ],
  },
  gadoGado: {
    name: 'Gado-Gado', emoji: '🥗', price: 110,
    recipe: [
      { type: 'sayur', prep: 'chopped' },
      { type: 'telur', prep: 'cooked' },
      { type: 'bawang', prep: 'chopped' },
    ],
  },
  esTeh: {
    name: 'Es Teh', emoji: '🧋', price: 40, drink: true,
    recipe: [{ type: 'teh', prep: 'ready' }],
  },
};

export const DISH_IDS = Object.keys(DISHES);

// How long a cooked item survives in the wok before it burns.
export const BURN_AFTER_SECONDS = 6;

export function recipeLabel(dish) {
  return dish.recipe
    .map((step) => `${INGREDIENTS[step.type].emoji} ${INGREDIENTS[step.type].name} (${step.prep})`)
    .join(' + ');
}

// True when the plate's items are exactly the dish's recipe (order ignored).
export function plateMatchesDish(plateItems, dish) {
  const want = dish.recipe.map((s) => `${s.type}:${s.prep}`).sort();
  const got = plateItems.map((i) => `${i.type}:${i.prep}`).sort();
  if (want.length !== got.length) return false;
  return want.every((w, idx) => w === got[idx]);
}

export function itemLabel(item) {
  const ing = INGREDIENTS[item.type];
  const prepWord = item.prep === 'raw' ? '' : item.prep === 'chopped' ? ' (cincang)' : item.prep === 'cooked' ? ' (matang)' : item.prep === 'burnt' ? ' (gosong!)' : '';
  return `${ing.emoji} ${ing.name}${prepWord}`;
}
