// Between-wave upgrades: the pool, the 3-card roll (no repeats within one
// choice, respecting caps), and applying the chosen upgrade to the warden.

export const UPGRADE_POOL = [
  {
    id: 'damage', name: 'Kindled Edge', glyph: '✦',
    description: '+25% bullet damage.',
    apply: (player) => { player.bulletDamage *= 1.25; },
  },
  {
    id: 'firerate', name: 'Rapid Lantern', glyph: '≋',
    description: '+20% fire rate.',
    apply: (player) => { player.fireInterval *= 0.83; },
  },
  {
    id: 'speed', name: 'Swift Steps', glyph: '➤',
    description: '+12% movement speed.',
    apply: (player) => { player.speed *= 1.12; },
  },
  {
    id: 'vitality', name: 'Sturdy Hearth', glyph: '♥',
    description: '+25 max health and heal 25.',
    apply: (player) => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); },
  },
  {
    id: 'multishot', name: 'Twin Flames', glyph: '✧',
    description: '+1 bolt per shot.',
    maxStacks: 2,
    apply: (player) => { player.shots += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Light', glyph: '⇶',
    description: 'Bolts pass through +1 enemy.',
    maxStacks: 3,
    apply: (player) => { player.pierce += 1; },
  },
  {
    id: 'dash', name: 'Slipstream', glyph: '↯',
    description: 'Dash recharges 30% faster.',
    maxStacks: 3,
    apply: (_player, state) => { state.dashCooldownScale *= 0.7; },
  },
  {
    id: 'magnet', name: 'Ember Call', glyph: '◎',
    description: '+70% pickup magnet radius.',
    maxStacks: 3,
    apply: (player) => { player.magnetRadius *= 1.7; },
  },
  {
    id: 'regen', name: 'Slow Burn', glyph: '♨',
    description: 'Regenerate +0.8 health per second.',
    maxStacks: 4,
    apply: (player) => { player.regen += 0.8; },
  },
  {
    id: 'velocity', name: 'Long Reach', glyph: '→',
    description: '+30% bolt speed, +10% damage.',
    apply: (player) => { player.bulletSpeed *= 1.3; player.bulletDamage *= 1.1; },
  },
  {
    id: 'shield', name: 'Warding Flame', glyph: '⛨',
    description: 'Gain a shield that blocks one hit each wave.',
    maxStacks: 2,
    apply: (player) => { player.shieldCharges += 1; player.shieldPerWave = (player.shieldPerWave ?? 0) + 1; },
  },
  {
    id: 'greed', name: 'Bright Bounty', glyph: '◆',
    description: '+40% score from every kill.',
    maxStacks: 3,
    apply: (_player, state) => { state.scoreScale *= 1.4; },
  },
];

export function rollUpgrades(state) {
  const taken = state.upgradeStacks;
  const available = UPGRADE_POOL.filter((upgrade) => {
    const max = upgrade.maxStacks ?? Infinity;
    return (taken[upgrade.id] ?? 0) < max;
  });
  const choices = [];
  const pool = [...available];
  while (choices.length < 3 && pool.length > 0) {
    const index = Math.floor(state.rng() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}

export function applyUpgrade(state, upgrade) {
  state.upgradeStacks[upgrade.id] = (state.upgradeStacks[upgrade.id] ?? 0) + 1;
  upgrade.apply(state.player, state);
  state.upgradesTaken.push(upgrade.name);
}
