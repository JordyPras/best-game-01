// All drawing: the night arena, the warden's lantern light, every entity,
// the HUD, and the title / upgrade / pause / end screens. Nothing here
// changes game state except the button rectangles main.js reads for clicks.

import { FINAL_WAVE, PALETTE, VIEW_HEIGHT, VIEW_WIDTH, WALL } from './config.js';
import { clamp, makeRng } from './random.js';

const stars = (() => {
  const rng = makeRng(20261115);
  const list = [];
  for (let i = 0; i < 130; i += 1) {
    list.push({ x: rng() * VIEW_WIDTH, y: rng() * VIEW_HEIGHT, r: 0.6 + rng() * 1.5, twinkle: rng() * Math.PI * 2 });
  }
  return list;
})();

const nebulae = (() => {
  const rng = makeRng(77);
  const list = [];
  const colors = ['#232a5e', '#3a2360', '#173a4d'];
  for (let i = 0; i < 7; i += 1) {
    list.push({ x: rng() * VIEW_WIDTH, y: rng() * VIEW_HEIGHT, r: 120 + rng() * 190, color: colors[i % colors.length] });
  }
  return list;
})();

let darknessCanvas = null;

function getDarknessCanvas() {
  if (!darknessCanvas) {
    darknessCanvas = document.createElement('canvas');
    darknessCanvas.width = VIEW_WIDTH;
    darknessCanvas.height = VIEW_HEIGHT;
  }
  return darknessCanvas;
}

function drawBackground(ctx, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  for (const nebula of nebulae) {
    const glow = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
    glow.addColorStop(0, nebula.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
  }

  ctx.fillStyle = '#cdd6ff';
  for (const star of stars) {
    const alpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.4 + star.twinkle));
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Arena floor: a subtle checker of torch-lit stone.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(WALL, WALL, VIEW_WIDTH - WALL * 2, VIEW_HEIGHT - WALL * 2);
  ctx.strokeStyle = 'rgba(77,95,184,0.22)';
  ctx.lineWidth = 1;
  for (let x = WALL; x <= VIEW_WIDTH - WALL; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, WALL);
    ctx.lineTo(x, VIEW_HEIGHT - WALL);
    ctx.stroke();
  }
  for (let y = WALL; y <= VIEW_HEIGHT - WALL; y += 64) {
    ctx.beginPath();
    ctx.moveTo(WALL, y);
    ctx.lineTo(VIEW_WIDTH - WALL, y);
    ctx.stroke();
  }

  // Arena wall with a glowing inner rim and corner braziers.
  ctx.strokeStyle = PALETTE.wall;
  ctx.lineWidth = 6;
  ctx.strokeRect(WALL - 3, WALL - 3, VIEW_WIDTH - WALL * 2 + 6, VIEW_HEIGHT - WALL * 2 + 6);
  ctx.strokeStyle = PALETTE.wallGlow;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(WALL + 2, WALL + 2, VIEW_WIDTH - WALL * 2 - 4, VIEW_HEIGHT - WALL * 2 - 4);
  for (const [cx, cy] of [[WALL, WALL], [VIEW_WIDTH - WALL, WALL], [WALL, VIEW_HEIGHT - WALL], [VIEW_WIDTH - WALL, VIEW_HEIGHT - WALL]]) {
    const flicker = 0.75 + 0.25 * Math.sin(time * 5 + cx);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34);
    glow.addColorStop(0, `rgba(255,154,60,${0.55 * flicker})`);
    glow.addColorStop(1, 'rgba(255,154,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 34, cy - 34, 68, 68);
    ctx.fillStyle = PALETTE.emberHot;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDarkness(ctx, state) {
  const dark = getDarknessCanvas();
  const dctx = dark.getContext('2d');
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  dctx.fillStyle = 'rgba(3,5,14,0.46)';
  dctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  dctx.globalCompositeOperation = 'destination-out';
  const light = dctx.createRadialGradient(state.player.x, state.player.y, 60, state.player.x, state.player.y, 360);
  light.addColorStop(0, 'rgba(0,0,0,1)');
  light.addColorStop(0.55, 'rgba(0,0,0,0.85)');
  light.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = light;
  dctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.drawImage(dark, 0, 0);
}

function drawLanternGlow(ctx, state) {
  const player = state.player;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, 130);
  glow.addColorStop(0, 'rgba(255,180,80,0.22)');
  glow.addColorStop(1, 'rgba(255,154,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(player.x - 130, player.y - 130, 260, 260);
  ctx.restore();
}

function drawPickup(ctx, pickup, time) {
  const bob = Math.sin(pickup.bob) * 3;
  const y = pickup.y + bob;
  const blink = pickup.life < 2 ? (Math.sin(time * 14) > 0 ? 1 : 0.25) : 1;
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.translate(pickup.x, y);
  if (pickup.kind === 'heart') {
    ctx.fillStyle = '#ff5d7a';
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-12, -2, -8, -11, 0, -5);
    ctx.bezierCurveTo(8, -11, 12, -2, 0, 9);
    ctx.fill();
  } else if (pickup.kind === 'shard') {
    ctx.fillStyle = PALETTE.emberHot;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
  } else if (pickup.kind === 'rapid') {
    ctx.fillStyle = PALETTE.teal;
    drawStar(ctx, 0, 0, 11, 5, 5);
  } else {
    ctx.strokeStyle = PALETTE.teal;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(60,232,200,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(ctx, x, y, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const squash = 1 + 0.06 * Math.sin(enemy.wobble * 2);
  ctx.scale(1, squash);
  ctx.fillStyle = enemy.body;
  ctx.strokeStyle = enemy.rim;
  ctx.lineWidth = 2.5;

  if (enemy.type === 'skitter') {
    const heading = Math.atan2(enemy.vy, enemy.vx);
    ctx.rotate(heading);
    ctx.beginPath();
    ctx.moveTo(enemy.radius + 6, 0);
    ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
    ctx.lineTo(-enemy.radius * 0.4, 0);
    ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-heading);
  } else if (enemy.type === 'husk') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(angle) * enemy.radius;
      const py = Math.sin(angle) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.type === 'spitter') {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
    ctx.strokeRect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
    ctx.rotate(-Math.PI / 4);
  } else if (enemy.type === 'splitter') {
    ctx.beginPath();
    ctx.arc(-enemy.radius * 0.45, 0, enemy.radius * 0.7, 0, Math.PI * 2);
    ctx.arc(enemy.radius * 0.45, 0, enemy.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (enemy.isBoss) {
    for (let i = 0; i < 8; i += 1) {
      const angle = time * 0.6 + (i / 8) * Math.PI * 2;
      const sx = Math.cos(angle) * (enemy.radius + 12);
      const sy = Math.sin(angle) * (enemy.radius + 12);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,107,255,0.25)';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2 + enemy.wobble * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * enemy.radius * 0.7, Math.sin(angle) * enemy.radius * 0.7);
      ctx.lineTo(Math.cos(angle) * (enemy.radius + 7), Math.sin(angle) * (enemy.radius + 7));
      ctx.stroke();
    }
  }

  // Eyes track the warden.
  const look = Math.atan2(enemy.lookY ?? 0, enemy.lookX ?? 1);
  const eyeOffset = enemy.isBoss ? 16 : enemy.radius * 0.38;
  const eyeR = enemy.isBoss ? 6 : 3.5;
  ctx.fillStyle = enemy.eye;
  for (const side of [-1, 1]) {
    const ex = Math.cos(look) * 4 + Math.cos(look + Math.PI / 2) * eyeOffset * side;
    const ey = Math.sin(look) * 4 + Math.sin(look + Math.PI / 2) * eyeOffset * side;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = enemy.hitFlash * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Health bar for wounded non-boss enemies.
  if (!enemy.isBoss && enemy.hp < enemy.maxHp) {
    const width = enemy.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 4);
    ctx.fillStyle = PALETTE.rose;
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 4);
  }
}

function drawPlayer(ctx, state, time) {
  const player = state.player;
  const blink = player.invuln > 0 && Math.sin(time * 30) > 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (blink) ctx.globalAlpha = 0.45;

  // Cloak: a teardrop pointing away from the aim.
  ctx.save();
  ctx.rotate(player.angle + Math.PI / 2);
  const sway = Math.sin(player.walkCycle) * 2;
  ctx.fillStyle = '#274b63';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(15 + sway, 2, 10, 16);
  ctx.quadraticCurveTo(0, 20, -10, 16);
  ctx.quadraticCurveTo(-15 - sway, 2, 0, -18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.teal;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Hood and face.
  ctx.fillStyle = '#3a6b8a';
  ctx.beginPath();
  ctx.arc(0, -2, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.teal;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.bone;
  ctx.beginPath();
  ctx.arc(Math.cos(player.angle) * 4, -2 + Math.sin(player.angle) * 4, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // The lantern, held toward the aim, swinging gently.
  const lanternAngle = player.angle + Math.sin(time * 2.2) * 0.08;
  const lx = Math.cos(lanternAngle) * 20;
  const ly = Math.sin(lanternAngle) * 20 - 2;
  ctx.strokeStyle = '#8b93b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.angle) * 10, -2 + Math.sin(player.angle) * 10);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 20);
  glow.addColorStop(0, 'rgba(255,210,122,0.9)');
  glow.addColorStop(0.4, 'rgba(255,154,60,0.45)');
  glow.addColorStop(1, 'rgba(255,154,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lx, ly, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.emberHot;
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();

  // Shield ring.
  if (player.shieldCharges > 0) {
    ctx.strokeStyle = 'rgba(60,232,200,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 7, time, time + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // Aim tick.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = PALETTE.emberHot;
  ctx.lineWidth = 2;
  const ax = player.x + Math.cos(player.angle) * 34;
  const ay = player.y + Math.sin(player.angle) * 34;
  ctx.beginPath();
  ctx.moveTo(ax - 5, ay);
  ctx.lineTo(ax + 5, ay);
  ctx.moveTo(ax, ay - 5);
  ctx.lineTo(ax, ay + 5);
  ctx.stroke();
  ctx.restore();
}

function drawShots(ctx, state) {
  for (const bullet of state.bullets) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.radius * 2.6);
    glow.addColorStop(0, bullet.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff7e8';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const shot of state.enemyShots) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(shot.x, shot.y, 0, shot.x, shot.y, shot.radius * 2.4);
    glow.addColorStop(0, shot.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  for (const wave of state.shockwaves) {
    const alpha = clamp(wave.life / wave.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const text of state.texts) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${text.size}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text.text, text.x, text.y);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, state) {
  const player = state.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Health bar.
  const barX = 24;
  const barY = 22;
  const barWidth = 260;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(barX - 6, barY - 6, barWidth + 12, 34);
  ctx.fillStyle = '#1c2348';
  ctx.fillRect(barX, barY, barWidth, 12);
  const hpFraction = clamp(player.hp / player.maxHp, 0, 1);
  ctx.fillStyle = hpFraction > 0.3 ? PALETTE.hpGood : PALETTE.hpLow;
  ctx.fillRect(barX, barY, barWidth * hpFraction, 12);
  ctx.font = 'bold 13px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(`HP ${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`, barX, barY + 26);
  for (let i = 0; i < player.shieldCharges; i += 1) {
    ctx.fillStyle = PALETTE.teal;
    ctx.beginPath();
    ctx.arc(barX + barWidth + 16 + i * 18, barY + 6, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wave and score.
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(`WAVE ${Math.min(state.wave, FINAL_WAVE)} / ${FINAL_WAVE}`, VIEW_WIDTH / 2, 36);
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText(`${state.score.toLocaleString('en-US')}`, VIEW_WIDTH - 24, 38);
  ctx.font = '13px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST ${state.best.toLocaleString('en-US')}`, VIEW_WIDTH - 24, 56);
  if (state.multiplier > 1) {
    ctx.font = 'bold 18px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.emberHot;
    ctx.fillText(`COMBO x${state.multiplier}`, VIEW_WIDTH - 24, 80);
  }

  // Dash cooldown.
  const dashX = 24;
  const dashY = VIEW_HEIGHT - 40;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('DASH', dashX, dashY - 8);
  ctx.fillStyle = '#1c2348';
  ctx.fillRect(dashX + 46, dashY - 18, 110, 10);
  const dashFraction = player.dashCooldown <= 0 ? 1 : 1 - player.dashCooldown / (1.6 * state.dashCooldownScale);
  ctx.fillStyle = dashFraction >= 1 ? PALETTE.teal : '#4d5fb8';
  ctx.fillRect(dashX + 46, dashY - 18, 110 * clamp(dashFraction, 0, 1), 10);

  // Controls hint and mute state.
  ctx.textAlign = 'right';
  ctx.font = '13px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('WASD move · Mouse aim · Click shoot · Space dash · P pause · M mute', VIEW_WIDTH - 36, VIEW_HEIGHT - 20);
  ctx.fillText(state.muted ? 'SOUND OFF' : 'SOUND ON', VIEW_WIDTH - 36, VIEW_HEIGHT - 40);

  // Boss bar.
  if (state.boss) {
    const width = 520;
    const x = (VIEW_WIDTH - width) / 2;
    const y = 56;
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = '#e8b8ff';
    ctx.fillText('THE HOLLOW', VIEW_WIDTH / 2, y - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 4, y, width + 8, 14);
    ctx.fillStyle = '#2a1440';
    ctx.fillRect(x, y + 2, width, 10);
    ctx.fillStyle = '#c86bff';
    ctx.fillRect(x, y + 2, width * clamp(state.boss.hp / state.boss.maxHp, 0, 1), 10);
  }

  // Wave banner.
  if (state.bannerTimer > 0) {
    const alpha = clamp(state.bannerTimer / 0.6, 0, 1) * clamp((2.2 - state.bannerTimer) / 0.25, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px Georgia, "Times New Roman", serif';
    ctx.fillStyle = PALETTE.emberHot;
    ctx.fillText(state.bannerText, VIEW_WIDTH / 2, 150);
    ctx.globalAlpha = 1;
  }

  // Low-health vignette.
  if (hpFraction <= 0.3 && state.screen === 'playing') {
    const pulse = 0.25 + 0.15 * Math.sin(state.time * 5);
    const vignette = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.35, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.75);
    vignette.addColorStop(0, 'rgba(255,40,40,0)');
    vignette.addColorStop(1, `rgba(255,40,40,${pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  // Hurt flash.
  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255,60,60,${clamp(state.flashTimer * 1.6, 0, 0.28)})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
}

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(4,6,15,${alpha})`;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function drawButton(ctx, rect, label, hovered) {
  ctx.fillStyle = hovered ? '#3a2a12' : 'rgba(20,16,8,0.85)';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = hovered ? PALETTE.emberHot : PALETTE.ember;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.emberHot;
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 7);
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function drawTitleScreen(ctx, state) {
  dimScreen(ctx, 0.45);
  const cx = VIEW_WIDTH / 2;
  const glow = ctx.createRadialGradient(cx, 215, 10, cx, 215, 240);
  glow.addColorStop(0, 'rgba(255,154,60,0.35)');
  glow.addColorStop(1, 'rgba(255,154,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 240, -25, 480, 480);

  ctx.textAlign = 'center';
  ctx.font = 'bold 92px Georgia, "Times New Roman", serif';
  ctx.fillStyle = PALETTE.emberHot;
  ctx.fillText('EMBERHOLD', cx, 240);
  ctx.font = 'italic 24px Georgia, "Times New Roman", serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText('Defend the last ember. Survive ten waves of the Hollow dark.', cx, 284);

  ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  const lines = [
    'WASD / Arrows — move        Mouse — aim        Click / hold — shoot',
    'Space / Shift — dash through danger        P — pause        M — sound',
    'Clear each wave, choose a boon, and face The Hollow on wave 10.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, cx, 336 + i * 30));

  const button = { x: cx - 150, y: 448, width: 300, height: 56 };
  state.startRect = button;
  drawButton(ctx, button, 'LIGHT THE LANTERN', pointInRect(state.input.mouseX, state.input.mouseY, button));
  ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('or press Enter', cx, 536);
  if (state.best > 0) {
    ctx.font = 'bold 17px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.emberHot;
    ctx.fillText(`BEST SCORE  ${state.best.toLocaleString('en-US')}`, cx, 584);
  }
}

function drawUpgradeScreen(ctx, state) {
  dimScreen(ctx, 0.72);
  const cx = VIEW_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
  ctx.fillStyle = PALETTE.emberHot;
  ctx.fillText('THE WAVE BREAKS — CHOOSE A BOON', cx, 150);
  ctx.font = '17px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(`Wave ${state.wave} cleared. One boon carries into the dark ahead.`, cx, 186);

  const cardWidth = 270;
  const cardHeight = 250;
  const gap = 34;
  const totalWidth = cardWidth * 3 + gap * 2;
  const startX = cx - totalWidth / 2;
  const cardY = 240;
  state.upgradeRects = [];
  state.upgradeChoices.forEach((upgrade, i) => {
    const rect = { x: startX + i * (cardWidth + gap), y: cardY, width: cardWidth, height: cardHeight };
    state.upgradeRects.push(rect);
    const hovered = pointInRect(state.input.mouseX, state.input.mouseY, rect);
    ctx.fillStyle = hovered ? '#1d2447' : '#12172f';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = hovered ? PALETTE.emberHot : PALETTE.wallGlow;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.font = '56px Georgia, serif';
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText(upgrade.glyph, rect.x + rect.width / 2, rect.y + 84);
    ctx.font = 'bold 21px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.bone;
    ctx.fillText(upgrade.name, rect.x + rect.width / 2, rect.y + 132);
    ctx.font = '16px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.dim;
    wrapText(ctx, upgrade.description, rect.x + 22, rect.y + 166, rect.width - 44, 22);
    ctx.font = 'bold 14px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillStyle = PALETTE.teal;
    ctx.fillText(`PRESS ${i + 1}`, rect.x + rect.width / 2, rect.y + cardHeight - 18);
  });
  ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Click a card or press 1, 2 or 3', cx, cardY + cardHeight + 44);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'center';
  const centerX = x + maxWidth / 2;
  for (const word of words) {
    const test = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line, centerX, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, centerX, lineY);
  ctx.textAlign = previousAlign;
}

function drawPauseScreen(ctx, state) {
  dimScreen(ctx, 0.6);
  const cx = VIEW_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px Georgia, "Times New Roman", serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText('PAUSED', cx, 320);
  ctx.font = '18px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('Press P or Esc to return to the fight · M toggles sound · R restarts the run', cx, 366);
}

function drawEndScreen(ctx, state, won) {
  dimScreen(ctx, 0.68);
  const cx = VIEW_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px Georgia, "Times New Roman", serif';
  ctx.fillStyle = won ? PALETTE.emberHot : PALETTE.rose;
  ctx.fillText(won ? 'DAWN BREAKS' : 'THE EMBER FADES', cx, 236);
  ctx.font = 'italic 21px Georgia, "Times New Roman", serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(
    won ? 'The Hollow is unmade, and morning returns to the hold.' : 'The dark closes in — but embers can be relit.',
    cx, 278,
  );
  ctx.font = 'bold 30px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(`SCORE  ${state.score.toLocaleString('en-US')}`, cx, 348);
  ctx.font = '18px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`Best ${state.best.toLocaleString('en-US')}    ·    Wave ${state.wave}    ·    ${state.kills} foes felled`, cx, 384);
  if (state.upgradesTaken.length > 0) {
    ctx.fillText(`Boons: ${state.upgradesTaken.join(', ')}`, cx, 414);
  }
  const button = { x: cx - 150, y: 452, width: 300, height: 56 };
  state.restartRect = button;
  drawButton(ctx, button, won ? 'PLAY AGAIN' : 'TRY AGAIN', pointInRect(state.input.mouseX, state.input.mouseY, button));
  ctx.font = '15px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('or press R', cx, 540);
}

export function render(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    const magnitude = state.shake;
    ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
  }
  drawBackground(ctx, state.time);

  if (state.screen === 'title') {
    drawTitleScreen(ctx, state);
    ctx.restore();
    return;
  }

  for (const pickup of state.pickups) drawPickup(ctx, pickup, state.time);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.time);
  const wardenFallen = state.screen === 'over' && state.player.hp <= 0;
  if (!wardenFallen) drawPlayer(ctx, state, state.time);
  drawShots(ctx, state);
  drawEffects(ctx, state);
  if (!wardenFallen) drawLanternGlow(ctx, state);
  drawDarkness(ctx, state);
  drawHud(ctx, state);

  if (state.screen === 'upgrade') drawUpgradeScreen(ctx, state);
  else if (state.screen === 'paused') drawPauseScreen(ctx, state);
  else if (state.screen === 'over') drawEndScreen(ctx, state, false);
  else if (state.screen === 'victory') drawEndScreen(ctx, state, true);
  ctx.restore();
}
