// The screens drawn over the arena: title, the upgrade choice, game over and
// dawn (victory). Each registers its clickable rectangles into state.buttons
// as it draws — the button you see is the button that works.

import { ARENA, COLORS, WAVES_TOTAL } from './config.js';

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

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(5, 2, 14, ${alpha})`;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
}

function button(ctx, state, x, y, w, h, label, action) {
  const hover = state.mouseX >= x && state.mouseX <= x + w && state.mouseY >= y && state.mouseY <= y + h;
  ctx.save();
  ctx.fillStyle = hover ? 'rgba(255, 179, 71, 0.92)' : 'rgba(255, 179, 71, 0.78)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.font = `800 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#241038';
  ctx.fillText(label, x + w / 2, y + h / 2 + 6);
  ctx.restore();
  state.buttons.push({ x, y, w, h, action });
}

export function drawTitle(ctx, state) {
  dim(ctx, 0.45);
  ctx.save();
  ctx.textAlign = 'center';
  // The name, lit like a sign.
  ctx.font = `800 74px ${FONT}`;
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('EMBERLIGHT', ARENA.width / 2, 168);
  ctx.shadowBlur = 0;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillStyle = COLORS.ember;
  ctx.fillText('The last flame of the valley still burns. You are its keeper.', ARENA.width / 2, 204);
  ctx.fillStyle = COLORS.dimText;
  ctx.font = `400 14.5px ${FONT}`;
  ctx.fillText('Wraiths come with the dark to snuff it out. Hold the arena for', ARENA.width / 2, 232);
  ctx.fillText(`${WAVES_TOTAL} waves — gather their embers, grow stronger between waves,`, ARENA.width / 2, 254);
  ctx.fillText('and face the Dreadmaw. Survive to dawn.', ARENA.width / 2, 276);

  // Controls, two tidy columns.
  ctx.font = `600 14px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  const rows = [
    ['Move', 'W A S D  or  arrow keys'],
    ['Aim & fire', 'Mouse — hold to shoot'],
    ['Dash', 'Shift  or  right-click (briefly untouchable)'],
    ['Mute', 'M'],
  ];
  rows.forEach(([key, what], i) => {
    const y = 322 + i * 26;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.ember;
    ctx.fillText(key, ARENA.width / 2 - 14, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(what, ARENA.width / 2 + 2, y);
  });

  const pulse = 0.75 + 0.25 * Math.sin(state.time * 3.2);
  ctx.globalAlpha = pulse;
  button(ctx, state, ARENA.width / 2 - 130, 448, 260, 52, 'KINDLE THE FLAME', 'start');
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText('or press Enter', ARENA.width / 2, 528);
  if (state.best > 0) {
    ctx.fillStyle = COLORS.ember;
    ctx.fillText(`Best score so far: ${state.best}`, ARENA.width / 2, 36);
  }
  ctx.restore();
}

export function drawUpgrade(ctx, state) {
  dim(ctx, 0.62);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 30px ${FONT}`;
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Wave ${state.wave} held — the flame grows`, ARENA.width / 2, 108);
  ctx.shadowBlur = 0;
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText('Choose one gift before the next wave  (click, or press 1 · 2 · 3)', ARENA.width / 2, 138);

  const cardW = 252;
  const cardH = 268;
  const gap = 26;
  const totalW = cardW * 3 + gap * 2;
  const startX = (ARENA.width - totalW) / 2;
  const y = 168;
  state.choices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const hover = state.mouseX >= x && state.mouseX <= x + cardW && state.mouseY >= y && state.mouseY <= y + cardH;
    ctx.fillStyle = hover ? 'rgba(43, 24, 84, 0.97)' : 'rgba(26, 14, 54, 0.97)';
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? COLORS.ember : 'rgba(183, 168, 232, 0.4)';
    ctx.lineWidth = hover ? 3 : 1.5;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.stroke();
    ctx.font = `400 52px ${FONT}`;
    ctx.fillStyle = COLORS.ember;
    ctx.fillText(choice.glyph, x + cardW / 2, y + 78);
    ctx.font = `800 19px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(choice.name, x + cardW / 2, y + 122);
    ctx.font = `400 13.5px ${FONT}`;
    ctx.fillStyle = COLORS.dimText;
    wrapLines(ctx, choice.text, x + cardW / 2, y + 152, cardW - 36, 19);
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = COLORS.ember;
    ctx.fillText(`[ ${i + 1} ]`, x + cardW / 2, y + cardH - 18);
    state.buttons.push({ x, y, w: cardW, h: cardH, action: `upgrade:${i}` });
  });
  ctx.restore();
}

function wrapLines(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function statsGrid(ctx, state) {
  const rows = [
    ['Score', `${state.score}`],
    ['Best', `${state.best}`],
    ['Wave reached', `${state.wave} of ${WAVES_TOTAL}`],
    ['Wraiths banished', `${state.kills}`],
    ['Time in the dark', `${Math.floor(state.runTime / 60)}:${String(Math.floor(state.runTime % 60)).padStart(2, '0')}`],
  ];
  ctx.font = `600 15.5px ${FONT}`;
  rows.forEach(([key, value], i) => {
    const y = 268 + i * 27;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(key, ARENA.width / 2 - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(value, ARENA.width / 2 + 12, y);
  });
}

export function drawGameOver(ctx, state) {
  dim(ctx, 0.66);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 52px ${FONT}`;
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#ffd9e2';
  ctx.fillText('THE LIGHT GOES OUT', ARENA.width / 2, 158);
  ctx.shadowBlur = 0;
  ctx.font = `600 15.5px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText(`The wraiths take the valley — this time. The flame remembers ${state.score} points of fight.`, ARENA.width / 2, 192);
  statsGrid(ctx, state);
  button(ctx, state, ARENA.width / 2 - 120, 428, 240, 50, 'REKINDLE  (R)', 'restart');
  ctx.font = `600 12.5px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText('T for the title screen', ARENA.width / 2, 506);
  ctx.restore();
}

export function drawVictory(ctx, state) {
  dim(ctx, 0.55);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 56px ${FONT}`;
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('DAWN BREAKS', ARENA.width / 2, 158);
  ctx.shadowBlur = 0;
  ctx.font = `600 15.5px ${FONT}`;
  ctx.fillStyle = COLORS.ember;
  ctx.fillText(`All ${WAVES_TOTAL} waves held. The valley wakes, and the light is yours.`, ARENA.width / 2, 192);
  statsGrid(ctx, state);
  button(ctx, state, ARENA.width / 2 - 120, 428, 240, 50, 'PLAY AGAIN  (R)', 'restart');
  ctx.font = `600 12.5px ${FONT}`;
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText('T for the title screen', ARENA.width / 2, 506);
  ctx.restore();
}
