import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticMedium } from '../utils/haptics';
import type { RootStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryMatch'>;

type Difficulty = 'easy' | 'medium' | 'hard';
type GamePhase = 'select' | 'playing' | 'won';

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface DifficultyBest {
  bestMoves: number;
  bestTime: number;
}

interface BestScores {
  easy?: DifficultyBest;
  medium?: DifficultyBest;
  hard?: DifficultyBest;
}

const SCORES_KEY = 'memoryMatchScores';

const EMOJI_POOL = [
  '\u{1F355}', '\u{1F3B8}', '\u{1F680}', '\u{1F308}', '\u{1F3AF}',
  '\u{1F9E9}', '\u{1F3AA}', '\u{1F98A}', '\u{1F33A}', '\u{1F3AD}',
  '\u{1F369}', '\u{1F98B}', '\u{1F3A8}', '\u{1F52E}', '\u{1F3B2}',
  '\u{1F319}', '\u{1F984}', '\u{1F3B5}', '\u{1F340}', '\u{1F419}',
  '\u{1F388}', '\u{1F3C6}',
];

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { cols: number; rows: number; pairs: number; par: number; label: string }
> = {
  easy: { cols: 3, rows: 4, pairs: 6, par: 8, label: 'Easy' },
  medium: { cols: 4, rows: 4, pairs: 8, par: 12, label: 'Medium' },
  hard: { cols: 5, rows: 4, pairs: 10, par: 16, label: 'Hard' },
};

const GREAT_MESSAGES = [
  "Your memory is actually... good? Are you sure you need this app?",
  "Impressive. Your brain cells are showing off.",
  "Okay, memory champion. Don't let it go to your head.",
  "Did you cheat? Because that was suspiciously good.",
  "Your neurons are firing on all cylinders today.",
  "Elephants wish they had your memory.",
];

const OK_MESSAGES = [
  "Not bad. Not great. Very on-brand for you.",
  "Average performance from someone who needs an alarm app to remember things.",
  "You remembered where the cards were. Now try remembering why you set your alarms.",
  "Solidly mediocre. Your participation trophy is in the mail.",
  "The definition of 'it could've been worse.'",
  "You passed the vibe check. Barely.",
];

const BAD_MESSAGES = [
  "This explains a lot about why you need this app.",
  "Your memory called. It's not coming back.",
  "The cards were RIGHT THERE and you still forgot.",
  "Even goldfish are judging you right now.",
  "Maybe try writing things down. On paper. With a pen.",
  "Your brain just filed a complaint with HR.",
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------- Card Component ----------

const CardComponent = React.memo(function CardComponent({
  index,
  emoji,
  isMatched,
  flipAnim,
  onPress,
  cardSize,
  colors,
}: {
  index: number;
  emoji: string;
  isMatched: boolean;
  flipAnim: Animated.Value;
  onPress: (index: number) => void;
  cardSize: number;
  colors: ThemeColors;
}) {
  const frontScale = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const backScale = flipAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const emojiSize = Math.floor(cardSize * 0.45);

  return (
    <TouchableOpacity onPress={() => onPress(index)} activeOpacity={0.8}>
      <View style={{ width: cardSize, height: cardSize, opacity: isMatched ? 0.7 : 1 }}>
        {/* Front face (face down) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: cardSize,
            height: cardSize,
            backgroundColor: colors.card,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            transform: [{ scaleX: frontScale }],
          }}
        >
          <Text style={{ fontSize: emojiSize }}>{'\u2753'}</Text>
        </Animated.View>

        {/* Back face (face up) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: cardSize,
            height: cardSize,
            backgroundColor: colors.activeBackground,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: isMatched ? 2 : 1,
            borderColor: isMatched ? colors.accent : colors.border,
            transform: [{ scaleX: backScale }],
          }}
        >
          <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

// ---------- Main Screen ----------

export default function MemoryMatchScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bestScores, setBestScores] = useState<BestScores>({});
  const [winMessage, setWinMessage] = useState('');
  const [finalMoves, setFinalMoves] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [gameId, setGameId] = useState(0);

  // Refs for mutable game state (avoids stale closures in handleCardPress)
  const flipAnims = useRef<Animated.Value[]>([]);
  const cardsRef = useRef<Card[]>([]);
  const flippedRef = useRef<number[]>([]);
  const processingRef = useRef(false);
  const movesRef = useRef(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartedRef = useRef(false);
  const difficultyRef = useRef<Difficulty>('medium');

  // Load best scores on focus
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SCORES_KEY).then((data) => {
        if (data) {
          try {
            setBestScores(JSON.parse(data));
          } catch {}
        }
      });
    }, []),
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startGame = useCallback((diff: Difficulty) => {
    const config = DIFFICULTY_CONFIG[diff];
    const selectedEmojis = shuffleArray(EMOJI_POOL).slice(0, config.pairs);
    const cardEmojis = shuffleArray([...selectedEmojis, ...selectedEmojis]);

    const newCards: Card[] = cardEmojis.map((emoji, i) => ({
      id: i,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));

    // Reset refs
    flipAnims.current = newCards.map(() => new Animated.Value(0));
    cardsRef.current = newCards;
    flippedRef.current = [];
    processingRef.current = false;
    movesRef.current = 0;
    elapsedRef.current = 0;
    timerStartedRef.current = false;
    difficultyRef.current = diff;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Update state
    setCards(newCards);
    setMoves(0);
    setElapsedTime(0);
    setDifficulty(diff);
    setGamePhase('playing');
    setGameId((prev) => prev + 1);
  }, []);

  const handleCardPress = useCallback((index: number) => {
    if (processingRef.current) return;

    const card = cardsRef.current[index];
    if (!card || card.isFlipped || card.isMatched) return;
    hapticMedium();

    // Start timer on first card flip
    if (!timerStartedRef.current) {
      timerStartedRef.current = true;
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedTime(elapsedRef.current);
      }, 1000);
    }

    // Flip card up (animation)
    Animated.timing(flipAnims.current[index], {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Update card state
    const updatedCards = cardsRef.current.map((c, i) =>
      i === index ? { ...c, isFlipped: true } : c,
    );
    cardsRef.current = updatedCards;
    setCards(updatedCards);

    // Track flipped cards
    flippedRef.current = [...flippedRef.current, index];

    if (flippedRef.current.length === 2) {
      const [first, second] = flippedRef.current;
      movesRef.current += 1;
      setMoves(movesRef.current);

      if (cardsRef.current[first].emoji === cardsRef.current[second].emoji) {
        // Match found
        const matchedCards = cardsRef.current.map((c, i) =>
          i === first || i === second ? { ...c, isMatched: true } : c,
        );
        cardsRef.current = matchedCards;
        setCards(matchedCards);
        flippedRef.current = [];

        // Check for win
        if (matchedCards.every((c) => c.isMatched)) {
          // Stop timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          const diff = difficultyRef.current;
          const par = DIFFICULTY_CONFIG[diff].par;
          const totalMoves = movesRef.current;
          const totalTime = elapsedRef.current;

          // Pick message
          let msgs: string[];
          if (totalMoves < par) msgs = GREAT_MESSAGES;
          else if (totalMoves === par) msgs = OK_MESSAGES;
          else msgs = BAD_MESSAGES;
          setWinMessage(msgs[Math.floor(Math.random() * msgs.length)]);
          setFinalMoves(totalMoves);
          setFinalTime(totalTime);

          // Save best score
          AsyncStorage.getItem(SCORES_KEY)
            .then((data) => {
              const scores: BestScores = data ? JSON.parse(data) : {};
              const current = scores[diff];
              const isBetter =
                !current ||
                totalMoves < current.bestMoves ||
                (totalMoves === current.bestMoves && totalTime < current.bestTime);
              if (isBetter) {
                scores[diff] = { bestMoves: totalMoves, bestTime: totalTime };
                AsyncStorage.setItem(SCORES_KEY, JSON.stringify(scores));
                setBestScores({ ...scores });
              }
            })
            .catch(() => {});

          setTimeout(() => setGamePhase('won'), 600);
        }
      } else {
        // No match — wait then flip back
        processingRef.current = true;

        setTimeout(() => {
          Animated.parallel([
            Animated.timing(flipAnims.current[first], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(flipAnims.current[second], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();

          const resetCards = cardsRef.current.map((c, i) =>
            i === first || i === second ? { ...c, isFlipped: false } : c,
          );
          cardsRef.current = resetCards;
          setCards(resetCards);
          flippedRef.current = [];
          processingRef.current = false;
        }, 800);
      }
    }
  }, []);

  const handleBackFromGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGamePhase('select');
  }, []);

  // ---------- Styles ----------

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },

        // Difficulty Select
        selectContent: {
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
        selectSubtitle: {
          fontSize: 15,
          color: colors.textTertiary,
          marginTop: 6,
        },
        difficultyBtn: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
        },
        difficultyLabel: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        difficultyInfo: {
          fontSize: 14,
          color: colors.textTertiary,
          marginTop: 4,
        },
        bestScoreText: {
          fontSize: 13,
          color: colors.accent,
          fontWeight: '600',
          marginTop: 8,
        },

        // Game Phase
        gameHeader: {
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 12,
        },
        gameHeaderRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        gameDifficulty: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        statsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 24,
          marginTop: 8,
        },
        statText: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textSecondary,
        },
        gridContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },

        // Win Screen
        winContent: {
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingBottom: 60 + insets.bottom,
        },
        winEmoji: {
          fontSize: 64,
          marginBottom: 8,
        },
        winTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: colors.textPrimary,
          marginBottom: 12,
        },
        starsText: {
          fontSize: 36,
          marginBottom: 20,
        },
        winStatsCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          width: '100%',
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 20,
        },
        winStatRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
        },
        winStatLabel: {
          fontSize: 15,
          color: colors.textSecondary,
        },
        winStatValue: {
          fontSize: 15,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        winDivider: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: 4,
        },
        winMessage: {
          fontSize: 15,
          color: colors.textSecondary,
          fontStyle: 'italic',
          textAlign: 'center',
          marginBottom: 28,
          paddingHorizontal: 12,
          lineHeight: 22,
        },
        playAgainBtn: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 48,
          marginBottom: 12,
          width: '100%',
          alignItems: 'center',
        },
        playAgainText: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        changeDifficultyBtn: {
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 48,
          width: '100%',
          alignItems: 'center',
        },
        changeDifficultyText: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.accent,
        },
      }),
    [colors, insets.bottom],
  );

  // ---------- Render: Difficulty Select ----------

  if (gamePhase === 'select') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.selectContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{'\u{1F9E9}'} Memory Match</Text>
          <Text style={styles.selectSubtitle}>Find all the matching pairs!</Text>
        </View>

        {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
          const config = DIFFICULTY_CONFIG[diff];
          const best = bestScores[diff];
          return (
            <TouchableOpacity
              key={diff}
              style={styles.difficultyBtn}
              onPress={() => startGame(diff)}
              activeOpacity={0.7}
            >
              <Text style={styles.difficultyLabel}>{config.label}</Text>
              <Text style={styles.difficultyInfo}>
                {config.cols}{'\u00D7'}{config.rows} {'\u00B7'} {config.pairs} pairs {'\u00B7'} Par: {config.par} moves
              </Text>
              {best ? (
                <Text style={styles.bestScoreText}>
                  {'\u{1F3C6}'} Best: {best.bestMoves} moves ({formatTime(best.bestTime)})
                </Text>
              ) : (
                <Text style={[styles.bestScoreText, { color: colors.textTertiary }]}>
                  No games played yet
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  // ---------- Render: Win Screen ----------

  if (gamePhase === 'won') {
    const par = DIFFICULTY_CONFIG[difficulty].par;
    const stars = finalMoves < par ? 3 : finalMoves === par ? 2 : 1;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.winContent}
      >
        <Text style={styles.winEmoji}>{'\u{1F389}'}</Text>
        <Text style={styles.winTitle}>Congratulations!</Text>
        <Text style={styles.starsText}>{'\u2B50'.repeat(stars)}</Text>

        <View style={styles.winStatsCard}>
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Moves</Text>
            <Text style={styles.winStatValue}>{finalMoves}</Text>
          </View>
          <View style={styles.winDivider} />
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Time</Text>
            <Text style={styles.winStatValue}>{formatTime(finalTime)}</Text>
          </View>
          <View style={styles.winDivider} />
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Par</Text>
            <Text style={styles.winStatValue}>{par} moves</Text>
          </View>
          <View style={styles.winDivider} />
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Rating</Text>
            <Text style={styles.winStatValue}>
              {stars === 3 ? 'Amazing!' : stars === 2 ? 'On par' : 'Keep trying'}
            </Text>
          </View>
        </View>

        <Text style={styles.winMessage}>{`"${winMessage}"`}</Text>

        <TouchableOpacity
          style={styles.playAgainBtn}
          onPress={() => startGame(difficulty)}
          activeOpacity={0.7}
        >
          <Text style={styles.playAgainText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeDifficultyBtn}
          onPress={() => setGamePhase('select')}
          activeOpacity={0.7}
        >
          <Text style={styles.changeDifficultyText}>Change Difficulty</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- Render: Game Board ----------

  const config = DIFFICULTY_CONFIG[difficulty];
  const { width: screenWidth } = Dimensions.get('window');
  const GRID_PADDING = 16;
  const CARD_GAP = 8;
  const cardSize = Math.floor(
    (screenWidth - GRID_PADDING * 2 - (config.cols - 1) * CARD_GAP) / config.cols,
  );
  const gridWidth = config.cols * cardSize + (config.cols - 1) * CARD_GAP;

  return (
    <View style={styles.container}>
      <View style={styles.gameHeader}>
        <View style={styles.gameHeaderRow}>
          <TouchableOpacity onPress={handleBackFromGame} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.gameDifficulty}>{config.label}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>Moves: {moves}</Text>
          <Text style={styles.statText}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      <View style={styles.gridContainer}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: CARD_GAP,
            width: gridWidth,
          }}
        >
          {cards.map((card, index) => (
            <CardComponent
              key={`${gameId}-${index}`}
              index={index}
              emoji={card.emoji}
              isMatched={card.isMatched}
              flipAnim={flipAnims.current[index]}
              onPress={handleCardPress}
              cardSize={cardSize}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
