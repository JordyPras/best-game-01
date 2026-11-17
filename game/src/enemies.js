// Enemies: five chaser/shooter types plus the wave-10 boss. Each enemy carries
// its own steering state; the boss adds radial bursts and minion summons.

import { BOSS_TUNING, ENEMY_TYPES, VIEW_WIDTH, VIEW_HEIGHT, WALL, waveHpScale, waveSpeedScale } from './config.js';
import { angleTo, clamp, distance, range } from './random.js';
import { fireEnemyShot } from './projectiles.js';
import { spawnBurst, spawnShockwave, spawnText } from './particles.js';
import { maybeDropPickup } from './pickups.js';
import { damagePlayer } from './player.js';
import { sfx } from './audio.js';

let nextEnemyId = 1;

export function spawnEnemy(state, type, x, y) {
  const def = ENEMY_TYPES[type];
  const hpScale = waveHpScale(state.wave);
  const enemy = {
    id: nextEnemyId,
    type,
    name: def.name,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    speed: def.speed * waveSpeedScale(state.wave) * range(state.rng, 0.92, 1.08),
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    damage: def.damage,
    score: def.score,
    body: def.body,
    rim: def.rim,
    eye: def.eye,
    hitFlash: 0,
    touchCooldown: 0,
    shootCooldown: range(state.rng, 0.8, 1.6),
    wobble: state.rng() * Math.PI * 2,
    isBoss: false,
    dead: false,
  };
  nextEnemyId += 1;
  state.enemies.push(enemy);
  return enemy;
}

export function spawnBoss(state) {
  const boss = {
    id: nextEnemyId,
    type: 'boss',
    name: BOSS_TUNING.name,
    x: VIEW_WIDTH / 2,
    y: WALL + 120,
    vx: 0,
    vy: 0,
    radius: BOSS_TUNING.radius,
    speed: BOSS_TUNING.speed,
    hp: BOSS_TUNING.hp,
    maxHp: BOSS_TUNING.hp,
    damage: BOSS_TUNING.damage,
    score: BOSS_TUNING.score,
    body: BOSS_TUNING.body,
    rim: BOSS_TUNING.rim,
    eye: BOSS_TUNING.eye,
    hitFlash: 0,
    touchCooldown: 0,
    shootCooldown: 1.2,
    summonCooldown: BOSS_TUNING.summonInterval,
    burstAngle: 0,
    wobble: 0,
    isBoss: true,
    dead: false,
  };
  nextEnemyId += 1;
  state.enemies.push(boss);
  state.boss = boss;
  return boss;
}

function steerToward(enemy, targetX, targetY, dt, agility) {
  const angle = angleTo(enemy.x, enemy.y, targetX, targetY);
  const targetVx = Math.cos(angle) * enemy.speed;
  const targetVy = Math.sin(angle) * enemy.speed;
  const blend = 1 - Math.exp(-agility * dt);
  enemy.vx += (targetVx - enemy.vx) * blend;
  enemy.vy += (targetVy - enemy.vy) * blend;
}

export function updateEnemies(state, dt) {
  const player = state.player;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 6);
    enemy.touchCooldown = Math.max(0, enemy.touchCooldown - dt);
    enemy.wobble += dt * 3;
    enemy.lookX = player.x - enemy.x;
    enemy.lookY = player.y - enemy.y;

    if (enemy.isBoss) {
      updateBoss(state, enemy, dt);
    } else if (enemy.type === 'skitter') {
      steerToward(enemy, player.x, player.y, dt, 5);
      const perpendicular = angleTo(enemy.x, enemy.y, player.x, player.y) + Math.PI / 2;
      const weave = Math.sin(enemy.wobble * 1.7) * 90;
      enemy.vx += Math.cos(perpendicular) * weave * dt * 3;
      enemy.vy += Math.sin(perpendicular) * weave * dt * 3;
    } else if (enemy.type === 'spitter') {
      const d = distance(enemy.x, enemy.y, player.x, player.y);
      const def = ENEMY_TYPES.spitter;
      if (d > def.keepDistance + 40) steerToward(enemy, player.x, player.y, dt, 4);
      else if (d < def.keepDistance - 60) steerToward(enemy, 2 * enemy.x - player.x, 2 * enemy.y - player.y, dt, 4);
      else {
        enemy.vx *= 1 - Math.min(1, 4 * dt);
        enemy.vy *= 1 - Math.min(1, 4 * dt);
      }
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0 && d < 560) {
        enemy.shootCooldown = def.shotInterval * range(state.rng, 0.85, 1.15);
        fireEnemyShot(state, enemy.x, enemy.y, angleTo(enemy.x, enemy.y, player.x, player.y), {
          damage: def.damage, speed: def.shotSpeed, color: '#a8e05d',
        });
        spawnBurst(state, enemy.x, enemy.y, { color: '#a8e05d', count: 5, speed: 90, size: 2, life: 0.25 });
      }
    } else {
      steerToward(enemy, player.x, player.y, dt, 3.2);
    }

    enemy.x = clamp(enemy.x + enemy.vx * dt, WALL + enemy.radius * 0.5, VIEW_WIDTH - WALL - enemy.radius * 0.5);
    enemy.y = clamp(enemy.y + enemy.vy * dt, WALL + enemy.radius * 0.5, VIEW_HEIGHT - WALL - enemy.radius * 0.5);

    // Contact damage, throttled per enemy so one touch is not a drain.
    if (enemy.touchCooldown <= 0 && distance(enemy.x, enemy.y, player.x, player.y) <= enemy.radius + player.radius * 0.85) {
      enemy.touchCooldown = 0.8;
      damagePlayer(state, enemy.damage, enemy.x, enemy.y);
    }
  }
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  if (state.boss && state.boss.dead) state.boss = null;
}

function updateBoss(state, boss, dt) {
  const player = state.player;
  steerToward(boss, player.x, player.y, dt, 1.6);
  const enraged = boss.hp < boss.maxHp * 0.4;
  boss.shootCooldown -= dt * (enraged ? 1.4 : 1);
  if (boss.shootCooldown <= 0) {
    boss.shootCooldown = BOSS_TUNING.burstInterval;
    boss.burstAngle += 0.35;
    const shots = enraged ? BOSS_TUNING.burstShots + 6 : BOSS_TUNING.burstShots;
    for (let i = 0; i < shots; i += 1) {
      const angle = boss.burstAngle + (i / shots) * Math.PI * 2;
      fireEnemyShot(state, boss.x, boss.y, angle, { damage: 12, speed: 185, radius: 7, color: '#c86bff' });
    }
    spawnShockwave(state, boss.x, boss.y, '#c86bff', 90);
    sfx.bossRoar();
  }
  boss.summonCooldown -= dt;
  if (boss.summonCooldown <= 0) {
    boss.summonCooldown = BOSS_TUNING.summonInterval;
    for (let i = 0; i < BOSS_TUNING.summonCount; i += 1) {
      const angle = (i / BOSS_TUNING.summonCount) * Math.PI * 2 + state.rng();
      spawnEnemy(state, 'mite', boss.x + Math.cos(angle) * (boss.radius + 26), boss.y + Math.sin(angle) * (boss.radius + 26));
    }
    spawnBurst(state, boss.x, boss.y, { color: '#c86bff', count: 22, speed: 200, size: 3, life: 0.5 });
  }
}

// Damage from a bullet. Returns true when the bullet is consumed.
export function hitEnemy(state, bullet, enemy) {
  enemy.hp -= bullet.damage;
  enemy.hitFlash = 1;
  spawnText(state, enemy.x + range(state.rng, -10, 10), enemy.y - enemy.radius - 6, String(bullet.damage), '#ffd27a', 15);
  spawnBurst(state, bullet.x, bullet.y, { color: enemy.rim, count: 4, speed: 170, size: 2.2, life: 0.3 });
  if (enemy.hp <= 0) killEnemy(state, enemy);
  else sfx.enemyHit();
  if (bullet.pierce > 0) {
    bullet.pierce -= 1;
    return false;
  }
  return true;
}

export function killEnemy(state, enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  state.kills += 1;
  state.comboKills += 1;
  state.comboTimer = state.comboWindow;
  const multiplier = state.multiplier;
  const gained = Math.round(enemy.score * multiplier * state.scoreScale);
  state.score += gained;
  spawnText(state, enemy.x, enemy.y - 10, `+${gained}`, '#f4ead8', 17);
  spawnBurst(state, enemy.x, enemy.y, { color: enemy.rim, count: enemy.isBoss ? 60 : 18, speed: enemy.isBoss ? 340 : 250, size: 3.4, life: 0.6 });
  spawnBurst(state, enemy.x, enemy.y, { color: '#ffd27a', count: 8, speed: 160, size: 2.6, life: 0.5 });
  spawnShockwave(state, enemy.x, enemy.y, enemy.rim, enemy.isBoss ? 170 : 60);
  state.shake = Math.min(16, state.shake + (enemy.isBoss ? 14 : 3));
  sfx.enemyDown();
  if (enemy.type === 'splitter') {
    for (let i = 0; i < ENEMY_TYPES.splitter.children; i += 1) {
      const angle = state.rng() * Math.PI * 2;
      const child = spawnEnemy(state, 'mite', enemy.x + Math.cos(angle) * 20, enemy.y + Math.sin(angle) * 20);
      child.speed *= 1.15;
    }
  }
  if (enemy.isBoss) {
    state.bossDefeated = true;
  } else {
    maybeDropPickup(state, enemy.x, enemy.y);
  }
}
