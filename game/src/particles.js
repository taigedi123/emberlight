// Particles and floating score text: the juice. One pooled system the whole
// game feeds — sparks on hits, ember bursts on kills, a dash trail, dash-ready
// glints and rising "+50" numbers — drawn additively so light piles up.

const MAX_PARTICLES = 460;
const MAX_TEXTS = 28;

export function createParticles(rng) {
  const particles = [];
  const texts = [];

  function spawn(x, y, options) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const angle = options.angle ?? rng.angle();
    const speed = options.speed ?? rng.range(30, 130);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      ttl: options.ttl ?? rng.range(0.3, 0.7),
      size: options.size ?? rng.range(1.5, 3.2),
      color: options.color ?? '#ffb347',
      drag: options.drag ?? 2.6,
      gravity: options.gravity ?? 0,
      shrink: options.shrink ?? true,
    });
  }

  return {
    burst(x, y, color, count = 12, speed = 170) {
      for (let i = 0; i < count; i += 1) {
        spawn(x, y, { color, speed: rng.range(speed * 0.25, speed), ttl: rng.range(0.25, 0.65) });
      }
    },
    sparks(x, y, angle, color, count = 4) {
      for (let i = 0; i < count; i += 1) {
        spawn(x, y, {
          color,
          angle: angle + rng.range(-0.5, 0.5),
          speed: rng.range(120, 300),
          ttl: rng.range(0.1, 0.28),
          size: rng.range(1.2, 2.4),
        });
      }
    },
    trail(x, y, color) {
      spawn(x, y, { color, speed: rng.range(4, 26), ttl: rng.range(0.25, 0.45), size: rng.range(3, 6) });
    },
    ring(x, y, color, count = 26) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        spawn(x, y, { color, angle, speed: 260, ttl: 0.4, size: 2.6, drag: 3.4 });
      }
    },
    addText(x, y, text, color = '#ffe9a3', size = 15) {
      if (texts.length >= MAX_TEXTS) texts.shift();
      texts.push({ x, y, text, color, size, life: 0, ttl: 0.9 });
    },
    update(dt) {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          particles.splice(i, 1);
          continue;
        }
        const drag = Math.max(0, 1 - p.drag * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.life += dt;
        t.y -= 34 * dt;
        if (t.life >= t.ttl) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const fade = 1 - p.life / p.ttl;
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        const size = p.shrink ? p.size * fade + 0.4 : p.size;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      for (const t of texts) {
        const fade = 1 - t.life / t.ttl;
        ctx.globalAlpha = Math.min(1, fade * 1.6);
        ctx.font = `700 ${t.size}px Verdana, Geneva, sans-serif`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    },
    clear() {
      particles.length = 0;
      texts.length = 0;
    },
  };
}
