import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [riddleStreak, setRiddleStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => setGuessWhyEnabled(s.guessWhyEnabled));
      AsyncStorage.getItem('dailyRiddleStats').then((data) => {
        try {
          if (data) {
            const stats = JSON.parse(data);
            setRiddleStreak(stats.streak || 0);
          } else {
            setRiddleStreak(0);
          }
        } catch {
          setRiddleStreak(0);
        }
      });
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
          backgroundColor: 'transparent',
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
          color: '#FFFFFF',
        },
        subtitle: {
          fontSize: 15,
          color: 'rgba(255,255,255,0.7)',
          marginTop: 6,
          fontStyle: 'italic',
        },
        gameCard: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
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
          color: '#FFFFFF',
        },
        gameDesc: {
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          marginTop: 4,
          lineHeight: 20,
        },
        chevron: {
          fontSize: 18,
          color: 'rgba(255,255,255,0.5)',
        },
        guessWhyCard: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        streakText: {
          fontSize: 13,
          color: colors.orange,
          fontWeight: '700',
          marginTop: 4,
        },
        guessWhySubtext: {
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          fontStyle: 'italic',
          marginTop: 4,
        },
        statsCard: {
          marginHorizontal: 16,
          marginTop: 16,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 2,
          borderColor: colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
      }),
    [colors, insets.bottom],
  );

  return (
    <ImageBackground source={require('../../assets/brain.png')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{'\u{1F3AE}'} Brain Games</Text>
        <Text style={styles.subtitle}>Exercise that forgetful brain of yours</Text>
      </View>

      {/* Daily Riddle */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('DailyRiddle')}
        activeOpacity={0.7}
      >
        <Text style={styles.gameEmoji}>{'\u{1F4A1}'}</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Daily Riddle</Text>
          <Text style={styles.gameDesc}>
            A new brain teaser every day. Can you keep your streak?
          </Text>
          {riddleStreak > 0 && (
            <Text style={styles.streakText}>
              {'\u{1F525}'} {riddleStreak} day streak
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </TouchableOpacity>

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

      {/* Trivia */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('Trivia')}
        activeOpacity={0.7}
      >
        <Text style={styles.gameEmoji}>{'\u{1F9E0}'}</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Trivia</Text>
          <Text style={styles.gameDesc}>
            10 categories. 370+ questions offline.
          </Text>
        </View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </TouchableOpacity>

      {/* Sudoku */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('Sudoku')}
        activeOpacity={0.7}
      >
        <Text style={styles.gameEmoji}>{'\u{1F522}'}</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Sudoku</Text>
          <Text style={styles.gameDesc}>Classic number puzzle. No forgetting allowed.</Text>
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

      {/* Stats */}
      <TouchableOpacity
        style={styles.statsCard}
        onPress={() => navigation.navigate('MemoryScore')}
        activeOpacity={0.7}
      >
        <Text style={styles.gameEmoji}>{'\u{1F4CA}'}</Text>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Your Stats</Text>
          <Text style={styles.gameDesc}>Track your brain training progress</Text>
        </View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
    </ImageBackground>
  );
}
