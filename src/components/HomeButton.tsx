import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { hapticLight } from '../utils/haptics';

export default function HomeButton() {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.circle}
      onPress={() => {
        hapticLight();
        navigation.navigate('Home');
      }}
      activeOpacity={0.7}
      accessibilityLabel="Go home"
      accessibilityRole="button"
    >
      {/* Simple house: triangle roof + square body */}
      <View style={styles.roof} />
      <View style={styles.body} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 40, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginBottom: 1,
  },
  body: {
    width: 12,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});
