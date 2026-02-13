import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadSettings, saveSettings } from '../services/settings';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Games'>;

export default function GamesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [guessWhyEnabled, setGuessWhyEnabled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => setGuessWhyEnabled(s.guessWhyEnabled));
    }, []),
  );

  const handleGuessWhyToggle = async (value: boolean) => {
    setGuessWhyEnabled(value);
    await saveSettings({ guessWhyEnabled: value });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          paddingBottom: 60 + insets.bottom,
        },
        header: {
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 24,
        },
        backBtn: {
          fontSize: 16,
          color: colors.accent,
          fontWeight: '600',
          marginBottom: 16,
        },
        title: {
          fontSize: 28,
          fontWeight: '800',
          color: colors.textPrimary,
        },
        subtitle: {
          fontSize: 15,
          color: colors.textTertiary,
          marginTop: 6,
          fontStyle: 'italic',
        },
        gameCard: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        gameEmoji: {
          fontSize: 40,
        },
        gameInfo: {
          flex: 1,
        },
        gameName: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        gameDesc: {
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 4,
          lineHeight: 20,
        },
        chevron: {
          fontSize: 18,
          color: colors.textTertiary,
        },
        guessWhyCard: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        guessWhySubtext: {
          fontSize: 13,
          color: colors.textTertiary,
          fontStyle: 'italic',
          marginTop: 4,
        },
      }),
    [colors, insets.bottom],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{'\u{1F3AE}'} Brain Games</Text>
        <Text style={styles.subtitle}>Exercise that forgetful brain of yours</Text>
      </View>

      {/* Memory Match */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('MemoryMatch')}
        activeOpacity={0.7}
      >
        <Text style={styles.gameEmoji}>{'\u{1F9E9}'}</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Memory Match</Text>
          <Text style={styles.gameDesc}>Flip cards and find matching pairs</Text>
        </View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </TouchableOpacity>

      {/* Guess Why — toggle only, not navigable */}
      <View style={styles.guessWhyCard}>
        <Text style={styles.gameEmoji}>{'\u{1F9E0}'}</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Guess Why</Text>
          <Text style={styles.gameDesc}>
            Can you remember why you set your alarms?
          </Text>
          <Text style={styles.guessWhySubtext}>
            {guessWhyEnabled
              ? 'Plays automatically when alarms fire'
              : 'Disabled \u2014 toggle to play when alarms fire'}
          </Text>
        </View>
        <Switch
          value={guessWhyEnabled}
          onValueChange={handleGuessWhyToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={guessWhyEnabled ? colors.textPrimary : colors.textTertiary}
        />
      </View>
    </ScrollView>
  );
}
