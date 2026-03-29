import { createAudioPlayer } from 'expo-audio';

const chirpSource = require('../../assets/chirp.mp3');

export async function playChirp(): Promise<void> {
  try {
    const player = createAudioPlayer(chirpSource);
    player.volume = 0.3;

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.release();
      }
    });

    player.play();
  } catch {}
}
