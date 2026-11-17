// Particles, floating score text, and shockwave rings: all the short-lived
// feedback that makes hits feel like hits. Additive glow is done at draw time.

import { range } from './random.js';

export function spawnBurst(state, x, y, { color, count = 14, speed = 220, size = 3, life = 0.55 }) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const velocity = speed * (0.3 + state.rng() * 0.9);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: life * (0.6 + state.rng() * 0.7),
      maxLife: life,
      size: size * (0.6 + state.rng() * 0.9),
      color,
      drag: 3.2,
    });
  }
}

export function spawnSparks(state, x, y, color) {
  spawnBurst(state, x, y, { color, count: 8, speed: 300, size: 2.4, life: 0.35 });
}

export function spawnEmberTrail(state, x, y) {
  state.particles.push({
    x: x + range(state.rng, -4, 4),
    y: y + range(state.rng, -4, 4),
    vx: range(state.rng, -18, 18),
    vy: range(state.rng, -42, -14),
    life: range(state.rng, 0.3, 0.6),
    maxLife: 0.6,
    size: range(state.rng, 1.6, 3),
    color: '#ff9a3c',
    drag: 0.6,
  });
}

export function spawnShockwave(state, x, y, color, maxRadius) {
  state.shockwaves.push({ x, y, radius: 8, maxRadius, color, life: 0.4, maxLife: 0.4 });
}

export function spawnText(state, x, y, text, color, size = 18) {
  state.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
}

export function updateEffects(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    const drag = 1 - Math.min(1, p.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = state.texts.length - 1; i >= 0; i -= 1) {
    const t = state.texts[i];
    t.life -= dt;
    t.y -= 42 * dt;
    if (t.life <= 0) state.texts.splice(i, 1);
  }
  for (let i = state.shockwaves.length - 1; i >= 0; i -= 1) {
    const s = state.shockwaves[i];
    s.life -= dt;
    const progress = 1 - s.life / s.maxLife;
    s.radius = 8 + (s.maxRadius - 8) * progress * progress;
    if (s.life <= 0) state.shockwaves.splice(i, 1);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
}
