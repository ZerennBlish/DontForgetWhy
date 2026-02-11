import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadStats, resetStats, GuessWhyStats } from '../services/guessWhyStats';
import { getRank } from '../data/memoryRanks';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryScore'>;

export default function MemoryScoreScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<GuessWhyStats>({
    wins: 0,
    losses: 0,
    skips: 0,
    streak: 0,
    bestStreak: 0,
  });

  const styles = useMemo(() => StyleSheet.create({
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
    rankSection: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 20,
    },
    rankEmoji: {
      fontSize: 64,
      marginBottom: 12,
    },
    rankTitle: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 32,
    },
    percentage: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 16,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
      marginTop: 4,
    },
    statsCard: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    statLabel: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    forgetLogBtn: {
      marginHorizontal: 16,
      marginTop: 24,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    forgetLogBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
    },
    resetBtn: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    resetBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.red,
    },
  }), [colors, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      loadStats().then(setStats);
    }, [])
  );

  const total = stats.wins + stats.losses + stats.skips;
  const percentage = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  const rank = getRank(stats.wins, stats.losses, stats.skips);
  const subtitle = total === 0
    ? 'No games yet'
    : percentage >= 50
      ? 'Wall of Remembrance'
      : 'Hall of Shame';

  const handleReset = () => {
    Alert.alert('Reset Stats', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          const fresh = await resetStats();
          setStats(fresh);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory Score</Text>
      </View>

      <View style={styles.rankSection}>
        <Text style={styles.rankEmoji}>{rank.emoji}</Text>
        <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
        <Text style={styles.percentage}>{total > 0 ? `${percentage}%` : '--'}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u2705'} Wins</Text>
          <Text style={styles.statValue}>{stats.wins}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u274C'} Losses</Text>
          <Text style={styles.statValue}>{stats.losses}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u23ED\uFE0F'} Skips</Text>
          <Text style={styles.statValue}>{stats.skips}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u{1F525}'} Current Streak</Text>
          <Text style={styles.statValue}>{stats.streak}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u{1F3C6}'} Best Streak</Text>
          <Text style={styles.statValue}>{stats.bestStreak}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{'\u{1F3AE}'} Total Games</Text>
          <Text style={styles.statValue}>{total}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.forgetLogBtn}
        onPress={() => navigation.navigate('ForgetLog')}
        activeOpacity={0.7}
      >
        <Text style={styles.forgetLogBtnText}>{'\u{1F4DC}'} What Did I Forget?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
        <Text style={styles.resetBtnText}>Reset Stats</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
