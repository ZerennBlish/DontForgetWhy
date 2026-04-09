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
  /** Chrome record circle — for voice recording */
  record: require('../../assets/icons/record.webp') as ImageSourcePropType,
  /** Chrome stop square — for stopping recording/playback */
  stop: require('../../assets/icons/stop.webp') as ImageSourcePropType,
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
