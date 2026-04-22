import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptics';
import { useAppIcon } from '../hooks/useAppIcon';

export default function HomeButton(_props: { forceDark?: boolean } = {}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const homeIcon = useAppIcon('home');
  return (
    <TouchableOpacity
      style={styles.circle}
      onPress={() => {
        hapticLight();
        if (navigation.canGoBack()) {
          navigation.popToTop();
        } else {
          navigation.navigate('Home');
        }
      }}
      activeOpacity={0.7}
      accessibilityLabel="Go home"
      accessibilityRole="button"
    >
      <Image source={homeIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
