import type { AudioPlayer, AudioStatus } from 'expo-audio';

/**
 * The expo-audio 55.x types declare `AudioPlayer extends SharedObject<AudioEvents>`,
 * but `SharedObject` is re-exported from `expo-modules-core` as
 * `typeof ExpoGlobal.SharedObject`. That circular indirection prevents
 * TypeScript from inheriting `addListener` (from EventEmitter) and
 * `release` (from SharedObject) onto AudioPlayer. The runtime methods
 * still exist via the parent class — the breakage is purely at the type
 * level.
 *
 * `AudioPlayer` itself does declare `remove(): void` directly, so prefer
 * that over `release()` for freeing the player. For event subscription
 * we re-add the missing method via this intersection type and cast at
 * the createAudioPlayer call site.
 */
export type PlayerWithEvents = AudioPlayer & {
  addListener(
    eventName: 'playbackStatusUpdate',
    listener: (status: AudioStatus) => void,
  ): { remove: () => void };
};
