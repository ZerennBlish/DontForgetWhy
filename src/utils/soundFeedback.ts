import { Audio } from 'expo-av';

let chirpSound: Audio.Sound | null = null;

export async function playChirp(): Promise<void> {
  try {
    if (chirpSound) {
      try { await chirpSound.unloadAsync(); } catch {}
      chirpSound = null;
    }
    await Audio.setAudioModeAsync({
      shouldDuckAndroid: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
    });
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/chirp.mp3'),
      { volume: 0.3, shouldPlay: true }
    );
    chirpSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (chirpSound === sound) chirpSound = null;
      }
    });
  } catch {
    // silently ignore if expo-av unavailable
  }
}
