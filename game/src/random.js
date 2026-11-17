// A tiny seeded random generator (mulberry32). Gameplay uses it for spawns and
// scatter so a screenshot scene staged from a seed is the same frame every time.

export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    angle() {
      return next() * Math.PI * 2;
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
  };
}
