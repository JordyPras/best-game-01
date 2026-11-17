// Best-score persistence. Wrapped in try/catch: some sandboxes and private
// modes throw on localStorage access, and the game must keep working.

const BEST_KEY = 'emberhold.bestScore';
const MUTE_KEY = 'emberhold.muted';

export function loadBestScore() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(score)));
  } catch {
    // Storage unavailable: the score simply is not kept.
  }
}

export function loadMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore: mute preference is best-effort.
  }
}
