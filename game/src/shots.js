// Deterministic screenshot staging: with ?shot=start|play|upgrade|over the
// game builds a representative state with a fixed seed and freezes it, so a
// screenshot is a real render of the game's own code in a known moment.
// Normal play never passes these parameters.

import { makeRng } from './random.js';
import { spawnEnemy } from './enemies.js';
import { fireBolt } from './projectiles.js';
import { spawnBurst, spawnShockwave, spawnText } from './particles.js';
import { dropPickup } from './pickups.js';
import { rollUpgrades } from './upgrades.js';

export function readShotParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (!shot) return null;
    const seed = Number.parseInt(params.get('seed') ?? '1', 10);
    return { shot, seed: Number.isFinite(seed) ? seed : 1 };
  } catch {
    return null;
  }
}

export function stageScreenshot(state, shot, seed) {
  state.rng = makeRng(seed * 7919 + 13);
  state.frozen = true;
  state.time = 12.4;

  if (shot === 'start') {
    state.screen = 'title';
    return;
  }

  if (shot === 'play') {
    state.screen = 'playing';
    state.wave = 4;
    state.score = 2450;
    state.best = 5200;
    state.kills = 31;
    state.multiplier = 3;
    state.comboKills = 11;
    state.comboTimer = 2.1;
    state.player.hp = 72;
    state.player.x = 640;
    state.player.y = 400;
    state.player.shieldCharges = 1;
    state.player.shots = 2;
    state.bannerTimer = 0;
    const placements = [
      ['mite', 300, 200], ['mite', 980, 240], ['skitter', 420, 560],
      ['skitter', 900, 520], ['husk', 1030, 380], ['spitter', 240, 430],
      ['splitter', 760, 180], ['mite', 560, 260],
    ];
    for (const [type, x, y] of placements) {
      const enemy = spawnEnemy(state, type, x, y);
      if (type === 'husk') enemy.hp = Math.round(enemy.maxHp * 0.55);
      if (type === 'mite') enemy.hitFlash = 0.4;
    }
    fireBolt(state, 660, 380, -0.5, { damage: 12, speed: 640, radius: 5, pierce: 0 });
    fireBolt(state, 690, 350, -0.9, { damage: 12, speed: 640, radius: 5, pierce: 0 });
    fireBolt(state, 620, 300, -1.4, { damage: 12, speed: 640, radius: 5, pierce: 0 });
    spawnBurst(state, 300, 200, { color: '#8f7bff', count: 14, speed: 200, size: 3, life: 0.5 });
    spawnShockwave(state, 1030, 380, '#ff5d7a', 60);
    spawnText(state, 980, 210, '+150', '#f4ead8', 17);
    spawnText(state, 420, 530, '12', '#ffd27a', 15);
    dropPickup(state, 'heart', 520, 520);
    dropPickup(state, 'shard', 830, 300);
    return;
  }

  if (shot === 'upgrade') {
    state.screen = 'upgrade';
    state.wave = 5;
    state.score = 3120;
    state.best = 5200;
    state.kills = 44;
    state.player.hp = 64;
    state.upgradeChoices = rollUpgrades(state);
    return;
  }

  if (shot === 'over') {
    state.screen = 'over';
    state.wave = 6;
    state.score = 4180;
    state.best = 5200;
    state.kills = 57;
    state.player.hp = 0;
    state.upgradesTaken = ['Kindled Edge', 'Twin Flames', 'Sturdy Hearth'];
    spawnEnemy(state, 'mite', 320, 220);
    spawnEnemy(state, 'skitter', 940, 500);
    spawnBurst(state, 640, 360, { color: '#ff5d5d', count: 20, speed: 240, size: 3, life: 0.5 });
  }
}
