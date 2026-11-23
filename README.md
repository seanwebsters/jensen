# JENSEN RUN!

**DON'T GET CAUGHT. DON'T LOSE THE CHIPS.**

A three-lane endless runner for the browser. You are a cartoon Jensen in a leather jacket, sprinting through
an exaggerated chip-company HQ while a fictional spy chases you for the GPUs.

This is a comedy parody. The spy and the chase are invented, the "market cap saved" figure is a joke score
and not financial data, and the game is not affiliated with or endorsed by NVIDIA.

## Play

Open `index.html`. It is one self-contained file, so it works from disk or on any static host
(GitHub Pages serves it from the repository root).

| Action | Touch | Keyboard |
| --- | --- | --- |
| Change lane | swipe left / right | ← → or A D |
| Jump | swipe up | ↑, W or Space |
| Slide (or drop fast in mid-air) | swipe down | ↓ or S |
| Pause | pause button | Esc or P |

- Chairs and coffee carts: jump or dodge. Server racks and GPU boxes: dodge. Lasers and meeting tables: slide.
- Three unprotected hits and she catches you. On your first run the first three obstacles are free practice.
- Power-ups: **Leather Jacket Shield** (absorbs one hit), **H100 Turbo** (smash through everything),
  **Keynote Mode** (slow motion plus a chip magnet).
- Four zones loop: Main Office, GPU Lab, Executive Floor, Data Centre.
- Your best score is saved in the browser.

## Develop

```bash
npm install
node build.mjs
```

Sources are `js/run.js` (the game), `js/chars.js` and `js/core.js` (models and helpers) and
`index.src.html` (markup and CSS). `build.mjs` bundles them into `index.html`.
Add `?lowfx` to the URL to turn shadows off on slow devices.

## Also in this repo

`temptation/` holds the earlier game, *Jensen's Temptation* (a top-down spy-romance comedy), playable at
`temptation/index.html`. Rebuild it with `node temptation/build.mjs`.
