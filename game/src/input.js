// Keyboard and mouse state, translated into canvas coordinates.
// `pressed` edges fire once per physical press so menus can react to single
// taps (Enter, P, R, 1/2/3) without key-repeat spam.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseX: VIEW_WIDTH / 2,
    mouseY: VIEW_HEIGHT / 2 - 120,
    mouseDown: false,
    clicked: false, // true for exactly one frame after a mouse press
    clickedAt: { x: 0, y: 0 },
  };

  const toCanvas = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    input.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const point = toCanvas(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
  });

  canvas.addEventListener('mousedown', (event) => {
    const point = toCanvas(event.clientX, event.clientY);
    input.mouseDown = true;
    input.clicked = true;
    input.clickedAt = point;
    input.mouseX = point.x;
    input.mouseY = point.y;
  });

  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return input;
}

// Call once per frame, after the update, to clear single-frame edges.
export function endFrame(input) {
  input.pressed.clear();
  input.clicked = false;
}

export function keyPressed(input, ...names) {
  return names.some((name) => input.pressed.has(name));
}

export function keyHeld(input, ...names) {
  return names.some((name) => input.keys.has(name));
}

// Normalised movement vector from WASD / arrow keys.
export function moveAxis(input) {
  let x = 0;
  let y = 0;
  if (keyHeld(input, 'a', 'ArrowLeft')) x -= 1;
  if (keyHeld(input, 'd', 'ArrowRight')) x += 1;
  if (keyHeld(input, 'w', 'ArrowUp')) y -= 1;
  if (keyHeld(input, 's', 'ArrowDown')) y += 1;
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}
