// Emberlight — central tuning. Every number the game balances on lives here so
// the other modules stay about behaviour, not constants.

export const ARENA = {
  width: 960,
  height: 540,
  wall: 26, // glowing border the player and enemies stay inside
};

export const PLAYER = {
  radius: 14,
  speed: 268,
  maxHp: 100,
  fireInterval: 0.21, // seconds between bolts before upgrades
  boltDamage: 11,
  boltSpeed: 660,
  boltLife: 0.85,
  dashTime: 0.16,
  dashCooldown: 2.1,
  dashSpeed: 1150,
  hurtGrace: 0.65, // seconds of invulnerability after taking a hit
  magnetRadius: 74,
};

export const WAVES_TOTAL = 12;

// Enemy archetypes. `score` is paid on death, `damage` on touching the player.
export const ENEMY_TYPES = {
  shade:    { radius: 13, hp: 22,  speed: 94,  damage: 10, score: 50,   embers: 1 },
  skitter:  { radius: 10, hp: 12,  speed: 172, damage: 8,  score: 75,   embers: 1 },
  spitter:  { radius: 13, hp: 18,  speed: 72,  damage: 8,  score: 100,  embers: 2 },
  brute:    { radius: 24, hp: 98,  speed: 47,  damage: 20, score: 200,  embers: 3 },
  dreadmaw: { radius: 40, hp: 640, speed: 40,  damage: 26, score: 1500, embers: 12 },
};

export const SPITTER = {
  keepDistance: 235,
  orbInterval: 2.3,
  orbSpeed: 196,
  orbDamage: 9,
  orbRadius: 6,
};

export const BOSS = {
  burstEvery: 3.4,  // seconds between radial orb bursts
  burstOrbs: 14,
  chargeEvery: 5.2, // seconds between charges at the player
  chargeSpeed: 340,
  chargeTime: 0.55,
};

// The palette: deep indigo night, ember gold, wisp cyan, wraith violet.
export const COLORS = {
  nightTop: '#0b0620',
  nightBottom: '#1b0f3a',
  star: '#8f7fd8',
  ember: '#ffb347',
  emberHot: '#ff7847',
  wisp: '#6ef3ff',
  wispCore: '#eaffff',
  bolt: '#ffe9a3',
  shade: '#7a4fd0',
  skitter: '#c44fd0',
  spitter: '#4fd08a',
  brute: '#d04f6e',
  dreadmaw: '#ff5a3c',
  orb: '#ff6e9c',
  heart: '#ff5a7a',
  text: '#f4efff',
  dimText: '#b7a8e8',
};

export const COMBO_WINDOW = 3.0; // seconds to keep a kill chain alive
export const COMBO_MAX = 8;
