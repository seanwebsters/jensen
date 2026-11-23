# Jensen's Temptation

**GET THE GIRL. DON'T LOSE THE GPUs.**

A cosy low-poly romantic-espionage comedy for the browser. Entirely fictional parody: the characters, the
romance and the espionage are invented, and nothing here depicts real events or real conduct by any real
person or company. Not affiliated with or endorsed by NVIDIA.

## Play

Open `index.html` in any modern browser. It is one self-contained file (Three.js and all game code
are inlined), so it can be hosted on any static host (GitHub Pages, Netlify, itch.io) or opened from disk.
The only network request is an optional Google Font; without it the game falls back to a system font.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD / arrows | joystick |
| Sprint (uses stamina) | Shift | RUN |
| Interact / advance / mini-games | E, Space or Enter | E |
| Dialogue choice | mouse or 1–3 | tap |
| Throw jacket (Mission 4) | Q or F | JACKET |
| Pause | Esc or P | pause button |

## How the two meters matter

- **Romance** gates progress (she walks if she is bored), slows her down and makes her easier to catch in
  the heist, and decides which endings are open.
- **National Security** decides how big her head start is in the heist, whether a guard stops her at the
  door, and how many hazards she drops behind her.
- Endings: *True Love, Total Data Breach* · *Secure but Single* · *The Impossible Ending*
  (catch her with Romance ≥ 75 and Security ≥ 65) · plus one bonus ending for failing at both.

## Develop

```bash
npm install
node build.mjs
```

Sources are in `js/` (`core.js` helpers, `chars.js` characters and animation, `world.js` campus,
`main.js` engine, UI and missions) and `index.src.html` (markup and CSS). `build.mjs` bundles everything
into `index.html`. Append `?lowfx` to the URL to disable shadows on slow machines.
