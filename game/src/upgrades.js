// The between-wave choices. Each upgrade mutates the run's stats (and sometimes
// the player directly: healing, max health). Three distinct ones are offered
// after every cleared wave; picking is the run's main strategic decision, so
// the pool mixes damage, tempo, survival and greed.

export const UPGRADES = [
  {
    id: 'brightbolts',
    name: 'Brightbolts',
    glyph: '✦',
    text: '+30% bolt damage. Your light bites harder.',
    apply(stats) {
      stats.damageMul *= 1.3;
    },
  },
  {
    id: 'quickening',
    name: 'Quickening',
    glyph: '»',
    text: '+18% fire rate. Bolts leave your hand faster.',
    apply(stats) {
      stats.fireRateMul *= 1.18;
    },
  },
  {
    id: 'twinwisps',
    name: 'Twin Wisps',
    glyph: '✧',
    text: '+1 bolt per shot, fanned beside the first.',
    apply(stats) {
      stats.projectiles += 1;
    },
  },
  {
    id: 'piercing',
    name: 'Piercing Dawn',
    glyph: '➤',
    text: 'Bolts pass through +1 enemy before fading.',
    apply(stats) {
      stats.pierce += 1;
    },
  },
  {
    id: 'swiftstep',
    name: 'Swiftstep',
    glyph: '↝',
    text: '+12% move speed and a snappier dash.',
    apply(stats, player) {
      stats.speedMul *= 1.12;
      player.dashCooldownMax *= 0.85;
    },
  },
  {
    id: 'deepflame',
    name: 'Deep Flame',
    glyph: '♥',
    text: '+25 max health, and mend 25 now.',
    apply(stats, player) {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
    },
  },
  {
    id: 'rekindle',
    name: 'Rekindle',
    glyph: '✚',
    text: 'Mend 45 health right now.',
    apply(stats, player) {
      player.hp = Math.min(player.maxHp, player.hp + 45);
    },
  },
  {
    id: 'emberheart',
    name: 'Ember Heart',
    glyph: '♦',
    text: 'Regenerate 1.6 health every second.',
    apply(stats) {
      stats.regen += 1.6;
    },
  },
  {
    id: 'gravitycharm',
    name: 'Gravity Charm',
    glyph: '◎',
    text: 'Embers fly to you from +70% farther away.',
    apply(stats) {
      stats.magnetMul *= 1.7;
    },
  },
  {
    id: 'greedflame',
    name: 'Greedflame',
    glyph: '✿',
    text: '+25% score from everything. Risk pays.',
    apply(stats) {
      stats.scoreMul *= 1.25;
    },
  },
  {
    id: 'longlight',
    name: 'Long Light',
    glyph: '☀',
    text: 'Bolts fly +35% farther and +15% faster.',
    apply(stats) {
      stats.boltLifeMul *= 1.35;
      stats.boltSpeedMul *= 1.15;
    },
  },
  {
    id: 'phasecloak',
    name: 'Phase Cloak',
    glyph: '◐',
    text: 'A longer dash, and grace after every hit.',
    apply(stats, player) {
      player.dashTimeMax *= 1.35;
      stats.hurtGraceMul *= 1.4;
    },
  },
];

/** Three distinct upgrades, drawn without replacement. */
export function drawChoices(rng, count = 3) {
  const pool = [...UPGRADES];
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    choices.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  }
  return choices;
}

/** A fresh run's stat block; upgrades multiply into this. */
export function freshStats() {
  return {
    damageMul: 1,
    fireRateMul: 1,
    projectiles: 1,
    pierce: 0,
    speedMul: 1,
    magnetMul: 1,
    scoreMul: 1,
    boltLifeMul: 1,
    boltSpeedMul: 1,
    regen: 0,
    hurtGraceMul: 1,
  };
}
