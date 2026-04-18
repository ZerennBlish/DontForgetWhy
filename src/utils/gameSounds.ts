import { createAudioPlayer } from 'expo-audio';
import type { PlayerWithEvents } from './audioCompat';
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
  gameWin: require('../../assets/sounds/Chess-Checkers-Win-Round.wav'),
  gameLoss: require('../../assets/sounds/Losing-in-chess-and-checkers.wav'),
  checkersMove: require('../../assets/sounds/checkers-move.wav'),
  cardFlip: require('../../assets/sounds/card-flip.wav'),
  memoryWin: require('../../assets/sounds/Win-Memory-Match.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  pickUp: require('../../assets/sounds/picking-up-chess-or-checker.wav'),
  flipBack: require('../../assets/sounds/Flip-back.wav'),
  sudokuPencil: require('../../assets/sounds/pencil.wav'),
  sudokuErase: require('../../assets/sounds/Eraser.wav'),
  triviaTap: require('../../assets/sounds/Triva-tap.wav'),
  triviaCorrect: require('../../assets/sounds/right-answer-Triva.wav'),
  triviaWrong: require('../../assets/sounds/wrong-answer-trivia.wav'),
} as const;

export type SoundName = keyof typeof SOUNDS;

const VOLUMES: Record<SoundName, number> = {
  tap: 0.4,
  chessPlace: 0.4,
  capture: 0.4,
  promote: 0.4,
  gameWin: 0.5,
  gameLoss: 0.5,
  checkersMove: 0.4,
  cardFlip: 0.3,
  memoryWin: 0.5,
  pickUp: 0.25,
  flipBack: 0.3,
  sudokuPencil: 0.5,
  sudokuErase: 0.5,
  triviaTap: 0.4,
  triviaCorrect: 0.6,
  triviaWrong: 0.5,
};

// Player pool — one persistent player per sound name, created lazily on first use.
// Players live for app lifetime. No didJustFinish cleanup. Replay via seekTo(0) + play().
// Avoids MediaCodec/ExoPlayer leaks that accumulated when didJustFinish didn't fire
// (errors, backgrounding, interruption) in the per-call creation pattern.
const _players: Partial<Record<SoundName, PlayerWithEvents>> = {};

function getOrCreatePlayer(name: SoundName): PlayerWithEvents | null {
  const existing = _players[name];
  if (existing) return existing;

  try {
    const player = createAudioPlayer(SOUNDS[name]) as PlayerWithEvents;
    player.volume = VOLUMES[name];
    _players[name] = player;
    return player;
  } catch {
    return null;
  }
}

export async function playGameSound(name: SoundName): Promise<void> {
  if (!_gameSoundsEnabled) return;

  const player = getOrCreatePlayer(name);
  if (!player) return;

  try {
    // Await seekTo before play so the playhead actually resets before playback
    // starts. expo-audio's seekTo is async (expo/expo#37653) — firing play()
    // without awaiting can produce silence or wrong-position playback on
    // rapid retriggers.
    await player.seekTo(0);
    player.play();
  } catch {}
}
