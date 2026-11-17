// The wisp: movement, the dash (with its invulnerable window), firing, and the
// hurt grace that keeps one mistake from ending a run. The player object is
// plain data plus this update; main.js owns collisions and consequences.

import { ARENA, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    fireTimer: 0,
    dashTimer: 0, // time left in the dash itself
    dashCooldown: 0,
    dashTimeMax: PLAYER.dashTime,
    dashCooldownMax: PLAYER.dashCooldown,
    dashDirX: 1,
    dashDirY: 0,
    hurtTimer: 0, // invulnerability after a hit
    aimAngle: 0,
    moving: false,
  };
}

export function resetPlayer(player) {
  const fresh = createPlayer();
  Object.assign(player, fresh);
}

/**
 * Move and fire for one step. `intent` is {moveX, moveY, aimX, aimY, firing,
 * dash} — from the real input or from a screenshot scene's autopilot.
 * New bolts are pushed into `bolts`; sounds and sparks go through `fx`.
 */
export function updatePlayer(player, stats, intent, dt, bolts, fx) {
  player.fireTimer -= dt;
  player.dashCooldown -= dt;
  player.hurtTimer -= dt;

  let moveX = intent.moveX;
  let moveY = intent.moveY;
  const length = Math.hypot(moveX, moveY);
  if (length > 1) {
    moveX /= length;
    moveY /= length;
  }
  player.moving = length > 0.05;

  // Starting a dash: burst along the move direction, or the aim if standing.
  if (intent.dash && player.dashCooldown <= 0 && player.dashTimer <= 0) {
    if (player.moving) {
      player.dashDirX = moveX;
      player.dashDirY = moveY;
    } else {
      player.dashDirX = Math.cos(player.aimAngle);
      player.dashDirY = Math.sin(player.aimAngle);
    }
    player.dashTimer = player.dashTimeMax;
    player.dashCooldown = player.dashCooldownMax;
    fx.dash(player);
  }

  const speed = PLAYER.speed * stats.speedMul;
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.vx = player.dashDirX * PLAYER.dashSpeed;
    player.vy = player.dashDirY * PLAYER.dashSpeed;
    fx.dashTrail(player);
  } else {
    // Snappy acceleration with a little glide, so stops feel deliberate.
    const accel = 1 - Math.exp(-14 * dt);
    player.vx += (moveX * speed - player.vx) * accel;
    player.vy += (moveY * speed - player.vy) * accel;
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const min = ARENA.wall + player.radius;
  player.x = Math.min(ARENA.width - min, Math.max(min, player.x));
  player.y = Math.min(ARENA.height - min, Math.max(min, player.y));

  player.aimAngle = Math.atan2(intent.aimY - player.y, intent.aimX - player.x);

  if (stats.regen > 0) {
    player.hp = Math.min(player.maxHp, player.hp + stats.regen * dt);
  }

  if (intent.firing && player.fireTimer <= 0) {
    player.fireTimer = PLAYER.fireInterval / stats.fireRateMul;
    const count = stats.projectiles;
    const spreadStep = 0.11;
    for (let i = 0; i < count; i += 1) {
      const angle = player.aimAngle + (i - (count - 1) / 2) * spreadStep;
      bolts.push({
        x: player.x + Math.cos(angle) * (player.radius + 6),
        y: player.y + Math.sin(angle) * (player.radius + 6),
        vx: Math.cos(angle) * PLAYER.boltSpeed * stats.boltSpeedMul,
        vy: Math.sin(angle) * PLAYER.boltSpeed * stats.boltSpeedMul,
        life: PLAYER.boltLife * stats.boltLifeMul,
        damage: PLAYER.boltDamage * stats.damageMul,
        pierce: stats.pierce,
        radius: 5,
      });
    }
    fx.shoot(player);
  }
}

export function isInvulnerable(player) {
  return player.dashTimer > 0 || player.hurtTimer > 0;
}
