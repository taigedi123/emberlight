# Emberlight

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/taigedi123/emberlight/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/taigedi123/emberlight/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Emberlight** is a twin-stick arena survival game that runs entirely in the
browser from static files — no build step, no network, no assets: every
sprite is drawn with canvas paths and every sound is synthesised with
WebAudio.

The last flame of the valley still burns, and you are its keeper. Wraiths
come with the dark to snuff it out: shades that walk you down, skitters that
zig-zag in fast, spitters that keep their distance and lob orbs, brutes that
take a beating — and, on waves 5, 10 and 12, the Dreadmaw. Hold the arena
for 12 waves to reach dawn.

- **Move** with WASD or the arrow keys, **aim and fire** with the mouse
- **Dash** with Shift or right-click — briefly untouchable, on a cooldown
- Kills drop **embers**: gather them to feed your combo multiplier (up to ×8)
- Between waves, **choose 1 of 3 gifts** — more bolts, piercing light,
  regeneration, greed — and build the keeper the run needs
- A full loop: title screen, HUD (flame, wave, score, combo, dash, boss
  bar), a victory screen at dawn and a game-over screen with your stats,
  both with one-click restart

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Any static file server pointed at `game/` works just as well — open
`game/index.html` through it and play. The `?shot=title|play|boss|end`
URLs stage deterministic scenes of the real game (that is how the
screenshots in `screenshots/` were taken).

## Layout

- `game/` — the game itself: `index.html`, `style.css`, and one ES module
  per job in `src/` (config, input, audio, particles, player, enemies,
  upgrades, render, screens, shots, main)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with `vendor/makefun-game.ts`
- `screenshots/` — four real renders of the game: title, mid-wave action,
  the Dreadmaw fight, and the game-over screen

MIT licensed — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=5xww654b&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
