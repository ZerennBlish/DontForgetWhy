import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export default function AboutScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tapCount, setTapCount] = useState(0);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    backBtn: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: 60 + insets.bottom,
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: 20,
    },
    iconImage: {
      width: 100,
      height: 100,
    },
    iconFallback: {
      width: 100,
      height: 100,
      borderRadius: 24,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconFallbackText: {
      fontSize: 40,
    },
    appName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    version: {
      fontSize: 14,
      color: colors.textTertiary,
      marginBottom: 16,
    },
    tagline: {
      fontSize: 15,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
      marginBottom: 40,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    primaryText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    secondaryText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    easterEgg: {
      fontSize: 13,
      color: colors.accent,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 24,
      maxWidth: 260,
    },
  }), [colors, insets.bottom]);

  const [iconError, setIconError] = useState(false);

  const handleIconTap = () => {
    setTapCount((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          onPress={handleIconTap}
          activeOpacity={0.8}
          style={styles.iconContainer}
        >
          {!iconError ? (
            <Image
              source={require('../../assets/icon.png')}
              style={styles.iconImage}
              onError={() => setIconError(true)}
            />
          ) : (
            <View style={styles.iconFallback}>
              <Text style={styles.iconFallbackText}>{'\u{1F9E0}\u2753'}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.appName}>Don't Forget Why</Text>
        <Text style={styles.version}>v{version}</Text>
        <Text style={styles.tagline}>
          Because you will forget. We're here to judge you for it.
        </Text>

        <Text style={styles.sectionTitle}>Built By</Text>
        <Text style={styles.primaryText}>Zerenn</Text>
        <Text style={styles.secondaryText}>Built with AI-assisted development</Text>

        <Text style={styles.sectionTitle}>Powered By</Text>
        <Text style={styles.secondaryText}>React Native + Expo</Text>
        <Text style={[styles.secondaryText, { marginBottom: 0 }]}>Notifee</Text>

        {tapCount >= 5 && (
          <Text style={styles.easterEgg}>
            You remembered to tap 5 times. Impressive.
          </Text>
        )}
      </View>
    </View>
  );
}
