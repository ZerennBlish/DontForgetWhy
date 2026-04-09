import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  ImageBackground,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { kvGet, kvSet } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import type { RootStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import { CARD_POOL, CARD_BACK } from '../data/memoryMatchAssets';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryMatch'>;

type Difficulty = 'easy' | 'medium' | 'hard';
type GamePhase = 'select' | 'playing' | 'won';

interface Card {
  id: number;
  cardKey: string;
  imageSource: ImageSourcePropType;
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
  imageSource,
  cardKey,
  isFlipped,
  isMatched,
  flipAnim,
  onPress,
  cardSize,
  colors,
}: {
  index: number;
  imageSource: ImageSourcePropType;
  cardKey: string;
  isFlipped: boolean;
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

  return (
    <TouchableOpacity
      onPress={() => onPress(index)}
      activeOpacity={0.8}
      accessibilityLabel={isMatched ? `${cardKey}, matched` : isFlipped ? cardKey : 'Card, face down'}
      accessibilityState={{ disabled: isMatched }}
    >
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
          <Image
            source={CARD_BACK}
            style={{ width: cardSize * 0.75, height: cardSize * 0.75 }}
            resizeMode="contain"
          />
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
          <Image
            source={imageSource}
            style={{ width: cardSize * 0.8, height: cardSize * 0.8 }}
            resizeMode="contain"
          />
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

  // Load best scores and settings on focus
  useFocusEffect(
    useCallback(() => {
      const data = kvGet(SCORES_KEY);
      if (data) {
        try {
          setBestScores(JSON.parse(data));
        } catch {}
      }
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
    const selectedCards = shuffleArray([...CARD_POOL]).slice(0, config.pairs);
    const pairedCards = shuffleArray([...selectedCards, ...selectedCards]);

    const newCards: Card[] = pairedCards.map((card, i) => ({
      id: i,
      cardKey: card.key,
      imageSource: card.source,
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
    playGameSound('cardFlip');

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

      if (cardsRef.current[first].cardKey === cardsRef.current[second].cardKey) {
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
          playGameSound('memoryWin');

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
          try {
            const data = kvGet(SCORES_KEY);
            const scores: BestScores = data ? JSON.parse(data) : {};
            const current = scores[diff];
            const isBetter =
              !current ||
              totalMoves < current.bestMoves ||
              (totalMoves === current.bestMoves && totalTime < current.bestTime);
            if (isBetter) {
              scores[diff] = { bestMoves: totalMoves, bestTime: totalTime };
              kvSet(SCORES_KEY, JSON.stringify(scores));
              setBestScores({ ...scores });
            }
          } catch {}

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

  const { width: screenWidthForLayout } = Dimensions.get('window');
  const CONTENT_MAX_WIDTH = Math.min(screenWidthForLayout - 32, 500);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'transparent',
        },

        // Difficulty Select
        selectContent: {
          paddingBottom: 60 + insets.bottom,
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: 'center',
          width: '100%',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 4,
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
          color: colors.overlayText,
          fontFamily: FONTS.gameHeader,
        },
        selectSubtitle: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 6,
        },
        difficultyBtn: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center',
        },
        difficultyLabel: {
          fontSize: 18,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
          textAlign: 'center',
        },
        difficultyInfo: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 4,
          textAlign: 'center',
        },
        bestScoreText: {
          fontSize: 12,
          color: colors.accent,
          fontFamily: FONTS.semiBold,
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
          fontSize: 15,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
        },
        statsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 24,
          marginTop: 8,
        },
        statText: {
          fontSize: 15,
          fontFamily: FONTS.semiBold,
          color: 'rgba(255,255,255,0.7)',
        },
        gridContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },

        // Win Screen
        winContent: {
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingBottom: 60 + insets.bottom,
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: 'center',
          width: '100%',
        },
        winHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 4,
        },
        winHeaderBack: {
          position: 'absolute',
          left: 20,
          top: insets.top + 10,
        },
        winHeaderHome: {
          position: 'absolute',
          left: 64,
          top: insets.top + 10,
        },
        winTitle: {
          fontSize: 26,
          fontFamily: FONTS.extraBold,
          color: colors.overlayText,
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
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
        },
        winStatValue: {
          fontSize: 14,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
        },
        winDivider: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: 4,
        },
        winMessage: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: 'rgba(255,255,255,0.7)',
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
          fontSize: 15,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
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
          fontSize: 15,
          fontFamily: FONTS.semiBold,
          color: colors.accent,
        },
      }),
    [colors, insets.bottom, insets.top, CONTENT_MAX_WIDTH],
  );

  // ---------- Render: Difficulty Select ----------

  if (gamePhase === 'select') {
    return (
      <ImageBackground source={require('../../assets/memory-match-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <View style={styles.header}>
            <View style={styles.headerBack}>
              <BackButton onPress={() => navigation.goBack()} forceDark />
            </View>
            <View style={styles.headerHome}>
              <HomeButton forceDark />
            </View>
            <Image source={require('../../assets/memory-match/card-back.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          </View>
          <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Memory Guy Match</Text>
          <Text style={[styles.selectSubtitle, { textAlign: 'center', paddingHorizontal: 20 }]}>Find all the matching pairs!</Text>
          <ScrollView style={styles.container} contentContainerStyle={styles.selectContent}>

            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
              const config = DIFFICULTY_CONFIG[diff];
              const best = bestScores[diff];
              return (
                <TouchableOpacity
                  key={diff}
                  style={styles.difficultyBtn}
                  onPress={() => { hapticLight(); playGameSound('tap'); startGame(diff); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.difficultyLabel}>{config.label}</Text>
                  <Text style={styles.difficultyInfo}>
                    {config.cols}{'\u00D7'}{config.rows} {'\u00B7'} {config.pairs} pairs {'\u00B7'} Par: {config.par} moves
                  </Text>
                  {best ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                      <Image source={require('../../assets/icons/icon-win.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                      <Text style={[styles.bestScoreText, { marginTop: 0 }]}>
                        Best: {best.bestMoves} moves ({formatTime(best.bestTime)})
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.bestScoreText, { color: 'rgba(255,255,255,0.5)' }]}>
                      No games played yet
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ImageBackground>
    );
  }

  // ---------- Render: Win Screen ----------

  if (gamePhase === 'won') {
    const par = DIFFICULTY_CONFIG[difficulty].par;
    const stars = finalMoves < par ? 3 : finalMoves === par ? 2 : 1;

    return (
      <ImageBackground source={require('../../assets/memory-match-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <View style={styles.winHeader}>
            <View style={styles.winHeaderBack}>
              <BackButton onPress={() => navigation.goBack()} forceDark />
            </View>
            <View style={styles.winHeaderHome}>
              <HomeButton forceDark />
            </View>
            <Image source={require('../../assets/memory-match/card-back.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          </View>
          <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Memory Guy Match</Text>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.winContent}
          >
            <Image source={require('../../assets/icons/icon-party.webp')} style={{ width: 48, height: 48, marginBottom: 8 }} resizeMode="contain" />
            <Text style={styles.winTitle}>Congratulations!</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
              {Array.from({ length: stars }).map((_, i) => (
                <Image key={i} source={require('../../assets/icons/icon-star.webp')} style={{ width: 20, height: 20 }} resizeMode="contain" />
              ))}
            </View>

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
              onPress={() => { hapticLight(); playGameSound('tap'); startGame(difficulty); }}
              activeOpacity={0.7}
            >
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeDifficultyBtn}
              onPress={() => { hapticLight(); playGameSound('tap'); setGamePhase('select'); }}
              activeOpacity={0.7}
            >
              <Text style={styles.changeDifficultyText}>Change Difficulty</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ImageBackground>
    );
  }

  // ---------- Render: Game Board ----------

  const config = DIFFICULTY_CONFIG[difficulty];
  const { width: screenWidth } = Dimensions.get('window');
  const effectiveWidth = Math.min(screenWidth, 600);
  const GRID_PADDING = 16;
  const CARD_GAP = 8;
  const cardSize = Math.floor(
    (effectiveWidth - GRID_PADDING * 2 - (config.cols - 1) * CARD_GAP) / config.cols,
  );
  const gridWidth = config.cols * cardSize + (config.cols - 1) * CARD_GAP;

  return (
    <ImageBackground source={require('../../assets/memory-match-bg.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
        <View style={styles.container}>
          <View style={styles.gameHeader}>
            <View style={styles.gameHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BackButton onPress={handleBackFromGame} forceDark />
                <HomeButton forceDark />
              </View>
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
                  imageSource={card.imageSource}
                  cardKey={card.cardKey}
                  isFlipped={card.isFlipped}
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
      </View>
    </ImageBackground>
  );
}
