// Pickups dropped by fallen enemies: hearts, score shards, rapid-fire stars,
// and shield bubbles. They drift toward the player inside the magnet radius
// and expire with a blink.

import { PICKUP_TUNING } from './config.js';
import { angleTo, distance, range } from './random.js';

let nextPickupId = 1;

export function maybeDropPickup(state, x, y) {
  const roll = state.rng();
  let acc = 0;
  for (const [kind, tuning] of Object.entries(PICKUP_TUNING)) {
    acc += tuning.chance;
    if (roll < acc) {
      state.pickups.push({
        id: nextPickupId,
        kind,
        x: x + range(state.rng, -10, 10),
        y: y + range(state.rng, -10, 10),
        life: tuning.lifetime,
        maxLife: tuning.lifetime,
        bob: state.rng() * Math.PI * 2,
      });
      nextPickupId += 1;
      return;
    }
  }
}

export function dropPickup(state, kind, x, y) {
  const tuning = PICKUP_TUNING[kind];
  state.pickups.push({ id: nextPickupId, kind, x, y, life: tuning.lifetime, maxLife: tuning.lifetime, bob: 0 });
  nextPickupId += 1;
}

export function updatePickups(state, dt, onCollect) {
  const player = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    pickup.life -= dt;
    pickup.bob += dt * 3;
    if (pickup.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    const d = distance(pickup.x, pickup.y, player.x, player.y);
    if (d < player.magnetRadius && d > 1) {
      const angle = angleTo(pickup.x, pickup.y, player.x, player.y);
      const pull = 340 * (1 - d / (player.magnetRadius + 60));
      pickup.x += Math.cos(angle) * pull * dt;
      pickup.y += Math.sin(angle) * pull * dt;
    }
    if (d <= player.radius + 14) {
      state.pickups.splice(i, 1);
      onCollect(pickup);
    }
  }
}
