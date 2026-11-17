// Emberhold — entry point. Owns the game state, the screen state machine,
// the fixed-timestep update, and the canvas setup. Update work is delegated
// to the feature modules; this file only wires them together.

import { COMBO, FINAL_WAVE, PICKUP_TUNING, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { makeRng } from './random.js';
import { createInput, endFrame, keyPressed } from './input.js';
import { createPlayer, damagePlayer, updatePlayer } from './player.js';
import { bulletEnemyContacts, shotPlayerContact, updateProjectiles } from './projectiles.js';
import { hitEnemy, updateEnemies } from './enemies.js';
import { updateEffects } from './particles.js';
import { updatePickups } from './pickups.js';
import { startWave, updateWaves, waveCleared } from './waves.js';
import { applyUpgrade, rollUpgrades } from './upgrades.js';
import { render } from './render.js';
import { readShotParams, stageScreenshot } from './shots.js';
import { ensureAudio, isMuted, setMuted, sfx } from './audio.js';
import { loadBestScore, loadMuted, saveBestScore, saveMuted } from './storage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);
  canvas.style.width = `${Math.floor(VIEW_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_HEIGHT * scale)}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - VIEW_WIDTH * scale) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - VIEW_HEIGHT * scale) / 2)}px`;
}

// The input listeners are attached once and shared by every run: creating a
// fresh input per reset would pile up duplicate listeners on the canvas.
function createState(input) {
  return {
    screen: 'title',
    time: 0,
    rng: makeRng((Date.now() ^ 0x9e3779b9) >>> 0),
    input,
    player: createPlayer(VIEW_WIDTH / 2, VIEW_HEIGHT / 2),
    bullets: [],
    enemyShots: [],
    enemies: [],
    particles: [],
    texts: [],
    pickups: [],
    shockwaves: [],
    wave: 0,
    waveTime: 0,
    spawnQueue: [],
    spawnTimer: 0,
    trickleTimer: 0,
    bannerTimer: 0,
    bannerText: '',
    score: 0,
    kills: 0,
    best: loadBestScore(),
    comboKills: 0,
    comboTimer: 0,
    comboWindow: COMBO.windowSeconds,
    multiplier: 1,
    scoreScale: 1,
    dashCooldownScale: 1,
    upgradeStacks: {},
    upgradesTaken: [],
    upgradeChoices: [],
    upgradeRects: [],
    startRect: null,
    restartRect: null,
    boss: null,
    bossDefeated: false,
    shake: 0,
    flashTimer: 0,
    muted: loadMuted(),
    frozen: false,
    runId: 0,
  };
}

const sharedInput = createInput(canvas);
const state = createState(sharedInput);
setMuted(state.muted);

function resetRun() {
  const fresh = createState(sharedInput);
  fresh.best = state.best;
  fresh.muted = state.muted;
  fresh.runId = state.runId + 1;
  Object.assign(state, fresh);
  sharedInput.keys.clear();
  sharedInput.pressed.clear();
  sharedInput.mouseDown = false;
  state.screen = 'playing';
  startWave(state, 1);
}

function startRunFromTitle() {
  ensureAudio();
  sfx.click();
  resetRun();
}

function endRun(won) {
  state.screen = won ? 'victory' : 'over';
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }
  if (won) sfx.victory();
  else sfx.gameOver();
  announce(won ? `Victory. Score ${state.score}.` : `Game over. Score ${state.score}. Wave ${state.wave}.`);
}

function announce(message) {
  if (statusLine) statusLine.textContent = message;
}

function pointInRect(x, y, rect) {
  return rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function collectPickup(pickup) {
  const player = state.player;
  if (pickup.kind === 'heart') {
    player.hp = Math.min(player.maxHp, player.hp + PICKUP_TUNING.heart.heal);
    sfx.heart();
  } else if (pickup.kind === 'shard') {
    state.score += PICKUP_TUNING.shard.score * state.multiplier;
    sfx.pickup();
  } else if (pickup.kind === 'rapid') {
    player.rapidUntil = state.time + PICKUP_TUNING.rapid.duration;
    sfx.pickup();
  } else if (pickup.kind === 'shield') {
    player.shieldCharges += 1;
    sfx.pickup();
  }
}

function update(dt) {
  const input = state.input;

  // Global keys, available on every screen.
  if (keyPressed(input, 'm', 'M')) {
    state.muted = !state.muted;
    setMuted(state.muted);
    saveMuted(state.muted);
  }
  if (input.clicked || keyPressed(input, 'Enter', ' ')) ensureAudio();

  if (state.screen === 'title') {
    if (keyPressed(input, 'Enter') || (input.clicked && pointInRect(input.clickedAt.x, input.clickedAt.y, state.startRect))) {
      startRunFromTitle();
    }
    return;
  }

  if (state.screen === 'paused') {
    if (keyPressed(input, 'p', 'P', 'Escape') || input.clicked) {
      state.screen = 'playing';
      sfx.click();
    }
    if (keyPressed(input, 'r', 'R')) resetRun();
    return;
  }

  if (state.screen === 'over' || state.screen === 'victory') {
    if (keyPressed(input, 'r', 'R', 'Enter') || (input.clicked && pointInRect(input.clickedAt.x, input.clickedAt.y, state.restartRect))) {
      resetRun();
    }
    return;
  }

  if (state.screen === 'upgrade') {
    const choiceIndex = keyPressed(input, '1') ? 0 : keyPressed(input, '2') ? 1 : keyPressed(input, '3') ? 2 : -1;
    let chosen = choiceIndex >= 0 ? state.upgradeChoices[choiceIndex] : null;
    if (!chosen && input.clicked) {
      state.upgradeRects.forEach((rect, index) => {
        if (pointInRect(input.clickedAt.x, input.clickedAt.y, rect)) chosen = state.upgradeChoices[index];
      });
    }
    if (chosen) {
      applyUpgrade(state, chosen);
      sfx.upgrade();
      state.screen = 'playing';
      startWave(state, state.wave + 1);
    }
    return;
  }

  // Playing.
  if (keyPressed(input, 'p', 'P', 'Escape')) {
    state.screen = 'paused';
    sfx.click();
    return;
  }

  state.time += dt;
  state.flashTimer = Math.max(0, state.flashTimer - dt);

  // Combo decay.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.comboKills = 0;
  }
  state.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.comboKills / COMBO.stepKills));

  updatePlayer(state, dt);
  updateWaves(state, dt);
  updateEnemies(state, dt);
  updateProjectiles(state, dt);
  bulletEnemyContacts(state, (bullet, enemy) => hitEnemy(state, bullet, enemy));
  const shot = shotPlayerContact(state, state.player);
  if (shot) damagePlayer(state, shot.damage, shot.x - shot.vx * 0.05, shot.y - shot.vy * 0.05);
  updatePickups(state, dt, collectPickup);
  updateEffects(state, dt);

  if (state.player.hp <= 0) {
    endRun(false);
    return;
  }
  if (state.bossDefeated) {
    endRun(true);
    return;
  }
  if (waveCleared(state)) {
    if (state.wave >= FINAL_WAVE) {
      endRun(true);
    } else {
      // Restore per-wave shields, then offer the boon choice.
      const player = state.player;
      if (player.shieldPerWave) player.shieldCharges = Math.max(player.shieldCharges, player.shieldPerWave);
      state.upgradeChoices = rollUpgrades(state);
      state.screen = 'upgrade';
      announce(`Wave ${state.wave} cleared. Choose a boon.`);
    }
  }
}

let lastTimestamp = 0;

function frame(timestamp) {
  const dt = Math.min(1 / 30, lastTimestamp === 0 ? 1 / 60 : (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;
  if (!state.frozen) {
    update(dt);
    if (state.screen === 'title' || state.screen === 'upgrade' || state.screen === 'paused') state.time += dt;
  }
  render(ctx, state);
  endFrame(state.input);
  window.requestAnimationFrame(frame);
}

function boot() {
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  const shot = readShotParams();
  if (shot) {
    stageScreenshot(state, shot.shot, shot.seed);
    render(ctx, state);
    window.requestAnimationFrame(frame);
    return;
  }
  window.requestAnimationFrame(frame);
}

boot();
