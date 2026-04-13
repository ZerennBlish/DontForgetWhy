import { createAudioPlayer } from 'expo-audio';
import type { PlayerWithEvents } from './audioCompat';

const chirpSource = require('../../assets/chirp.mp3');

export async function playChirp(): Promise<void> {
  try {
    const player = createAudioPlayer(chirpSource);
    player.volume = 0.3;

    const sub = (player as PlayerWithEvents).addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });

    player.play();
  } catch {}
}
