// Emberlight — the game itself. This module owns the state, the loop and the
// rules that connect the pieces: spawning waves, collisions, combo scoring,
// ember pickups, the upgrade choice between waves, and winning or losing.
// Rendering lives in render.js/screens.js, behaviour in the entity modules.

import { ARENA, COLORS, COMBO_MAX, COMBO_WINDOW, PLAYER, WAVES_TOTAL } from './config.js';
import { createRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createPlayer, isInvulnerable, resetPlayer, updatePlayer } from './player.js';
import { createEnemy, spawnPoint, updateEnemies, updateOrbs, wavePlan } from './enemies.js';
import { drawChoices, freshStats } from './upgrades.js';
import { drawBackground, drawBolts, drawEmbers, drawEnemies, drawHud, drawOrbs, drawPlayer } from './render.js';
import { drawGameOver, drawTitle, drawUpgrade, drawVictory } from './screens.js';

const EMBER_VALUE = 10;
const EMBER_LIFE = 14;

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createAudio();
  const rng = createRng((Date.now() % 2147483647) + 7);
  const particles = createParticles(createRng(1234567));

  const state = {
    screen: 'title', // title | play | upgrade | over | victory
    time: 0,
    runTime: 0,
    wave: 0,
    waveTime: 0,
    spawnQueue: [],
    enemies: [],
    bolts: [],
    orbs: [],
    embers: [],
    player: createPlayer(),
    stats: freshStats(),
    score: 0,
    best: loadBest(),
    combo: 1,
    comboTimer: 0,
    kills: 0,
    choices: [],
    buttons: [],
    mouseX: ARENA.width / 2,
    mouseY: ARENA.height / 2,
    banner: null,
    shake: 0,
    hurtFlash: 0,
    stars: [],
  };
  for (let i = 0; i < 110; i += 1) {
    state.stars.push({
      x: rng.range(8, ARENA.width - 8),
      y: rng.range(8, ARENA.height - 8),
      r: rng.range(0.7, 1.9),
      twinkle: rng.range(0.4, 1.6),
      phase: rng.range(0, Math.PI * 2),
    });
  }

  // Sound/particle hooks the entity modules call through.
  const fx = {
    shoot() {
      audio.shoot();
    },
    dash(player) {
      audio.dash();
      particles.burst(player.x, player.y, COLORS.wisp, 8, 120);
    },
    dashTrail(player) {
      particles.trail(player.x, player.y, COLORS.wisp);
    },
    orbFired() {},
    bossBurst(boss) {
      state.shake = Math.max(state.shake, 5);
      particles.ring(boss.x, boss.y, COLORS.orb, 18);
    },
    bossCharge() {
      state.shake = Math.max(state.shake, 3);
    },
  };

  function loadBest() {
    try {
      return Number(window.localStorage.getItem('emberlight.best') ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    if (state.score > state.best) {
      state.best = state.score;
      try {
        window.localStorage.setItem('emberlight.best', String(state.best));
      } catch {
        // Storage off: the best lasts this visit only.
      }
    }
  }

  function startRun() {
    resetPlayer(state.player);
    state.stats = freshStats();
    state.enemies = [];
    state.bolts = [];
    state.orbs = [];
    state.embers = [];
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.kills = 0;
    state.runTime = 0;
    particles.clear();
    beginWave(1);
    state.screen = 'play';
    audio.startMusic();
  }

  function beginWave(wave) {
    state.wave = wave;
    state.waveTime = 0;
    const plan = wavePlan(wave, rng);
    state.spawnQueue = plan.map((entry) => ({
      kind: entry.kind,
      at: entry.at,
      point: null,
    }));
    const isBoss = state.spawnQueue.some((e) => e.kind === 'dreadmaw');
    state.banner = {
      text: `WAVE ${wave}`,
      sub: isBoss ? 'The Dreadmaw stirs in the dark…' : wave === 1 ? 'Hold the flame. Gather embers.' : 'The dark presses in.',
      t: 0,
      ttl: 2.4,
    };
    if (isBoss) audio.bossWarn();
    else audio.waveStart();
  }

  function addScore(base, x, y) {
    const gained = Math.round(base * state.combo * state.stats.scoreMul);
    state.score += gained;
    if (x !== undefined) particles.addText(x, y - 14, `+${gained}`, COLORS.bolt, 14);
    return gained;
  }

  function dropEmbers(enemy) {
    for (let i = 0; i < enemy.embers; i += 1) {
      const angle = rng.angle();
      const speed = rng.range(30, 120);
      state.embers.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: EMBER_LIFE,
        phase: rng.range(0, Math.PI * 2),
      });
    }
  }

  function killEnemy(enemy) {
    enemy.dead = true;
    state.kills += 1;
    state.combo = Math.min(COMBO_MAX, state.combo + (state.comboTimer > 0 ? 1 : 0));
    state.comboTimer = COMBO_WINDOW;
    addScore(enemy.score, enemy.x, enemy.y);
    dropEmbers(enemy);
    particles.burst(enemy.x, enemy.y, COLORS[enemy.kind] ?? COLORS.shade, enemy.kind === 'dreadmaw' ? 46 : 15, 210);
    if (enemy.kind === 'dreadmaw') {
      particles.ring(enemy.x, enemy.y, COLORS.dreadmaw, 40);
      state.shake = Math.max(state.shake, 11);
    } else if (enemy.kind === 'brute') {
      state.shake = Math.max(state.shake, 5);
    }
    audio.kill(state.combo);
  }

  function damagePlayer(amount) {
    const player = state.player;
    if (isInvulnerable(player) || state.screen !== 'play') return;
    player.hp -= amount;
    player.hurtTimer = PLAYER.hurtGrace * state.stats.hurtGraceMul;
    state.hurtFlash = 0.3;
    state.shake = Math.max(state.shake, 6);
    state.combo = 1;
    state.comboTimer = 0;
    particles.burst(player.x, player.y, COLORS.heart, 14, 190);
    audio.hurt();
    if (player.hp <= 0) {
      player.hp = 0;
      saveBest();
      state.screen = 'over';
      audio.gameOver();
      particles.burst(player.x, player.y, COLORS.wisp, 42, 260);
      particles.ring(player.x, player.y, COLORS.wisp, 30);
    }
  }

  function waveCleared() {
    if (state.wave >= WAVES_TOTAL) {
      saveBest();
      state.screen = 'victory';
      audio.victory();
      for (let i = 0; i < 5; i += 1) {
        particles.burst(rng.range(140, ARENA.width - 140), rng.range(110, 300), COLORS.ember, 22, 220);
      }
      return;
    }
    state.choices = drawChoices(rng);
    state.screen = 'upgrade';
    audio.upgrade();
  }

  function applyChoice(index) {
    const choice = state.choices[index];
    if (!choice) return;
    choice.apply(state.stats, state.player);
    particles.burst(state.player.x, state.player.y, COLORS.ember, 20, 160);
    beginWave(state.wave + 1);
    state.screen = 'play';
  }

  // One step of live play. `intent` is {moveX, moveY, aimX, aimY, firing, dash}.
  function stepPlay(dt, intent) {
    const player = state.player;
    state.runTime += dt;
    state.waveTime += dt;

    // Spawn what the wave has scheduled.
    while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
      const next = state.spawnQueue.shift();
      const point = spawnPoint(rng, player);
      state.enemies.push(createEnemy(next.kind, point.x, point.y, state.wave));
    }

    updatePlayer(player, state.stats, intent, dt, state.bolts, fx);
    updateEnemies(state, dt, fx);
    updateOrbs(state, dt);

    // Bolts fly and bite.
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      bolt.life -= dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      let spent = bolt.life <= 0 || bolt.x < 4 || bolt.x > ARENA.width - 4 || bolt.y < 4 || bolt.y > ARENA.height - 4;
      if (!spent) {
        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.spawnTimer > 0) continue;
          const rr = enemy.radius + bolt.radius;
          if ((enemy.x - bolt.x) ** 2 + (enemy.y - bolt.y) ** 2 < rr * rr) {
            enemy.hp -= bolt.damage;
            enemy.flash = 0.14;
            particles.sparks(bolt.x, bolt.y, Math.atan2(bolt.vy, bolt.vx), COLORS.bolt, 4);
            audio.hitEnemy();
            if (enemy.hp <= 0) killEnemy(enemy);
            if (bolt.pierce > 0) {
              bolt.pierce -= 1;
            } else {
              spent = true;
            }
            break;
          }
        }
      }
      if (spent) state.bolts.splice(i, 1);
    }
    state.enemies = state.enemies.filter((e) => !e.dead);

    // Wraiths that reach the wisp, and orbs that reach it, hurt.
    for (const enemy of state.enemies) {
      if (enemy.spawnTimer > 0) continue;
      const rr = enemy.radius + player.radius - 2;
      if ((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2 < rr * rr) {
        damagePlayer(enemy.damage);
        // The wraith recoils a little, so one touch is one hit.
        const away = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        enemy.x += Math.cos(away) * 16;
        enemy.y += Math.sin(away) * 16;
      }
    }
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const orb = state.orbs[i];
      const rr = orb.radius + player.radius - 2;
      if ((orb.x - player.x) ** 2 + (orb.y - player.y) ** 2 < rr * rr) {
        damagePlayer(orb.damage);
        state.orbs.splice(i, 1);
      }
    }

    // Embers drift, fly to the wisp when close, and feed the combo.
    const magnet = PLAYER.magnetRadius * state.stats.magnetMul;
    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const ember = state.embers[i];
      ember.life -= dt;
      const dx = player.x - ember.x;
      const dy = player.y - ember.y;
      const dist = Math.hypot(dx, dy);
      if (dist < magnet && dist > 1) {
        const pull = 620 * (1 - dist / (magnet * 1.6));
        ember.vx += (dx / dist) * pull * dt * 3.2;
        ember.vy += (dy / dist) * pull * dt * 3.2;
      }
      ember.vx *= Math.max(0, 1 - 3.4 * dt);
      ember.vy *= Math.max(0, 1 - 3.4 * dt);
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      if (dist < player.radius + 11) {
        addScore(EMBER_VALUE, ember.x, ember.y - 4);
        state.comboTimer = COMBO_WINDOW;
        particles.sparks(ember.x, ember.y, -Math.PI / 2, COLORS.ember, 3);
        audio.pickup(state.combo);
        state.embers.splice(i, 1);
      } else if (ember.life <= 0) {
        state.embers.splice(i, 1);
      }
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }

    state.enemiesLeft = state.spawnQueue.length + state.enemies.length;
    if (state.screen === 'play' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      waveCleared();
    }
  }

  function liveIntent() {
    return {
      moveX: input.axisX(),
      moveY: input.axisY(),
      aimX: input.mouseX,
      aimY: input.mouseY,
      firing: input.firing(),
      dash: input.takeDash(),
    };
  }

  function handleButtons(clicks) {
    for (const click of clicks) {
      for (const b of state.buttons) {
        if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
          runAction(b.action);
          break;
        }
      }
    }
  }

  function runAction(action) {
    audio.unlock();
    if (action === 'start' || action === 'restart') startRun();
    else if (action.startsWith('upgrade:')) applyChoice(Number(action.split(':')[1]));
  }

  const keyQueue = [];
  window.addEventListener('keydown', (event) => {
    keyQueue.push(event.code);
  });

  function handleKeys() {
    while (keyQueue.length > 0) {
      const code = keyQueue.shift();
      if (code === 'KeyM') {
        audio.toggleMute();
        continue;
      }
      if (state.screen === 'title' && (code === 'Enter' || code === 'Space')) startRun();
      else if (state.screen === 'upgrade' && ['Digit1', 'Digit2', 'Digit3'].includes(code)) {
        applyChoice(Number(code.slice(-1)) - 1);
      } else if ((state.screen === 'over' || state.screen === 'victory') && code === 'KeyR') startRun();
      else if ((state.screen === 'over' || state.screen === 'victory') && code === 'KeyT') state.screen = 'title';
    }
  }

  function update(dt) {
    state.time += dt;
    state.mouseX = input.mouseX;
    state.mouseY = input.mouseY;
    if (state.banner) {
      state.banner.t += dt;
      if (state.banner.t >= state.banner.ttl) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - dt * 26);
    state.hurtFlash = Math.max(0, state.hurtFlash - dt);

    handleKeys();
    if (state.screen === 'play') {
      stepPlay(dt, liveIntent());
    } else {
      input.takeDash();
      input.takeConfirm();
      // Idle life behind the screens: embers drift up like sparks from a fire.
      if (state.screen === 'title' && rng.next() < dt * 6) {
        particles.trail(rng.range(60, ARENA.width - 60), ARENA.height - 30, COLORS.ember);
      }
    }
    particles.update(dt);
    handleButtons(input.drainClicks());
    state.enemiesLeft = state.spawnQueue.length + state.enemies.length;
  }

  function draw() {
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate(rng.range(-state.shake, state.shake), rng.range(-state.shake, state.shake));
    }
    drawBackground(ctx, state);
    state.buttons = [];
    if (state.screen !== 'title') {
      drawEmbers(ctx, state);
      drawOrbs(ctx, state);
      drawEnemies(ctx, state);
      drawBolts(ctx, state);
      if (state.screen !== 'over') drawPlayer(ctx, state);
    } else {
      drawPlayer(ctx, state);
    }
    particles.draw(ctx);
    ctx.restore();

    if (state.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 70, ${state.hurtFlash * 0.55})`;
      ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    }
    if (state.screen === 'play' || state.screen === 'upgrade') drawHud(ctx, state);
    if (state.screen === 'title') drawTitle(ctx, state);
    else if (state.screen === 'upgrade') drawUpgrade(ctx, state);
    else if (state.screen === 'over') drawGameOver(ctx, state);
    else if (state.screen === 'victory') drawVictory(ctx, state);
    if (audio.muted) {
      ctx.save();
      ctx.font = '700 12px Verdana, Geneva, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.dimText;
      ctx.fillText('MUTED (M)', ARENA.width - ARENA.wall, ARENA.height - 8);
      ctx.restore();
    }
  }

  return {
    state,
    particles,
    startRun,
    beginWave,
    applyChoice,
    stepPlay,
    update,
    draw,
    damagePlayer,
    audio,
  };
}
