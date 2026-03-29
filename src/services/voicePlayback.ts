/**
 * Voice clip playback engine — native USAGE_ALARM stream.
 *
 * Plays voice clips through AlarmChannelModule's MediaPlayer on the ALARM
 * audio stream, so they're audible regardless of media volume / ringer mode.
 *
 * Callers handle alarm sound sequencing:
 *   alarm plays 1.5s → alarm stops → await playRandomClip → alarm resumes.
 *
 * This service doesn't know about alarm sounds — it just plays clips
 * and resolves when done. Voice errors must NEVER crash the alarm flow.
 */

import { NativeModules, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import voiceClips, { type VoiceCategory } from '../data/voiceClips';

const VOICE_ENABLED_KEY = 'voiceRoastsEnabled';
const INTRO_PLAYED_KEY = 'voiceIntroPlayed';

let _playing = false;
let _playId = 0;

export function isVoicePlaying(): boolean {
  return _playing;
}

export async function stopVoice(): Promise<void> {
  _playId++;
  _playing = false;
  if (Platform.OS === 'android') {
    try {
      await NativeModules.AlarmChannelModule.stopVoiceClip();
    } catch (e) {
      console.warn('[voicePlayback] stopVoice error:', e);
    }
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
 * The native playVoiceClip promise resolves on MediaPlayer OnCompletionListener,
 * so this awaits until the clip is done — callers can then resume the alarm sound.
 */
export async function playRandomClip(category: VoiceCategory): Promise<void> {
  try {
    const thisPlayId = ++_playId;

    const enabled = await getVoiceEnabled();
    if (!enabled) return;

    const clips = voiceClips[category];
    if (!clips || clips.length === 0) return;

    await stopVoice();
    if (thisPlayId !== _playId) return;

    const source = clips[Math.floor(Math.random() * clips.length)];
    const asset = Asset.fromModule(source as number);
    await asset.downloadAsync();
    if (thisPlayId !== _playId) return;

    const uri = asset.localUri;
    if (!uri) return;

    _playing = true;
    if (Platform.OS === 'android') {
      await NativeModules.AlarmChannelModule.playVoiceClip(uri);
    }
    _playing = false;
  } catch (e) {
    console.warn('[voicePlayback] playRandomClip error:', e);
    _playing = false;
  }
}

/**
 * Play the one-time intro clip if it hasn't been played yet.
 * Returns true if the clip was played, false if skipped.
 */
export async function playIntroIfNeeded(): Promise<boolean> {
  try {
    const thisPlayId = ++_playId;

    const enabled = await getVoiceEnabled();
    if (!enabled) return false;

    const played = await hasIntroPlayed();
    if (played) return false;

    const clips = voiceClips.intro;
    if (!clips || clips.length === 0) return false;

    await stopVoice();
    if (thisPlayId !== _playId) return false;

    const asset = Asset.fromModule(clips[0] as number);
    await asset.downloadAsync();
    if (thisPlayId !== _playId) return false;

    const uri = asset.localUri;
    if (!uri) return false;

    try {
      _playing = true;
      if (Platform.OS === 'android') {
        await NativeModules.AlarmChannelModule.playVoiceClip(uri);
      }
      _playing = false;
      if (thisPlayId !== _playId) return false;
      await markIntroPlayed();
      return true;
    } catch (e) {
      console.warn('[voicePlayback] playIntroIfNeeded playback error:', e);
      _playing = false;
      return false;
    }
  } catch (e) {
    console.warn('[voicePlayback] playIntroIfNeeded error:', e);
    _playing = false;
    return false;
  }
}
