import React from 'react';
import { View, Image, ImageSourcePropType, ViewStyle } from 'react-native';

/** Media control icons — 512×512 WebP, transparent backgrounds */
const MEDIA_ICONS = {
  /** Green character play — for game contexts (resume, continue, start) */
  gamePlay: require('../../assets/icons/game-play.webp') as ImageSourcePropType,
  /** Chrome play triangle — for app controls (voice playback, timer, sound preview) */
  play: require('../../assets/icons/play-app.webp') as ImageSourcePropType,
  /** Chrome pause bars — for all pause states */
  pause: require('../../assets/icons/pause.webp') as ImageSourcePropType,
  /** Chrome stop square — for stopping recording/playback */
  stop: require('../../assets/icons/stop.webp') as ImageSourcePropType,
  /** Chrome repeat loop — for voice clip repeat mode */
  repeat: require('../../assets/icons/repeat.webp') as ImageSourcePropType,
  /** Chrome play-all/fast-forward — for voice clip play-all mode */
  playAll: require('../../assets/icons/play-all.webp') as ImageSourcePropType,
  /** Chrome play-stop/skip-to-end — for voice clip stop-after-current mode */
  playStop: require('../../assets/icons/play-stop.webp') as ImageSourcePropType,
  /** Chrome skip back arrow with 5 — rewind 5 seconds */
  skipBack: require('../../assets/icons/skip-back.webp') as ImageSourcePropType,
  /** Chrome skip forward arrow with 5 — forward 5 seconds */
  skipForward: require('../../assets/icons/skip-forward.webp') as ImageSourcePropType,
};

export default MEDIA_ICONS;

interface GlowIconProps {
  source: ImageSourcePropType;
  size: number;
  glowColor: string;
  style?: ViewStyle;
}

export function GlowIcon({ source, size, glowColor, style }: GlowIconProps) {
  return (
    <View style={[{
      padding: Math.round(size * 0.15),
      backgroundColor: glowColor + '35',
      borderRadius: size * 0.65,
    }, style]}>
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}
