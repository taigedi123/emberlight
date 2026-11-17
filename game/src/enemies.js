// The wraiths: four kinds with distinct movement, plus the Dreadmaw boss.
// Shades walk at the player, skitters zig-zag in fast, spitters keep their
// distance and lob orbs, brutes simply take a lot of killing. Enemies fade in
// through a short portal first, so nothing ever appears on top of the player.

import { ARENA, BOSS, ENEMY_TYPES, SPITTER } from './config.js';

const SPAWN_IN = 0.45; // seconds of portal before an enemy can move or harm

export function createEnemy(kind, x, y, wave) {
  const base = ENEMY_TYPES[kind];
  const hpScale = 1 + (wave - 1) * 0.16;
  const speedScale = 1 + (wave - 1) * 0.02;
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: base.radius,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    speed: base.speed * speedScale,
    damage: base.damage,
    score: base.score,
    embers: base.embers,
    spawnTimer: SPAWN_IN,
    wobble: Math.random() * Math.PI * 2,
    fireTimer: SPITTER.orbInterval * (0.6 + Math.random() * 0.7),
    flash: 0, // white flash timer after being hit
    burstTimer: BOSS.burstEvery * 0.7,
    chargeTimer: BOSS.chargeEvery * 0.6,
    charging: 0,
    chargeDirX: 0,
    chargeDirY: 0,
  };
}

/** Where a wave's enemies appear: just inside a random stretch of wall. */
function spawnPoint(rng, player) {
  for (let tries = 0; tries < 8; tries += 1) {
    const side = rng.int(0, 3);
    const margin = ARENA.wall + 18;
    let x;
    let y;
    if (side === 0) { x = rng.range(margin, ARENA.width - margin); y = margin; }
    else if (side === 1) { x = rng.range(margin, ARENA.width - margin); y = ARENA.height - margin; }
    else if (side === 2) { x = margin; y = rng.range(margin, ARENA.height - margin); }
    else { x = ARENA.width - margin; y = rng.range(margin, ARENA.height - margin); }
    if (Math.hypot(x - player.x, y - player.y) > 190) return { x, y };
  }
  return { x: ARENA.wall + 30, y: ARENA.wall + 30 };
}

/**
 * The wave's spawn queue: a list of {kind, at} in seconds from the wave's
 * start. Later waves mix more kinds and arrive in tighter, overlapping packs.
 */
export function wavePlan(wave, rng) {
  const plan = [];
  let at = 0.6;
  // Arrivals come in packs: `pack` enemies share a moment, then a gap. A wave
  // should feel like a wave — pressure in pulses, with breaths between —
  // not a single-file trickle the keeper picks off one at a time.
  const add = (kind, count, gap, pack = 1) => {
    for (let i = 0; i < count; i += 1) {
      plan.push({ kind, at });
      if ((i + 1) % pack === 0) at += gap * rng.range(0.7, 1.3);
    }
  };
  const isBossWave = wave === 5 || wave === 10 || wave === 12;
  if (isBossWave) plan.push({ kind: 'dreadmaw', at: 1.2 });
  add('shade', 4 + wave * 2, 2.6, 3);
  if (wave >= 2) add('skitter', 1 + wave, 2.2, 2);
  if (wave >= 3) add('spitter', Math.floor(wave / 2), 2.4);
  if (wave >= 4) add('brute', Math.floor((wave - 2) / 2), 3.2);
  if (wave >= 6) add('skitter', wave, 1.8, 3);
  if (wave >= 8) add('shade', wave, 2.2, 3);
  // Jitter the pack times a little so kinds interleave instead of marching
  // in strict order.
  for (const entry of plan) {
    if (entry.kind !== 'dreadmaw') entry.at += rng.range(0, 1.2);
  }
  plan.sort((a, b) => a.at - b.at);
  return plan;
}

function steer(enemy, dirX, dirY, speed, dt, turn = 6) {
  const blend = 1 - Math.exp(-turn * dt);
  enemy.vx += (dirX * speed - enemy.vx) * blend;
  enemy.vy += (dirY * speed - enemy.vy) * blend;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  const min = ARENA.wall + enemy.radius * 0.6;
  enemy.x = Math.min(ARENA.width - min, Math.max(min, enemy.x));
  enemy.y = Math.min(ARENA.height - min, Math.max(min, enemy.y));
}

/**
 * Move every enemy for one step and run the shooters. Enemy orbs are pushed
 * into state.orbs. `fx` hears about boss bursts and charges for sound/shake.
 */
export function updateEnemies(state, dt, fx) {
  const player = state.player;
  for (const enemy of state.enemies) {
    enemy.flash = Math.max(0, enemy.flash - dt);
    if (enemy.spawnTimer > 0) {
      enemy.spawnTimer -= dt;
      continue;
    }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const dirX = dx / dist;
    const dirY = dy / dist;
    enemy.wobble += dt * 3;

    if (enemy.kind === 'shade') {
      steer(enemy, dirX, dirY, enemy.speed, dt);
    } else if (enemy.kind === 'skitter') {
      const sway = Math.sin(enemy.wobble * 2.2) * 0.75;
      const cos = Math.cos(sway);
      const sin = Math.sin(sway);
      steer(enemy, dirX * cos - dirY * sin, dirX * sin + dirY * cos, enemy.speed, dt, 8);
    } else if (enemy.kind === 'spitter') {
      const want = dist < SPITTER.keepDistance - 24 ? -1 : dist > SPITTER.keepDistance + 24 ? 1 : 0;
      const strafe = Math.sin(enemy.wobble * 0.7) * 0.5;
      steer(enemy, dirX * want - dirY * strafe, dirY * want + dirX * strafe, enemy.speed, dt, 4);
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && dist < 430) {
        enemy.fireTimer = SPITTER.orbInterval;
        state.orbs.push({
          x: enemy.x,
          y: enemy.y,
          vx: dirX * SPITTER.orbSpeed,
          vy: dirY * SPITTER.orbSpeed,
          life: 3.2,
          damage: SPITTER.orbDamage,
          radius: SPITTER.orbRadius,
        });
        fx.orbFired(enemy);
      }
    } else if (enemy.kind === 'brute') {
      steer(enemy, dirX, dirY, enemy.speed, dt, 3);
    } else if (enemy.kind === 'dreadmaw') {
      updateBoss(state, enemy, dirX, dirY, dist, dt, fx);
    }
  }
}

function updateBoss(state, boss, dirX, dirY, dist, dt, fx) {
  boss.burstTimer -= dt;
  if (boss.burstTimer <= 0) {
    boss.burstTimer = BOSS.burstEvery;
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < BOSS.burstOrbs; i += 1) {
      const angle = offset + (i / BOSS.burstOrbs) * Math.PI * 2;
      state.orbs.push({
        x: boss.x + Math.cos(angle) * boss.radius,
        y: boss.y + Math.sin(angle) * boss.radius,
        vx: Math.cos(angle) * (SPITTER.orbSpeed * 0.8),
        vy: Math.sin(angle) * (SPITTER.orbSpeed * 0.8),
        life: 3.4,
        damage: SPITTER.orbDamage,
        radius: SPITTER.orbRadius,
      });
    }
    fx.bossBurst(boss);
  }
  if (boss.charging > 0) {
    boss.charging -= dt;
    boss.x += boss.chargeDirX * BOSS.chargeSpeed * dt;
    boss.y += boss.chargeDirY * BOSS.chargeSpeed * dt;
    const min = ARENA.wall + boss.radius * 0.6;
    boss.x = Math.min(ARENA.width - min, Math.max(min, boss.x));
    boss.y = Math.min(ARENA.height - min, Math.max(min, boss.y));
    return;
  }
  boss.chargeTimer -= dt;
  if (boss.chargeTimer <= 0 && dist < 460) {
    boss.chargeTimer = BOSS.chargeEvery;
    boss.charging = BOSS.chargeTime;
    boss.chargeDirX = dirX;
    boss.chargeDirY = dirY;
    fx.bossCharge(boss);
    return;
  }
  steer(boss, dirX, dirY, boss.speed, dt, 2.5);
}

/** Enemy orbs drift straight and die at the walls. */
export function updateOrbs(state, dt) {
  for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
    const orb = state.orbs[i];
    orb.life -= dt;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    if (
      orb.life <= 0 ||
      orb.x < ARENA.wall - 12 || orb.x > ARENA.width + 12 ||
      orb.y < ARENA.wall - 12 || orb.y > ARENA.height + 12
    ) {
      state.orbs.splice(i, 1);
    }
  }
}

export { spawnPoint };
