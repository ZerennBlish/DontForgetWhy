import { hapticLight, hapticMedium, hapticHeavy } from './haptics';

export function playCorrect() {
  try {
    hapticLight();
    setTimeout(() => hapticLight(), 100);
  } catch {}
}

export function playWrong() {
  try {
    hapticHeavy();
  } catch {}
}

export function playCardFlip() {
  try {
    hapticLight();
  } catch {}
}

export function playGameComplete() {
  try {
    hapticMedium();
    setTimeout(() => hapticLight(), 150);
    setTimeout(() => hapticLight(), 300);
  } catch {}
}

export function playTimerComplete() {
  try {
    hapticHeavy();
    setTimeout(() => hapticMedium(), 200);
  } catch {}
}
