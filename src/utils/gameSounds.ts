import { createAudioPlayer } from 'expo-audio';
import { kvGet } from '../services/database';

const GAME_SOUNDS_KEY = 'gameSoundsEnabled';

let _gameSoundsEnabled: boolean | null = null;

// Load setting on module init
try {
  const raw = kvGet(GAME_SOUNDS_KEY);
  _gameSoundsEnabled = raw === null ? true : raw !== 'false';
} catch {
  _gameSoundsEnabled = true;
}

export async function refreshGameSoundsSetting(): Promise<void> {
  try {
    const raw = kvGet(GAME_SOUNDS_KEY);
    if (raw !== null) {
      _gameSoundsEnabled = raw !== 'false';
    } else {
      _gameSoundsEnabled = true;
    }
  } catch {}
}

const SOUNDS = {
  chessPlace: require('../../assets/sounds/chess-piece-being-placed.wav'),
  capture: require('../../assets/sounds/chess-piece-breaking.wav'),
  promote: require('../../assets/sounds/Chess-pawn-upgrade.wav'),
  gameWin: require('../../assets/sounds/Chess&Checkers-Win-Round.wav'),
  gameLoss: require('../../assets/sounds/Loseing-in-chess-and-checkers.wav'),
  checkersMove: require('../../assets/sounds/checkers-move.wav'),
  cardFlip: require('../../assets/sounds/card-flip.wav'),
  memoryWin: require('../../assets/sounds/Win-Memory-Match.wav'),
  tap: require('../../assets/sounds/tap.wav'),
} as const;

export type SoundName = keyof typeof SOUNDS;

export function playGameSound(name: SoundName): void {
  if (!_gameSoundsEnabled) return;
  try {
    const player = createAudioPlayer(SOUNDS[name]);
    player.volume = 0.4;

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.release();
      }
    });

    player.play();
  } catch {}
}
