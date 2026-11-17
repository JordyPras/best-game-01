// Emberhold — tuning, palette, and content tables.
// Every number the game balances on lives here so render/ and update code
// stays free of magic constants.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const WALL = 26; // arena margin: entities stay inside this border

export const PALETTE = {
  skyTop: '#0a0e24',
  skyBottom: '#131a3d',
  ground: '#121839',
  wall: '#2a3568',
  wallGlow: '#4d5fb8',
  ember: '#ff9a3c',
  emberHot: '#ffd27a',
  emberDeep: '#e05d1f',
  teal: '#3ce8c8',
  violet: '#8f7bff',
  rose: '#ff5d7a',
  bone: '#f4ead8',
  dim: '#8b93b8',
  dark: '#04060f',
  hpGood: '#7de87d',
  hpLow: '#ff5d5d',
};

export const PLAYER_TUNING = {
  radius: 16,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.24, // seconds between shots
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.6,
  hurtInvuln: 0.9,
  contactKnockback: 260,
  magnetRadius: 90,
  regenPerSecond: 0,
};

export const ENEMY_TYPES = {
  mite: {
    name: 'Embermite', radius: 14, speed: 105, hp: 22, damage: 10, score: 50,
    body: '#46357f', rim: '#8f7bff', eye: '#ffd27a', cost: 1, unlockWave: 1,
  },
  skitter: {
    name: 'Skitter', radius: 11, speed: 195, hp: 14, damage: 8, score: 70,
    body: '#173a4d', rim: '#3ce8c8', eye: '#ffffff', cost: 1, unlockWave: 2,
  },
  husk: {
    name: 'Hollow Husk', radius: 24, speed: 58, hp: 110, damage: 18, score: 140,
    body: '#5a2c4b', rim: '#ff5d7a', eye: '#ff9a3c', cost: 3, unlockWave: 3,
  },
  spitter: {
    name: 'Spitter', radius: 15, speed: 82, hp: 34, damage: 8, score: 110,
    body: '#2d4a22', rim: '#a8e05d', eye: '#ffe95d', cost: 2, unlockWave: 4,
    shotInterval: 2.1, shotSpeed: 235, keepDistance: 300,
  },
  splitter: {
    name: 'Broodmother', radius: 20, speed: 74, hp: 46, damage: 12, score: 130,
    body: '#5e3a1a', rim: '#ff9a3c', eye: '#ffffff', cost: 2, unlockWave: 5,
    children: 2,
  },
};

export const BOSS_TUNING = {
  name: 'The Hollow',
  radius: 46,
  speed: 52,
  hp: 1500,
  damage: 22,
  score: 2500,
  body: '#1c1030',
  rim: '#c86bff',
  eye: '#ff5d5d',
  burstInterval: 2.6,
  burstShots: 12,
  summonInterval: 7,
  summonCount: 3,
};

export const FINAL_WAVE = 10;

export const COMBO = {
  windowSeconds: 3.5,
  stepKills: 5, // every 5 chained kills raises the multiplier by 1
  maxMultiplier: 8,
};

// Wave budget in enemy "cost" points. Wave 10 is the boss wave (see waves.js).
export function waveBudget(wave) {
  return 5 + wave * 3;
}

export function waveHpScale(wave) {
  return 1 + 0.09 * (wave - 1);
}

export function waveSpeedScale(wave) {
  return 1 + 0.02 * (wave - 1);
}

// Pickups: [id, dropChanceOnKill, lifetimeSeconds]
export const PICKUP_TUNING = {
  heart: { chance: 0.05, heal: 22, lifetime: 9 },
  shard: { chance: 0.16, score: 120, lifetime: 9 },
  rapid: { chance: 0.035, duration: 6, lifetime: 9 },
  shield: { chance: 0.03, lifetime: 9 },
};
