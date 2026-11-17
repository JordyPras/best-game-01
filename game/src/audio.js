// Synthesised sound: every effect is built from oscillators and filtered
// noise, so the game ships no audio files. The context is created lazily on
// the first user gesture (browser autoplay policy) and every call is safe
// before that moment.

let context = null;
let master = null;
let droneNodes = null;
let muted = false;

export function setMuted(value) {
  muted = value;
  if (master && context) master.gain.value = muted ? 0 : 0.55;
}

export function isMuted() {
  return muted;
}

export function ensureAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume().catch(() => {});
    return true;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(context.destination);
    startDrone();
    return true;
  } catch {
    return false;
  }
}

function startDrone() {
  // A slow, quiet two-oscillator pad that sits under the whole game.
  const gain = context.createGain();
  gain.gain.value = 0.035;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  const oscA = context.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 82.4;
  const oscB = context.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.value = 123.5;
  const lfo = context.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  oscA.start();
  oscB.start();
  lfo.start();
  droneNodes = { oscA, oscB, lfo, gain };
}

function tone({ frequency, endFrequency, duration, type = 'sine', volume = 0.2, delay = 0 }) {
  if (!context || muted) return;
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (endFrequency !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise({ duration, volume = 0.2, filterFrequency = 1200, delay = 0, type = 'lowpass' }) {
  if (!context || muted) return;
  const start = context.currentTime + delay;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFrequency;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
}

export const sfx = {
  shoot() {
    tone({ frequency: 880, endFrequency: 220, duration: 0.09, type: 'square', volume: 0.07 });
  },
  dash() {
    noise({ duration: 0.18, volume: 0.12, filterFrequency: 2600, type: 'bandpass' });
  },
  enemyHit() {
    tone({ frequency: 340, endFrequency: 140, duration: 0.07, type: 'triangle', volume: 0.12 });
  },
  enemyDown() {
    noise({ duration: 0.28, volume: 0.2, filterFrequency: 900 });
    tone({ frequency: 210, endFrequency: 46, duration: 0.26, type: 'sawtooth', volume: 0.12 });
  },
  playerHurt() {
    tone({ frequency: 160, endFrequency: 60, duration: 0.3, type: 'sawtooth', volume: 0.22 });
    noise({ duration: 0.2, volume: 0.14, filterFrequency: 500 });
  },
  pickup() {
    tone({ frequency: 660, duration: 0.1, type: 'sine', volume: 0.14 });
    tone({ frequency: 990, duration: 0.14, type: 'sine', volume: 0.14, delay: 0.07 });
  },
  heart() {
    tone({ frequency: 520, duration: 0.12, type: 'sine', volume: 0.16 });
    tone({ frequency: 780, duration: 0.18, type: 'sine', volume: 0.16, delay: 0.09 });
  },
  upgrade() {
    [523, 659, 784, 1047].forEach((frequency, i) => {
      tone({ frequency, duration: 0.22, type: 'triangle', volume: 0.14, delay: i * 0.07 });
    });
  },
  waveStart() {
    tone({ frequency: 196, duration: 0.4, type: 'triangle', volume: 0.16 });
    tone({ frequency: 294, duration: 0.5, type: 'triangle', volume: 0.16, delay: 0.12 });
  },
  bossRoar() {
    tone({ frequency: 70, endFrequency: 38, duration: 0.9, type: 'sawtooth', volume: 0.26 });
    noise({ duration: 0.8, volume: 0.16, filterFrequency: 300 });
  },
  victory() {
    [392, 494, 587, 784, 988].forEach((frequency, i) => {
      tone({ frequency, duration: 0.34, type: 'triangle', volume: 0.16, delay: i * 0.11 });
    });
  },
  gameOver() {
    [330, 262, 208, 156].forEach((frequency, i) => {
      tone({ frequency, duration: 0.42, type: 'triangle', volume: 0.16, delay: i * 0.16 });
    });
  },
  click() {
    tone({ frequency: 1200, duration: 0.05, type: 'sine', volume: 0.08 });
  },
};

export function stopDrone() {
  if (!droneNodes) return;
  try {
    droneNodes.oscA.stop();
    droneNodes.oscB.stop();
    droneNodes.lfo.stop();
  } catch {
    // Already stopped.
  }
  droneNodes = null;
}
