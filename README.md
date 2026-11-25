# Warung Kilat — Make the best cooking game

A fast Indonesian street-food kitchen game for the make.fun bounty
`best-cooking-game-20261125-0137`. You run a tiny warung: take orders
from the board, fetch ingredients from the counter, chop them on the
talenan, fry them in the wok before they burn, brew Es Teh, plate each
dish exactly to its recipe, and serve it at the pass before the order
timer runs out. Orders arrive faster and timers shrink as the day goes
on. One day lasts 150 seconds.

## Menu

- **Nasi Goreng** — Nasi (wok) + Telur (wok) + Bawang (cincang)
- **Mie Goreng** — Mie (wok) + Ayam (cincang, lalu wok) + Sayur (cincang)
- **Sate Ayam** — Ayam (cincang, lalu wok) × 2 + Bawang (cincang)
- **Gado-Gado** — Sayur (cincang) + Telur (wok) + Bawang (cincang)
- **Es Teh** — seduh di stasiun minuman

## Controls

- **WASD / arrow keys** — walk the cook; **click** — walk to a point
- **E** — pick up / put down / cook / serve at the nearest station
- **Hold Space** — chop on the cutting board
- **P** — pause, **M** — mute, **R** — restart after closing time

## Playing locally

```sh
node serve.ts            # game/ on http://localhost:8080
```

Screenshot states (deterministic, for the entry shots):

- `?shot=start` — title screen over the kitchen and order board
- `?shot=play` — a dish mid-assembly: chopping and wok in progress
- `?shot=serve` — a finished plate carried to the pass

## Layout

- `game/index.html`, `game/style.css` — page and styling
- `game/js/main.js` — loop, input, screens, screenshot states
- `game/js/recipes.js` — ingredients and dishes
- `game/js/orders.js` — order spawning, timers, scoring
- `game/js/kitchen.js` — stations and interactions
- `game/js/render.js` — all canvas drawing
- `game/js/audio.js` — WebAudio bleeps (no audio files)
- `main.ts` — hands the game in (copies `game/` + `screenshots/`,
  writes `dossier.json` with `vendor/makefun-game.ts`)

All art is drawn in canvas and all sounds are synthesized oscillators.
