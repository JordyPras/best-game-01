// The warden: movement, dashing with brief invulnerability, aiming, and
// firing ember bolts. All derived stats (fire rate, damage, shots) live on
// the player object so upgrades can adjust them directly.

import { PLAYER_TUNING, VIEW_WIDTH, VIEW_HEIGHT, WALL } from './config.js';
import { angleTo, clamp } from './random.js';
import { moveAxis } from './input.js';
import { fireBolt } from './projectiles.js';
import { spawnBurst, spawnEmberTrail } from './particles.js';
import { sfx } from './audio.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PLAYER_TUNING.radius,
    speed: PLAYER_TUNING.speed,
    hp: PLAYER_TUNING.maxHp,
    maxHp: PLAYER_TUNING.maxHp,
    angle: -Math.PI / 2,
    fireInterval: PLAYER_TUNING.fireInterval,
    fireCooldown: 0,
    bulletSpeed: PLAYER_TUNING.bulletSpeed,
    bulletDamage: PLAYER_TUNING.bulletDamage,
    shots: 1,
    pierce: 0,
    dashCooldown: 0,
    dashTime: 0,
    dashAngle: 0,
    invuln: 0,
    magnetRadius: PLAYER_TUNING.magnetRadius,
    regen: PLAYER_TUNING.regenPerSecond,
    shieldCharges: 0,
    rapidUntil: 0,
    trailTimer: 0,
    walkCycle: 0,
    moving: false,
    recoil: 0,
  };
}

export function updatePlayer(state, dt) {
  const player = state.player;
  const input = state.input;

  player.angle = angleTo(player.x, player.y, input.mouseX, input.mouseY);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  if (player.regen > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  }

  const axis = moveAxis(input);
  player.moving = axis.x !== 0 || axis.y !== 0;

  // Dash: a short burst in the movement direction (or aim direction when
  // standing still), with invulnerability for its whole length.
  const dashPressed = input.pressed.has(' ') || input.pressed.has('Shift');
  if (dashPressed && player.dashCooldown <= 0 && player.dashTime <= 0) {
    player.dashTime = PLAYER_TUNING.dashTime;
    player.dashCooldown = PLAYER_TUNING.dashCooldown * state.dashCooldownScale;
    player.dashAngle = player.moving ? Math.atan2(axis.y, axis.x) : player.angle;
    player.invuln = Math.max(player.invuln, PLAYER_TUNING.dashTime + 0.05);
    sfx.dash();
    spawnBurst(state, player.x, player.y, { color: '#3ce8c8', count: 10, speed: 160, size: 2.6, life: 0.4 });
  }

  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.vx = Math.cos(player.dashAngle) * PLAYER_TUNING.dashSpeed;
    player.vy = Math.sin(player.dashAngle) * PLAYER_TUNING.dashSpeed;
  } else {
    const targetVx = axis.x * player.speed;
    const targetVy = axis.y * player.speed;
    const blend = 1 - Math.exp(-14 * dt);
    player.vx += (targetVx - player.vx) * blend;
    player.vy += (targetVy - player.vy) * blend;
  }

  player.x = clamp(player.x + player.vx * dt, WALL + player.radius, VIEW_WIDTH - WALL - player.radius);
  player.y = clamp(player.y + player.vy * dt, WALL + player.radius, VIEW_HEIGHT - WALL - player.radius);
  if (player.moving) player.walkCycle += dt * 10;

  // Ember trail while moving or dashing.
  player.trailTimer -= dt;
  if ((player.moving || player.dashTime > 0) && player.trailTimer <= 0) {
    player.trailTimer = 0.05;
    spawnEmberTrail(state, player.x - Math.cos(player.angle) * 10, player.y - Math.sin(player.angle) * 10);
  }

  // Hold mouse (or J) to fire.
  const firing = input.mouseDown || input.keys.has('j');
  const rapid = state.time < player.rapidUntil;
  const interval = rapid ? player.fireInterval * 0.55 : player.fireInterval;
  if (firing && player.fireCooldown <= 0) {
    player.fireCooldown = interval;
    const spread = 0.09;
    for (let i = 0; i < player.shots; i += 1) {
      const offset = (i - (player.shots - 1) / 2) * spread;
      const muzzleX = player.x + Math.cos(player.angle + offset) * (player.radius + 6);
      const muzzleY = player.y + Math.sin(player.angle + offset) * (player.radius + 6);
      fireBolt(state, muzzleX, muzzleY, player.angle + offset, {
        damage: player.bulletDamage,
        speed: player.bulletSpeed,
        radius: PLAYER_TUNING.bulletRadius,
        pierce: player.pierce,
        color: rapid ? '#3ce8c8' : '#ffd27a',
      });
    }
    player.recoil = 1;
    sfx.shoot();
    spawnBurst(state, player.x + Math.cos(player.angle) * (player.radius + 8), player.y + Math.sin(player.angle) * (player.radius + 8), {
      color: '#ffd27a', count: 3, speed: 120, size: 2, life: 0.18,
    });
  }
  player.recoil = Math.max(0, (player.recoil ?? 0) - dt * 8);
}

// Returns true when the hit actually damaged the warden.
export function damagePlayer(state, amount, fromX, fromY) {
  const player = state.player;
  if (player.invuln > 0 || state.screen !== 'playing') return false;
  if (player.shieldCharges > 0) {
    player.shieldCharges -= 1;
    player.invuln = 0.7;
    sfx.enemyDown();
    spawnBurst(state, player.x, player.y, { color: '#3ce8c8', count: 20, speed: 260, size: 3, life: 0.5 });
    return false;
  }
  player.hp -= amount;
  player.invuln = PLAYER_TUNING.hurtInvuln;
  state.shake = Math.min(16, state.shake + 9);
  state.flashTimer = 0.18;
  const push = angleTo(fromX, fromY, player.x, player.y);
  player.vx += Math.cos(push) * PLAYER_TUNING.contactKnockback;
  player.vy += Math.sin(push) * PLAYER_TUNING.contactKnockback;
  sfx.playerHurt();
  spawnBurst(state, player.x, player.y, { color: '#ff5d5d', count: 16, speed: 240, size: 3, life: 0.5 });
  return true;
}
