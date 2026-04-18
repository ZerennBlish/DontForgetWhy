import { createAudioPlayer } from 'expo-audio';
import type { PlayerWithEvents } from './audioCompat';

const chirpSource = require('../../assets/chirp.mp3');

// Persistent chirp player, created lazily on first use. Lives for app
// lifetime. Replay via seekTo(0) + play(). Avoids the MediaCodec/ExoPlayer
// leak that accumulated when didJustFinish didn't fire (errors,
// backgrounding, interruption) in the per-call creation pattern.
let _chirpPlayer: PlayerWithEvents | null = null;

function getOrCreateChirpPlayer(): PlayerWithEvents | null {
  if (_chirpPlayer) return _chirpPlayer;

  try {
    const player = createAudioPlayer(chirpSource) as PlayerWithEvents;
    player.volume = 0.3;
    _chirpPlayer = player;
    return player;
  } catch {
    return null;
  }
}

export async function playChirp(): Promise<void> {
  const player = getOrCreateChirpPlayer();
  if (!player) return;

  try {
    // Await seekTo before play so the playhead actually resets before
    // playback starts. expo-audio's seekTo is async (expo/expo#37653) —
    // firing play() without awaiting can produce silence or wrong-position
    // playback on rapid retriggers.
    await player.seekTo(0);
    player.play();
  } catch {}
}
