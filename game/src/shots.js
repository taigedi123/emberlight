// Screenshot scenes behind ?shot=title|play|boss|end&seed=N. Each scene runs
// the real game forward with a simple autopilot at a fixed step, so the frame
// is a moment a real run produces — title ambience, mid-wave action, a boss
// fight, and a keeper who stops dodging and is overwhelmed for the end screen.
// The play and boss scenes stop on a dense moment (enemies up, bolts flying)
// rather than at a fixed time, so the frame shows the game mid-fight.

const STEP = 1 / 30;

function pilotIntent(state) {
  const p = state.player;
  let moveX = 0;
  let moveY = 0;
  let nearest = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    if (e.spawnTimer > 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
    if (d < 150) {
      const weight = ((150 - d) / 150) * 1.7;
      moveX += ((p.x - e.x) / d) * weight;
      moveY += ((p.y - e.y) / d) * weight;
    }
  }
  let ember = null;
  let emberDist = Infinity;
  for (const em of state.embers) {
    const d = Math.hypot(em.x - p.x, em.y - p.y);
    if (d < emberDist) {
      emberDist = d;
      ember = em;
    }
  }
  if (ember && nearestDist > 120 && emberDist > 1) {
    moveX += ((ember.x - p.x) / emberDist) * 0.7;
    moveY += ((ember.y - p.y) / emberDist) * 0.7;
  }
  moveX += ((480 - p.x) / 480) * 0.22;
  moveY += ((270 - p.y) / 270) * 0.22;
  const length = Math.hypot(moveX, moveY);
  if (length > 1) {
    moveX /= length;
    moveY /= length;
  }
  const aim = nearest ?? ember ?? { x: 480, y: 180 };
  return {
    moveX,
    moveY,
    aimX: aim.x,
    aimY: aim.y,
    firing: nearest !== null && nearestDist < 480,
    dash: nearestDist < 78,
  };
}

const IDLE = { moveX: 0, moveY: 0, aimX: 480, aimY: 200, firing: false, dash: false };

/**
 * Step the game with `pilot` flying it, advancing the cosmetic clock and the
 * particles alongside the rules (the live loop does both in update()). Stops
 * early when `until(state)` is true, when an upgrade screen is reached (the
 * caller picks), or when the run ends.
 */
function runPilot(game, seconds, pilot, until = null) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.state.screen !== 'play') return;
    game.stepPlay(STEP, pilot(game.state));
    game.state.time += STEP;
    game.particles.update(STEP);
    if (until && until(game.state)) return;
  }
}

const denseFight = (minEnemies) => (state) =>
  state.enemies.filter((e) => e.spawnTimer <= 0).length >= minEnemies && state.bolts.length >= 2;

export function stageShot(game, name, seed) {
  const state = game.state;
  state.mouseX = 480;
  state.mouseY = 470;
  if (name === 'play') {
    game.startRun();
    // Fight on, choosing gifts as waves clear, and take the frame on the
    // first crowded moment from wave 2 onward: enemies up, bolts flying.
    let restarted = false;
    for (let i = 0; i < 70 / STEP; i += 1) {
      if (state.screen === 'upgrade') {
        game.applyChoice(i % 3);
        continue;
      }
      if (state.screen === 'over') {
        if (restarted) break;
        restarted = true;
        game.startRun();
        continue;
      }
      if (state.screen !== 'play') break;
      game.stepPlay(STEP, pilotIntent(state));
      state.time += STEP;
      game.particles.update(STEP);
      if (state.runTime > 12 && state.wave >= 2 && denseFight(4)(state)) break;
    }
  } else if (name === 'boss') {
    game.startRun();
    // A keeper mid-run: a few gifts already taken, then wave 5's Dreadmaw.
    state.stats.damageMul = 1.55;
    state.stats.fireRateMul = 1.25;
    state.stats.projectiles = 2;
    state.player.maxHp = 125;
    state.player.hp = 118;
    state.score = 6850;
    state.kills = 61;
    game.beginWave(5);
    // Stop with the Dreadmaw alive on screen and its orb burst in the air.
    runPilot(game, 20, pilotIntent, (s) => {
      const boss = s.enemies.find((e) => e.kind === 'dreadmaw' && e.spawnTimer <= 0);
      return boss !== undefined && s.orbs.length >= 4 && s.bolts.length >= 2;
    });
    const bossAlive = state.enemies.some((e) => e.kind === 'dreadmaw');
    if (state.screen !== 'play' || !bossAlive) {
      game.beginWave(5);
      runPilot(game, 5, pilotIntent);
    }
  } else if (name === 'end') {
    game.startRun();
    // A real fight first, across a few waves, and a real score.
    for (let round = 0; round < 3 && state.screen !== 'over'; round += 1) {
      runPilot(game, 40, pilotIntent);
      if (state.screen === 'upgrade') game.applyChoice(round % 3);
    }
    // Then the keeper stands their ground and the dark takes them.
    for (let i = 0; i < 90 / STEP && state.screen === 'play'; i += 1) {
      game.stepPlay(STEP, IDLE);
      game.state.time += STEP;
      game.particles.update(STEP);
    }
    if (state.screen !== 'over') {
      state.player.hurtTimer = 0;
      state.player.dashTimer = 0;
      game.damagePlayer(9999);
    }
  } else {
    // Title: let the ambient embers rise for a few seconds.
    state.screen = 'title';
    for (let i = 0; i < 3.5 / STEP; i += 1) game.update(STEP);
    state.mouseX = 480;
    state.mouseY = 470;
  }
  return state.screen;
}
