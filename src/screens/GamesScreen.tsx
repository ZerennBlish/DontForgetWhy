import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import { hapticLight } from '../utils/haptics';
import { GamepadIcon, LightbulbIcon, PuzzleIcon, NumbersIcon, BrainIcon, TrophyIcon, FireIcon, ChevronRightIcon } from '../components/Icons';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Games'>;

export default function GamesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [riddleStreak, setRiddleStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 2,
        },
        headerBack: {
          position: 'absolute',
          left: 20,
          top: insets.top + 10,
        },
        headerHome: {
          position: 'absolute',
          left: 64,
          top: insets.top + 10,
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
          elevation: 2,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          alignItems: 'center',
          gap: 16,
        },
        gameEmoji: {
          fontSize: 40,
        } as never,
        gameInfo: {
          flex: 1,
        },
        gameName: {
          fontSize: 18,
          fontWeight: '700',
          color: '#FFFFFF',
          textAlign: 'center',
        },
        gameDesc: {
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          marginTop: 4,
          lineHeight: 20,
          textAlign: 'center',
        },
        chevron: {
          fontSize: 18,
          color: 'rgba(255,255,255,0.5)',
        },
        streakText: {
          fontSize: 13,
          color: colors.orange,
          fontWeight: '700',
        },
      }),
    [colors, insets.bottom],
  );

  return (
    <ImageBackground source={require('../../assets/brain.png')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <View style={styles.header}>
      <View style={styles.headerBack}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.headerHome}>
        <HomeButton />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <GamepadIcon color={colors.accent} size={24} />
        <Text style={styles.title}>Brain Games</Text>
      </View>
    </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 20 }]}>Exercise that forgetful brain of yours</Text>

      {/* Daily Riddle */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => { hapticLight(); navigation.navigate('DailyRiddle'); }}
        activeOpacity={0.7}
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <LightbulbIcon color={colors.accent} size={28} />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Daily Riddle</Text>
          <Text style={styles.gameDesc}>
            A new brain teaser every day. Can you keep your streak?
          </Text>
          {riddleStreak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'center' }}>
              <FireIcon color={colors.orange} size={14} />
              <Text style={styles.streakText}>{riddleStreak} day streak</Text>
            </View>
          )}
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color="rgba(255,255,255,0.5)" size={16} />
        </View>
      </TouchableOpacity>

      {/* Trivia */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => { hapticLight(); navigation.navigate('Trivia'); }}
        activeOpacity={0.7}
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <BrainIcon color={colors.accent} size={28} />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Trivia</Text>
          <Text style={styles.gameDesc}>
            10 categories. 370+ questions offline.
          </Text>
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color="rgba(255,255,255,0.5)" size={16} />
        </View>
      </TouchableOpacity>

      {/* Sudoku */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => { hapticLight(); navigation.navigate('Sudoku'); }}
        activeOpacity={0.7}
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <NumbersIcon color={colors.accent} size={28} />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Sudoku</Text>
          <Text style={styles.gameDesc}>Classic number puzzle. No forgetting allowed.</Text>
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color="rgba(255,255,255,0.5)" size={16} />
        </View>
      </TouchableOpacity>

      {/* Memory Match */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => { hapticLight(); navigation.navigate('MemoryMatch'); }}
        activeOpacity={0.7}
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <PuzzleIcon color={colors.accent} size={28} />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Memory Match</Text>
          <Text style={styles.gameDesc}>Flip cards and find matching pairs</Text>
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color="rgba(255,255,255,0.5)" size={16} />
        </View>
      </TouchableOpacity>

      {/* Trophies */}
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => { hapticLight(); navigation.navigate('MemoryScore'); }}
        activeOpacity={0.7}
      >
        <View style={{ width: 56, alignItems: 'center' }}>
          <TrophyIcon color={colors.accent} size={28} />
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>Trophies</Text>
          <Text style={styles.gameDesc}>Track your brain training progress</Text>
        </View>
        <View style={{ width: 56, alignItems: 'center' }}>
          <ChevronRightIcon color="rgba(255,255,255,0.5)" size={16} />
        </View>
      </TouchableOpacity>
    </ScrollView>
    </View>
    </ImageBackground>
  );
}
