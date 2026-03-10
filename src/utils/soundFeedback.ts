import { Audio, AVPlaybackStatus } from 'expo-av';

let activeSound: Audio.Sound | null = null;

export async function playModeFeedbackChirp(): Promise<void> {
  try {
    if (activeSound) {
      try { await activeSound.unloadAsync(); } catch {}
      activeSound = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'content://settings/system/notification_sound' },
      { volume: 0.15, shouldPlay: true }
    );
    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeSound === sound) activeSound = null;
      }
    });
  } catch {
    // silently ignore
  }
}
