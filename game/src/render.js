// Everything the player sees: the night arena, the entities, the HUD and the
// four screens (title, upgrade choice, game over, dawn). Screens register
// their clickable rectangles into state.buttons as they draw, so what is
// drawn is exactly what can be clicked.

import { ARENA, COLORS, COMBO_MAX, WAVES_TOTAL } from './config.js';

const FONT = 'Verdana, Geneva, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

export function drawBackground(ctx, state) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  gradient.addColorStop(0, COLORS.nightTop);
  gradient.addColorStop(1, COLORS.nightBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Stars, gently twinkling.
  for (const star of state.stars) {
    const tw = 0.5 + 0.5 * Math.sin(state.time * star.twinkle + star.phase);
    ctx.globalAlpha = 0.25 + 0.45 * tw;
    ctx.fillStyle = COLORS.star;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The arena frame: a double line of ember light.
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.75)';
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.wall, ARENA.wall, ARENA.width - ARENA.wall * 2, ARENA.height - ARENA.wall * 2);
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.18)';
  ctx.lineWidth = 9;
  ctx.strokeRect(ARENA.wall, ARENA.wall, ARENA.width - ARENA.wall * 2, ARENA.height - ARENA.wall * 2);
}

export function drawEmbers(ctx, state) {
  for (const ember of state.embers) {
    const pulse = 1 + 0.18 * Math.sin(state.time * 5 + ember.phase);
    ctx.save();
    ctx.translate(ember.x, ember.y);
    ctx.rotate(state.time * 1.6 + ember.phase);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.ember;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.emberHot;
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawBolts(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const bolt of state.bolts) {
    const angle = Math.atan2(bolt.vy, bolt.vx);
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.rotate(angle);
    ctx.shadowColor = COLORS.bolt;
    ctx.shadowBlur = 10;
    ctx.fillStyle = COLORS.bolt;
    roundRect(ctx, -9, -2.6, 18, 5.2, 2.6);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawOrbs(ctx, state) {
  for (const orb of state.orbs) {
    ctx.save();
    ctx.shadowColor = COLORS.orb;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.orb;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7e8';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemyBody(ctx, enemy, color) {
  const r = enemy.radius;
  ctx.fillStyle = color;
  if (enemy.kind === 'shade') {
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, r * 0.82, Math.PI, 0);
    ctx.lineTo(r * 0.82, r * 0.6);
    for (let i = 0; i < 3; i += 1) {
      ctx.lineTo(r * (0.4 - i * 0.4), r * 0.32);
      ctx.lineTo(r * (0.2 - i * 0.4), r * 0.6);
    }
    ctx.lineTo(-r * 0.82, r * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'skitter') {
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2 + enemy.wobble;
      const rad = i % 2 === 0 ? r * 1.15 : r * 0.62;
      const px = Math.cos(angle) * rad;
      const py = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'spitter') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e2b1c';
    ctx.beginPath();
    ctx.arc(0, 2, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'brute') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + 0.4;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 4, 10, 0.55)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.3);
    ctx.lineTo(0, r * 0.15);
    ctx.lineTo(r * 0.45, -r * 0.42);
    ctx.stroke();
  } else if (enemy.kind === 'dreadmaw') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Horns.
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, -r * 0.55);
    ctx.lineTo(-r * 1.12, -r * 1.05);
    ctx.lineTo(-r * 0.34, -r * 0.86);
    ctx.closePath();
    ctx.moveTo(r * 0.72, -r * 0.55);
    ctx.lineTo(r * 1.12, -r * 1.05);
    ctx.lineTo(r * 0.34, -r * 0.86);
    ctx.closePath();
    ctx.fill();
    // Jagged maw.
    ctx.fillStyle = '#2b0603';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.28);
    for (let i = 0; i <= 5; i += 1) {
      ctx.lineTo(-r * 0.55 + (i * r * 1.1) / 5, r * 0.28 + (i % 2 === 0 ? 0 : r * 0.2));
    }
    ctx.lineTo(r * 0.55, r * 0.62);
    ctx.lineTo(-r * 0.55, r * 0.62);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawEnemies(ctx, state) {
  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.spawnTimer > 0) {
      // Portal: a shrinking violet ring, the body not yet solid.
      const t = 1 - enemy.spawnTimer / 0.45;
      ctx.globalAlpha = 0.35 + 0.4 * t;
      ctx.strokeStyle = COLORS.shade;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * (2.1 - 1.1 * t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25 + 0.55 * t;
    }
    const color = COLORS[enemy.kind] ?? COLORS.shade;
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    drawEnemyBody(ctx, enemy, color);
    ctx.shadowBlur = 0;
    // Eyes track the hunt: two pale eyes toward the player, each its own
    // path (two arcs in one path would join into a single blob), with a dark
    // pupil on anything big enough to show one.
    const look = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const ex = Math.cos(look) * enemy.radius * 0.22;
    const ey = Math.sin(look) * enemy.radius * 0.22 - enemy.radius * 0.12;
    for (const side of [-1, 1]) {
      const cx = ex + side * enemy.radius * 0.26;
      ctx.fillStyle = '#ffeef7';
      ctx.beginPath();
      ctx.arc(cx, ey, Math.max(1.6, enemy.radius * 0.11), 0, Math.PI * 2);
      ctx.fill();
      if (enemy.radius >= 30) {
        ctx.fillStyle = '#2b0603';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(look) * 2.6, ey + Math.sin(look) * 2.6, enemy.radius * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (enemy.flash > 0) {
      ctx.globalAlpha = Math.min(0.85, enemy.flash * 5);
      drawEnemyBody(ctx, enemy, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // A slim health bar over anything tougher than a shade.
    if (enemy.maxHp >= 40 && enemy.hp < enemy.maxHp && enemy.spawnTimer <= 0) {
      const w = enemy.radius * 2;
      ctx.fillStyle = 'rgba(6, 2, 16, 0.7)';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 13, w, 5);
      ctx.fillStyle = COLORS.heart;
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 13, (w * enemy.hp) / enemy.maxHp, 5);
    }
  }
}

export function drawPlayer(ctx, state) {
  const player = state.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  const blink = player.hurtTimer > 0 && Math.floor(state.time * 18) % 2 === 0;
  // Halo.
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, player.radius * 2.6);
  halo.addColorStop(0, 'rgba(110, 243, 255, 0.5)');
  halo.addColorStop(1, 'rgba(110, 243, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * 2.6, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.globalAlpha = blink ? 0.45 : 1;
  ctx.shadowColor = COLORS.wisp;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.wisp;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.wispCore;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // Aim tick.
  ctx.rotate(player.aimAngle);
  ctx.fillStyle = COLORS.bolt;
  ctx.beginPath();
  ctx.moveTo(player.radius + 9, 0);
  ctx.lineTo(player.radius + 2, -4);
  ctx.lineTo(player.radius + 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (player.dashTimer > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(110, 243, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7 + Math.sin(state.time * 40) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawHud(ctx, state) {
  const player = state.player;
  ctx.save();
  // Health bar, top left.
  ctx.textAlign = 'left';
  ctx.font = `700 12px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText('FLAME', ARENA.wall + 2, ARENA.wall - 8 + 12);
  const hpW = 210;
  const hpFrac = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = 'rgba(6, 2, 16, 0.72)';
  roundRect(ctx, ARENA.wall + 48, ARENA.wall + 2, hpW, 13, 6);
  ctx.fill();
  const hpGrad = ctx.createLinearGradient(ARENA.wall + 48, 0, ARENA.wall + 48 + hpW, 0);
  hpGrad.addColorStop(0, hpFrac > 0.3 ? '#ffb347' : '#ff5a5a');
  hpGrad.addColorStop(1, hpFrac > 0.3 ? '#ff7847' : '#ff2e63');
  ctx.fillStyle = hpGrad;
  if (hpFrac > 0) {
    roundRect(ctx, ARENA.wall + 48, ARENA.wall + 2, hpW * hpFrac, 13, 6);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, ARENA.wall + 56, ARENA.wall + 12.5);

  // Wave and wraiths left, top centre.
  ctx.textAlign = 'center';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`WAVE ${state.wave} / ${WAVES_TOTAL}`, ARENA.width / 2, ARENA.wall + 14);
  ctx.font = `600 11.5px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText(`wraiths left: ${state.enemiesLeft}`, ARENA.width / 2, ARENA.wall + 31);

  // Score, top right; combo beneath it with its draining timer.
  ctx.textAlign = 'right';
  ctx.font = `800 21px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${state.score}`, ARENA.width - ARENA.wall - 2, ARENA.wall + 17);
  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText(`BEST ${state.best}`, ARENA.width - ARENA.wall - 2, ARENA.wall + 33);
  if (state.combo > 1) {
    const heat = state.combo / COMBO_MAX;
    ctx.font = `800 ${15 + heat * 5}px ${FONT}`;
    ctx.fillStyle = heat > 0.7 ? COLORS.emberHot : COLORS.ember;
    ctx.fillText(`×${state.combo} COMBO`, ARENA.width - ARENA.wall - 2, ARENA.wall + 58);
    ctx.fillStyle = 'rgba(255, 179, 71, 0.35)';
    ctx.fillRect(ARENA.width - ARENA.wall - 92, ARENA.wall + 64, 90 * (state.comboTimer / 3), 3.5);
  }

  // Dash readiness, bottom left.
  ctx.textAlign = 'left';
  ctx.font = `700 11px ${FONT}`;
  const dashReady = player.dashCooldown <= 0;
  ctx.fillStyle = dashReady ? COLORS.wisp : COLORS.dimText;
  ctx.fillText(dashReady ? 'DASH READY (Shift / right-click)' : 'DASH …', ARENA.wall + 2, ARENA.height - ARENA.wall - 6);

  // Boss bar, bottom centre.
  const boss = state.enemies.find((e) => e.kind === 'dreadmaw');
  if (boss) {
    const w = 340;
    const x = (ARENA.width - w) / 2;
    const y = ARENA.height - ARENA.wall - 16;
    ctx.textAlign = 'center';
    ctx.font = `800 12px ${FONT}`;
    ctx.fillStyle = COLORS.dreadmaw;
    ctx.fillText('☠  THE DREADMAW  ☠', ARENA.width / 2, y - 5);
    ctx.fillStyle = 'rgba(6, 2, 16, 0.72)';
    roundRect(ctx, x, y, w, 9, 4);
    ctx.fill();
    ctx.fillStyle = COLORS.dreadmaw;
    roundRect(ctx, x, y, (w * Math.max(0, boss.hp)) / boss.maxHp, 9, 4);
    ctx.fill();
  }
  ctx.restore();

  // Wave banner.
  if (state.banner && state.banner.t < state.banner.ttl) {
    const fade = Math.min(1, state.banner.t / 0.3, (state.banner.ttl - state.banner.t) / 0.5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.textAlign = 'center';
    ctx.font = `800 44px ${FONT}`;
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 24;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(state.banner.text, ARENA.width / 2, ARENA.height * 0.36);
    ctx.shadowBlur = 0;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillStyle = COLORS.ember;
    ctx.fillText(state.banner.sub, ARENA.width / 2, ARENA.height * 0.36 + 30);
    ctx.restore();
  }

  // Low flame: a red pulse at the edges.
  if (state.screen === 'play' && player.hp / player.maxHp < 0.3) {
    const pulse = 0.16 + 0.1 * Math.sin(state.time * 6);
    const vig = ctx.createRadialGradient(
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.36,
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.78,
    );
    vig.addColorStop(0, 'rgba(255, 30, 60, 0)');
    vig.addColorStop(1, `rgba(255, 30, 60, ${pulse})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }
}
