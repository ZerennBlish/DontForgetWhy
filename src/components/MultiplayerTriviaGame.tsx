import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { useMultiplayerTrivia } from '../hooks/useMultiplayerTrivia';
import {
  leaveTriviaGame,
  type TriviaMultiplayerGame,
} from '../services/multiplayerTrivia';

const EXIT_TITLES = [
  'Walking Out?',
  'Rage Quitting?',
  'Leaving the Quiz?',
  'Too Hard?',
  'Giving Up?',
];
const EXIT_MESSAGES = [
  'Everyone else is still playing, you know.',
  'Your team is about to be very disappointed.',
  "The questions don't get easier if you leave.",
  "Quitters never win. Winners never quit. You're about to quit.",
  'Your score stays at whatever it is right now. Which is… not great.',
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}
import type { TriviaParentCategory } from '../types/trivia';

const CATEGORY_LABELS: Record<TriviaParentCategory, string> = {
  general: 'General Knowledge',
  popCulture: 'Pop Culture',
  scienceTech: 'Science & Tech',
  historyPolitics: 'History & Politics',
  geography: 'Geography',
  sportsLeisure: 'Sports & Leisure',
  gamingGeek: 'Gaming & Geek',
  mythFiction: 'Myth & Fiction',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface MultiplayerTriviaGameProps {
  code: string;
  onExit: () => void;
}

export default function MultiplayerTriviaGame({
  code,
  onExit,
}: MultiplayerTriviaGameProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mp = useMultiplayerTrivia({ gameCode: code });
  const navigation = useNavigation();

  const [exitTitle] = useState(() => pickRandom(EXIT_TITLES));
  const [exitMessage] = useState(() => pickRandom(EXIT_MESSAGES));

  const bypassExitRef = useRef(false);

  const isMpActive = mp.status === 'active';

  // Lobby = connected, still in lobby phase. Tracked in a ref so the
  // unmount cleanup can read the latest value.
  const isLobbyRef = useRef(false);
  const hasExitedRef = useRef(false);
  useEffect(() => {
    isLobbyRef.current = mp.isConnected && mp.phase === 'lobby';
  });

  useEffect(() => {
    if (!isMpActive) return;
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (bypassExitRef.current) return;
      if (mp.phase === 'final') return;
      e.preventDefault();
      Alert.alert(exitTitle, exitMessage, [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'I Quit',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveTriviaGame(code);
            } catch {
              if (Platform.OS === 'android') {
                ToastAndroid.show(
                  'Failed to leave — check your connection',
                  ToastAndroid.SHORT,
                );
              } else {
                Alert.alert(
                  'Failed to leave',
                  'Check your connection and try again.',
                );
              }
              return;
            }
            bypassExitRef.current = true;
            hasExitedRef.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsub;
  }, [isMpActive, mp.phase, exitTitle, exitMessage, code, navigation]);

  // On unmount, if the player navigated away from the lobby (hardware back
  // without pressing the in-UI leave button), call leaveTriviaGame so the
  // game is either aborted (host) or the player is removed from the roster.
  useEffect(() => {
    return () => {
      if (isLobbyRef.current && !hasExitedRef.current) {
        hasExitedRef.current = true;
        leaveTriviaGame(code).catch(() => {});
      }
    };
  }, [code]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, paddingHorizontal: 16 },
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        muted: {
          color: colors.overlayText,
          fontSize: 14,
          fontFamily: FONTS.regular,
        },

        // Lobby
        lobbyCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 8,
          gap: 12,
        },
        lobbyLabel: {
          color: colors.textSecondary,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        codeDisplay: {
          color: colors.accent,
          fontSize: 36,
          fontFamily: FONTS.extraBold,
          letterSpacing: 6,
          textAlign: 'center',
        },
        codeHint: {
          color: colors.textTertiary,
          fontSize: 12,
          fontFamily: FONTS.regular,
          textAlign: 'center',
        },
        copyButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 10,
          alignItems: 'center',
        },
        copyButtonText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 13,
        },
        infoRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 4,
        },
        infoKey: {
          color: colors.textSecondary,
          fontFamily: FONTS.semiBold,
          fontSize: 13,
        },
        infoVal: {
          color: colors.textPrimary,
          fontFamily: FONTS.bold,
          fontSize: 13,
        },
        playersHeader: {
          color: colors.textSecondary,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 8,
          marginBottom: 4,
        },
        playerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 6,
          gap: 10,
        },
        playerDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.accent,
        },
        playerName: {
          flex: 1,
          color: colors.textPrimary,
          fontSize: 14,
          fontFamily: FONTS.semiBold,
        },
        hostBadge: {
          color: colors.accent,
          fontSize: 11,
          fontFamily: FONTS.bold,
          letterSpacing: 0.5,
        },
        startButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 12,
        },
        startButtonText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
        disabledBtn: { opacity: 0.5 },
        waitingForHost: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          fontStyle: 'italic',
          textAlign: 'center',
          marginTop: 12,
        },
        leaveBtn: {
          alignSelf: 'center',
          marginTop: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: colors.red + '30',
        },
        leaveBtnText: {
          color: colors.red,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
        },

        // Gameplay top bar
        topBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
        },
        topBarText: {
          color: colors.overlayText,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
        },

        // Scoreboard strip
        scoreboardStrip: {
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: 10,
          gap: 8,
          marginBottom: 10,
        },
        scoreCell: {
          flex: 1,
          alignItems: 'center',
        },
        scoreName: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.overlayText,
          textAlign: 'center',
        },
        scoreNameActive: { color: colors.accent },
        scoreValue: {
          fontSize: 18,
          fontFamily: FONTS.extraBold,
          color: colors.overlayText,
          marginTop: 2,
        },

        // Turn banner
        turnBanner: {
          alignItems: 'center',
          marginBottom: 10,
        },
        turnText: {
          fontSize: 16,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
        },
        turnTextMine: { color: colors.accent },
        stealLabel: {
          fontSize: 12,
          fontFamily: FONTS.extraBold,
          color: colors.sectionGames,
          letterSpacing: 1,
          marginBottom: 4,
        },

        questionBox: {
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: 14,
          paddingVertical: 20,
          paddingHorizontal: 16,
          marginBottom: 12,
        },
        questionText: {
          color: colors.overlayText,
          fontSize: 18,
          fontFamily: FONTS.bold,
          textAlign: 'center',
          lineHeight: 26,
        },

        // Answer buttons
        answerGrid: { gap: 10 },
        answerBtn: {
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        answerText: {
          fontSize: 15,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
          textAlign: 'center',
        },
        answerDisabled: { opacity: 0.6 },
        answerCorrect: {
          backgroundColor: colors.success,
          borderColor: colors.success,
        },
        answerCorrectText: { color: colors.overlayText },
        answerWrong: {
          backgroundColor: colors.red,
          borderColor: colors.red,
        },
        answerWrongText: { color: colors.overlayText },
        answerDim: { opacity: 0.4 },

        // Timer
        timerText: {
          color: colors.accent,
          fontSize: 14,
          fontFamily: FONTS.bold,
          textAlign: 'center',
          marginTop: 8,
        },
        timerUrgent: { color: colors.red },

        // Result notice
        resultNotice: {
          marginTop: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
        },
        resultNoticeText: {
          color: colors.overlayText,
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
        },

        // Final scoreboard
        finalHeader: {
          textAlign: 'center',
          fontSize: 22,
          fontFamily: FONTS.extraBold,
          color: colors.overlayText,
          marginTop: 20,
          marginBottom: 16,
        },
        finalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 8,
          gap: 12,
        },
        finalRowWinner: {
          backgroundColor: colors.accent + '20',
          borderWidth: 1,
          borderColor: colors.accent,
        },
        finalRank: {
          fontSize: 14,
          fontFamily: FONTS.extraBold,
          color: colors.textSecondary,
          width: 32,
        },
        finalRankWinner: { color: colors.accent },
        finalName: {
          flex: 1,
          fontSize: 15,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        finalScore: {
          fontSize: 18,
          fontFamily: FONTS.extraBold,
          color: colors.textPrimary,
        },
        finalScoreWinner: { color: colors.accent },
        winnerBadge: {
          backgroundColor: colors.accent,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginLeft: 6,
        },
        winnerBadgeText: {
          color: '#FFFFFF',
          fontSize: 10,
          fontFamily: FONTS.extraBold,
          letterSpacing: 0.5,
        },
        primaryButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignSelf: 'stretch',
          alignItems: 'center',
          marginTop: 20,
        },
        primaryButtonText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
      }),
    [colors],
  );

  const myUid = mp.myIndex >= 0 ? mp.players[mp.myIndex]?.uid ?? '' : '';

  // ── Lobby handlers ────────────────────────────────────────────
  const handleCopyCode = useCallback(async () => {
    hapticLight();
    playGameSound('tap');
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // swallow
    }
  }, [code]);

  const handleLeaveAndExit = useCallback(() => {
    const message =
      mp.phase === 'lobby' && mp.isHost
        ? 'You will cancel this game for everyone.'
        : mp.phase === 'final'
          ? 'Leave this finished game.'
          : 'You will forfeit this game.';
    Alert.alert('Leave game?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          if (hasExitedRef.current) {
            onExit();
            return;
          }
          hasExitedRef.current = true;
          leaveTriviaGame(code).catch(() => {});
          onExit();
        },
      },
    ]);
  }, [code, onExit, mp.phase, mp.isHost]);

  const handleStart = useCallback(() => {
    hapticLight();
    playGameSound('tap');
    mp.handleStart();
  }, [mp]);

  // ── Derived for gameplay ──────────────────────────────────────
  const shuffledAnswers = useMemo(() => {
    const q = mp.currentQuestion;
    if (!q) return [];
    if (q.type === 'boolean') return ['True', 'False'];
    return shuffle([q.correctAnswer, ...q.incorrectAnswers]);
    // Shuffle is per-question (keyed by id) so the order stays stable across
    // re-renders for a given question.
  }, [mp.currentQuestion?.id]);

  const activePlayer = mp.players[mp.activePlayerIndex] ?? null;
  const isStealAttempt =
    mp.phase === 'question' && mp.attemptsThisQuestion.length > 0;
  const answererName = (() => {
    if (!mp.lastAnswer) return null;
    return (
      mp.players.find((p) => p.uid === mp.lastAnswer!.uid)?.displayName ??
      'Someone'
    );
  })();
  const allTried =
    mp.attemptsThisQuestion.length >= mp.players.length;

  // ── Loading ──────────────────────────────────────────────────
  if (!mp.isConnected) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Connecting…</Text>
      </View>
    );
  }

  // ── Lobby ────────────────────────────────────────────────────
  if (mp.phase === 'lobby') {
    const canStart = mp.players.length >= 2;
    const categoryLabel =
      (CATEGORY_LABELS as Record<string, string>)[mp.category] ?? mp.category;

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.lobbyCard}>
          <Text style={styles.lobbyLabel}>Your game code</Text>
          <Text style={styles.codeDisplay}>{code}</Text>
          <Text style={styles.codeHint}>
            Share this with up to 3 friends. They enter it on the Join screen.
          </Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyCode}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Copy code"
          >
            <Text style={styles.copyButtonText}>Copy Code</Text>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Category</Text>
            <Text style={styles.infoVal}>{categoryLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Questions</Text>
            <Text style={styles.infoVal}>{mp.totalQuestions || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Players</Text>
            <Text style={styles.infoVal}>{mp.players.length}/4</Text>
          </View>

          <Text style={styles.playersHeader}>Players</Text>
          {mp.players.map((p, i) => (
            <View key={p.uid} style={styles.playerRow}>
              <View style={styles.playerDot} />
              <Text style={styles.playerName}>
                {p.displayName}
                {p.uid === myUid ? ' (you)' : ''}
              </Text>
              {i === 0 && <Text style={styles.hostBadge}>HOST</Text>}
            </View>
          ))}

          {mp.isHost ? (
            <TouchableOpacity
              style={[styles.startButton, !canStart && styles.disabledBtn]}
              onPress={handleStart}
              disabled={!canStart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start game"
            >
              <Text style={styles.startButtonText}>
                {canStart ? 'Start Game' : 'Need 2+ players'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.waitingForHost}>
              Waiting for host to start…
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={handleLeaveAndExit}
          accessibilityRole="button"
          accessibilityLabel="Leave lobby"
        >
          <Text style={styles.leaveBtnText}>
            {mp.isHost ? 'Cancel Game' : 'Leave Lobby'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Final ────────────────────────────────────────────────────
  if (mp.phase === 'final') {
    const ranked = [...mp.players].sort((a, b) => b.score - a.score);
    const maxScore = ranked[0]?.score ?? 0;
    const winnerUids = new Set(
      ranked.filter((p) => p.score === maxScore).map((p) => p.uid),
    );
    const winnerCount = winnerUids.size;
    const iWon = winnerUids.has(myUid);
    const headerText =
      winnerCount > 1
        ? `Tie! ${winnerCount} winners`
        : iWon
          ? 'You Win!'
          : `${ranked[0]?.displayName ?? 'Winner'} wins`;

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <Text style={styles.finalHeader}>{headerText}</Text>
        {ranked.map((p, idx) => {
          const isWin = winnerUids.has(p.uid);
          return (
            <View
              key={p.uid}
              style={[styles.finalRow, isWin && styles.finalRowWinner]}
            >
              <Text style={[styles.finalRank, isWin && styles.finalRankWinner]}>
                #{idx + 1}
              </Text>
              <Text style={styles.finalName}>
                {p.displayName}
                {p.uid === myUid ? ' (you)' : ''}
              </Text>
              <Text style={[styles.finalScore, isWin && styles.finalScoreWinner]}>
                {p.score}
              </Text>
              {isWin && (
                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>WIN</Text>
                </View>
              )}
            </View>
          );
        })}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            onExit();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
        >
          <Text style={styles.primaryButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Gameplay (question + result) ──────────────────────────────
  const q = mp.currentQuestion;
  if (!q) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Waiting for questions…</Text>
      </View>
    );
  }

  const categoryLabel =
    (CATEGORY_LABELS as Record<string, string>)[mp.category] ?? mp.category;
  const timerUrgent = mp.timeRemaining <= 5;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>{categoryLabel}</Text>
        <Text style={styles.topBarText}>
          Q {mp.currentQuestionNumber} of {mp.totalQuestions}
        </Text>
      </View>

      <View style={styles.scoreboardStrip}>
        {mp.players.map((p, i) => {
          const active = i === mp.activePlayerIndex;
          return (
            <View key={p.uid} style={styles.scoreCell}>
              <Text
                style={[
                  styles.scoreName,
                  active && styles.scoreNameActive,
                ]}
                numberOfLines={1}
              >
                {p.displayName}
                {p.uid === myUid ? '*' : ''}
              </Text>
              <Text style={styles.scoreValue}>{p.score}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.turnBanner}>
        {isStealAttempt && <Text style={styles.stealLabel}>STEAL!</Text>}
        <Text style={[styles.turnText, mp.isMyTurn && styles.turnTextMine]}>
          {mp.isMyTurn
            ? 'Your Turn!'
            : `${activePlayer?.displayName ?? 'Opponent'}'s Turn`}
        </Text>
      </View>

      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{q.question}</Text>
      </View>

      <View style={styles.answerGrid}>
        {shuffledAnswers.map((answer, idx) => {
          const inResult = mp.phase === 'result';
          const isCorrect = answer === q.correctAnswer;
          const wasSelectedWrong =
            inResult &&
            !!mp.lastAnswer &&
            answer === mp.lastAnswer.answer &&
            !mp.lastAnswer.correct;
          const showCorrectHighlight = inResult && isCorrect;
          const dimOther =
            inResult && !isCorrect && !wasSelectedWrong;
          const disabledForTap = !mp.isMyTurn || mp.phase !== 'question';

          return (
            <TouchableOpacity
              key={`${q.id}-${idx}`}
              style={[
                styles.answerBtn,
                showCorrectHighlight && styles.answerCorrect,
                wasSelectedWrong && styles.answerWrong,
                dimOther && styles.answerDim,
                !inResult && !mp.isMyTurn && styles.answerDisabled,
              ]}
              onPress={() => {
                if (disabledForTap) return;
                mp.handleSubmitAnswer(answer);
              }}
              disabled={disabledForTap}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={answer}
            >
              <Text
                style={[
                  styles.answerText,
                  showCorrectHighlight && styles.answerCorrectText,
                  wasSelectedWrong && styles.answerWrongText,
                ]}
              >
                {answer}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mp.phase === 'question' && mp.isMyTurn && (
        <Text style={[styles.timerText, timerUrgent && styles.timerUrgent]}>
          ⏱ {mp.timeRemaining}s
        </Text>
      )}

      {mp.phase === 'result' && mp.lastAnswer && (
        <View style={styles.resultNotice}>
          {mp.lastAnswer.correct ? (
            <Text style={styles.resultNoticeText}>
              ✓ {answererName} got it! +1
            </Text>
          ) : allTried ? (
            <Text style={styles.resultNoticeText}>
              Nobody got it. Answer: {mp.lastAnswer.correctAnswer}
            </Text>
          ) : (
            <Text style={styles.resultNoticeText}>
              {answererName} missed. Passing to{' '}
              {activePlayer?.displayName ?? 'next'}…
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.leaveBtn}
        onPress={handleLeaveAndExit}
        accessibilityRole="button"
        accessibilityLabel="Leave game"
      >
        <Text style={styles.leaveBtnText}>Leave Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Keep the TriviaMultiplayerGame type alias exported for consumers who
// want to type-check game data passed between screens.
export type { TriviaMultiplayerGame };
