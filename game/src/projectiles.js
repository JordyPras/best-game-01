// Bullets (the warden's ember bolts) and enemy shots: movement, lifetime,
// and the circle tests that resolve hits. Damage application lives with the
// enemy/player modules; this file only moves shots and reports contacts.

import { VIEW_WIDTH, VIEW_HEIGHT, WALL } from './config.js';
import { distance } from './random.js';

export function fireBolt(state, x, y, angle, { damage, speed, radius, pierce, color = '#ffd27a' }) {
  state.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage, radius, pierce, color, life: 1.4, hitIds: new Set() });
}

export function fireEnemyShot(state, x, y, angle, { damage, speed, radius = 6, color = '#ff5d7a' }) {
  state.enemyShots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage, radius, color, life: 4 });
}

function outOfArena(x, y, margin) {
  return x < WALL - margin || x > VIEW_WIDTH - WALL + margin || y < WALL - margin || y > VIEW_HEIGHT - WALL + margin;
}

export function updateProjectiles(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || outOfArena(b.x, b.y, 30)) state.bullets.splice(i, 1);
  }
  for (let i = state.enemyShots.length - 1; i >= 0; i -= 1) {
    const s = state.enemyShots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0 || outOfArena(s.x, s.y, 30)) state.enemyShots.splice(i, 1);
  }
}

// Every bullet/enemy overlap this frame. `onHit` returns true when the bullet
// is consumed by that enemy (no pierce left).
export function bulletEnemyContacts(state, onHit) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    let consumed = false;
    for (const enemy of state.enemies) {
      if (enemy.dead || bullet.hitIds.has(enemy.id)) continue;
      if (distance(bullet.x, bullet.y, enemy.x, enemy.y) <= bullet.radius + enemy.radius) {
        bullet.hitIds.add(enemy.id);
        if (onHit(bullet, enemy)) {
          consumed = true;
          break;
        }
      }
    }
    if (consumed) state.bullets.splice(i, 1);
  }
}

export function shotPlayerContact(state, player) {
  for (let i = state.enemyShots.length - 1; i >= 0; i -= 1) {
    const shot = state.enemyShots[i];
    if (distance(shot.x, shot.y, player.x, player.y) <= shot.radius + player.radius * 0.8) {
      state.enemyShots.splice(i, 1);
      return shot;
    }
  }
  return null;
}
