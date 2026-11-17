// The wave director: builds each wave's spawn queue from a cost budget,
// trickles enemies in from the arena edges, and reports when a wave is clear.
// Wave 10 replaces the queue with the boss plus a slow mite trickle.

import { ENEMY_TYPES, FINAL_WAVE, VIEW_WIDTH, VIEW_HEIGHT, WALL, waveBudget } from './config.js';
import { pick, range } from './random.js';
import { spawnBoss, spawnEnemy } from './enemies.js';
import { sfx } from './audio.js';

export function startWave(state, wave) {
  state.wave = wave;
  state.waveTime = 0;
  state.bannerTimer = 2.2;
  state.bannerText = wave === FINAL_WAVE ? 'THE HOLLOW STIRS' : `WAVE ${wave}`;
  state.spawnQueue = [];
  state.spawnTimer = 0.6;
  if (wave === FINAL_WAVE) {
    spawnBoss(state);
    state.trickleTimer = 6;
    sfx.bossRoar();
  } else {
    let budget = waveBudget(wave);
    const available = Object.keys(ENEMY_TYPES).filter((type) => ENEMY_TYPES[type].unlockWave <= wave);
    while (budget > 0) {
      const affordable = available.filter((type) => ENEMY_TYPES[type].cost <= budget);
      const type = pick(state.rng, affordable.length > 0 ? affordable : available);
      state.spawnQueue.push(type);
      budget -= ENEMY_TYPES[type].cost;
    }
    // Shuffle so the wave is not grouped by type.
    for (let i = state.spawnQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(state.rng() * (i + 1));
      [state.spawnQueue[i], state.spawnQueue[j]] = [state.spawnQueue[j], state.spawnQueue[i]];
    }
    sfx.waveStart();
  }
}

function edgeSpawnPoint(state) {
  const side = Math.floor(state.rng() * 4);
  const margin = WALL + 18;
  if (side === 0) return { x: range(state.rng, margin, VIEW_WIDTH - margin), y: margin };
  if (side === 1) return { x: range(state.rng, margin, VIEW_WIDTH - margin), y: VIEW_HEIGHT - margin };
  if (side === 2) return { x: margin, y: range(state.rng, margin, VIEW_HEIGHT - margin) };
  return { x: VIEW_WIDTH - margin, y: range(state.rng, margin, VIEW_HEIGHT - margin) };
}

export function updateWaves(state, dt) {
  state.waveTime += dt;
  if (state.bannerTimer > 0) state.bannerTimer -= dt;

  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    const interval = Math.max(0.22, 0.75 - state.wave * 0.04);
    if (state.spawnTimer <= 0) {
      state.spawnTimer = interval;
      const point = edgeSpawnPoint(state);
      spawnEnemy(state, state.spawnQueue.shift(), point.x, point.y);
    }
  }

  if (state.wave === FINAL_WAVE && !state.bossDefeated) {
    state.trickleTimer -= dt;
    if (state.trickleTimer <= 0) {
      state.trickleTimer = 7;
      const point = edgeSpawnPoint(state);
      spawnEnemy(state, 'mite', point.x, point.y);
    }
  }
}

export function waveCleared(state) {
  return state.spawnQueue.length === 0 && state.enemies.length === 0;
}
