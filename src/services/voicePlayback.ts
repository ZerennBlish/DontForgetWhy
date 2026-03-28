/**
 * Voice clip playback engine.
 *
 * Callers handle alarm sound sequencing:
 *   alarm plays 3 sec → alarm stops → await playRandomClip → alarm resumes.
 *
 * This service doesn't know about alarm sounds — it just plays clips
 * and resolves when done. Voice errors must NEVER crash the alarm flow.
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import voiceClips, { type VoiceCategory } from '../data/voiceClips';

const VOICE_ENABLED_KEY = 'voiceRoastsEnabled';
const INTRO_PLAYED_KEY = 'voiceIntroPlayed';

let _currentSound: Audio.Sound | null = null;
let _playing = false;

export function isVoicePlaying(): boolean {
  return _playing;
}

export async function stopVoice(): Promise<void> {
  _playing = false;
  if (_currentSound) {
    try {
      await _currentSound.stopAsync();
      await _currentSound.unloadAsync();
    } catch (e) {
      console.warn('[voicePlayback] stopVoice error:', e);
    }
    _currentSound = null;
  }
}

export async function getVoiceEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(VOICE_ENABLED_KEY);
  return raw !== 'false';
}

export async function setVoiceEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
}

export async function hasIntroPlayed(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(INTRO_PLAYED_KEY);
  return raw === 'true';
}

export async function markIntroPlayed(): Promise<void> {
  await AsyncStorage.setItem(INTRO_PLAYED_KEY, 'true');
}

/**
 * Play a random clip from the given category.
 * Resolves when the clip finishes playing (or immediately if voice is disabled/empty).
 */
export async function playRandomClip(category: VoiceCategory): Promise<void> {
  try {
    const enabled = await getVoiceEnabled();
    if (!enabled) return;

    const clips = voiceClips[category];
    if (!clips || clips.length === 0) return;

    await stopVoice();

    const source = clips[Math.floor(Math.random() * clips.length)];
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume: 1.0,
    });

    _currentSound = sound;
    _playing = true;

    return new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          _playing = false;
          _currentSound = null;
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      });
    });
  } catch (e) {
    console.warn('[voicePlayback] playRandomClip error:', e);
    _playing = false;
    _currentSound = null;
  }
}

/**
 * Play the one-time intro clip if it hasn't been played yet.
 * Returns true if the clip was played, false if skipped.
 */
export async function playIntroIfNeeded(): Promise<boolean> {
  try {
    const enabled = await getVoiceEnabled();
    if (!enabled) return false;

    const played = await hasIntroPlayed();
    if (played) return false;

    const clips = voiceClips.intro;
    if (!clips || clips.length === 0) return false;

    await stopVoice();

    const { sound } = await Audio.Sound.createAsync(clips[0], {
      shouldPlay: true,
      volume: 1.0,
    });

    _currentSound = sound;
    _playing = true;

    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          _playing = false;
          _currentSound = null;
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      });
    });

    await markIntroPlayed();
    return true;
  } catch (e) {
    console.warn('[voicePlayback] playIntroIfNeeded error:', e);
    _playing = false;
    _currentSound = null;
    return false;
  }
}
