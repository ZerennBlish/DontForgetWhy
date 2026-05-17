import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { GameNavButtons } from '../components/GameNavButtons';
import ProGate from '../components/ProGate';
import useEntitlement from '../hooks/useEntitlement';
import { useDiceGame } from '../hooks/useDiceGame';
import MultiplayerDiceGame from '../components/MultiplayerDiceGame';
import {
  createDiceGame as mpCreate,
  joinDiceGame as mpJoin,
  startDiceGame as mpStart,
  leaveDiceGame as mpLeave,
  listenToGame,
  type DiceMultiplayerGame,
} from '../services/multiplayerDice';
import { getCurrentUser } from '../services/firebaseAuth';
import type { MultiplayerGame } from '../services/multiplayer';
import {
  DICE_BACKGROUND,
  getDieFace,
  getDiceTheme,
  type DiceTheme,
} from '../data/diceAssets';
import {
  ALL_CATEGORIES,
  CATEGORY_DISPLAY_NAMES,
  LOWER_CATEGORIES,
  MAX_ROLLS,
  MAX_ROUNDS,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  UPPER_CATEGORIES,
  type DicePlayer,
  type ScoringCategory,
} from '../services/diceGameTypes';
import {
  calculateTotal,
  getUpperSubtotal,
  hasUpperBonus,
} from '../services/diceGameScoring';
import { isProUser } from '../services/proStatus';
import { hapticLight, hapticMedium, hapticHeavy, hapticError } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DiceGame'>;

const PLAYER_COUNT_OPTIONS = [2, 3, 4] as const;

type DiceMode = 'cpu' | 'multiplayer' | null;
type MpPhase = 'menu' | 'create' | 'join' | 'lobby' | 'playing';

export default function DiceGameScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entitlement = useEntitlement();
  const game = useDiceGame();

  // Pro gating — Pro status read once on mount. ProGate auto-closes when the
  // purchase lands (its internal effect calls onClose). The gate is rendered
  // as a conditional return AFTER all hooks below, so Pro flipping mid-session
  // never changes the hook count between renders.
  const [proGateVisible, setProGateVisible] = useState(() => !isProUser());

  // Local-only theme override (Pro can flip between toon and chrome for the
  // session). Does not persist.
  const [themeOverride, setThemeOverride] = useState<DiceTheme | null>(null);
  const diceTheme: DiceTheme = themeOverride ?? getDiceTheme();

  const [playerCount, setPlayerCount] = useState<number>(2);

  // Multiplayer state.
  const [diceMode, setDiceMode] = useState<DiceMode>(null);
  const [mpPhase, setMpPhase] = useState<MpPhase>('menu');
  const [mpCode, setMpCode] = useState<string | null>(null);
  const [mpLobbyGame, setMpLobbyGame] = useState<DiceMultiplayerGame | null>(
    null,
  );
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Opponent scorecard modal.
  const [opponentModalIndex, setOpponentModalIndex] = useState<number | null>(
    null,
  );

  // Subscribe to the lobby game while waiting for it to fill up.
  useEffect(() => {
    if (mpPhase !== 'lobby' || !mpCode) return;
    const unsub = listenToGame(
      mpCode,
      (g: MultiplayerGame | null) => {
        if (!g) return;
        const dice = g as unknown as DiceMultiplayerGame;
        if (dice.type !== 'dice') return;
        setMpLobbyGame(dice);
        if (dice.status === 'active') {
          setMpPhase('playing');
        }
      },
      () => {},
    );
    return () => unsub();
  }, [mpPhase, mpCode]);

  // ── Navigation guard: confirm before leaving an active single-player game ──
  // Multiplayer mode has its own guard inside MultiplayerDiceGame; skip there.
  const bypassExitRef = useRef(false);
  const prevDiceKeyRef = useRef('');

  useEffect(() => {
    if (diceMode === 'multiplayer') return;
    const inActiveGame = game.phase !== 'setup' && game.phase !== 'gameOver';
    if (!inActiveGame) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassExitRef.current) return;
      e.preventDefault();
      Alert.alert('Quit game?', 'Your current game will be lost.', [
        { text: 'Keep playing', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => {
            bypassExitRef.current = true;
            game.resetGame();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, diceMode, game.phase, game]);

  useEffect(() => {
    if (game.phase !== 'rolling' && game.phase !== 'stealWindow') return;
    const diceKey = game.dice.join('-');
    if (diceKey !== prevDiceKeyRef.current && game.dice.some((d) => d !== 0)) {
      if (prevDiceKeyRef.current !== '') {
        void playGameSound('diceRoll');
      }
      prevDiceKeyRef.current = diceKey;
    } else if (diceKey !== prevDiceKeyRef.current) {
      prevDiceKeyRef.current = diceKey;
    }
  }, [game.dice, game.phase]);

  // ── Screen-level sound/haptic wrappers ─────────────────────────────────────

  const onRollPress = () => {
    hapticLight();
    game.rollDice();
  };

  const onTogglePress = (index: number) => {
    hapticLight();
    void playGameSound('tap');
    game.toggleHold(index);
  };

  const onScorePress = (category: ScoringCategory) => {
    hapticMedium();
    void playGameSound('chessPlace');
    game.scoreCategory(category);
    // Yahtzee celebration if we just scored 50 in yahtzee.
    const dice = game.dice;
    if (
      category === 'yahtzee' &&
      dice.length === 5 &&
      dice.every((d) => d === dice[0]) &&
      dice[0] !== 0
    ) {
      hapticHeavy();
      void playGameSound('gameWin');
    }
  };

  const onStealPress = () => {
    hapticHeavy();
    void playGameSound('capture');
    game.attemptSteal();
  };

  const onResetPress = () => {
    hapticLight();
    void playGameSound('tap');
    // Player indices change between games — clear modal so it can't point at
    // a stale opponent after Play Again.
    setOpponentModalIndex(null);
    prevDiceKeyRef.current = '';
    game.resetGame();
  };

  const onStartPress = () => {
    hapticLight();
    void playGameSound('tap');
    setOpponentModalIndex(null);
    prevDiceKeyRef.current = '';
    game.startGame(playerCount, 0);
  };

  const onThemeTogglePress = () => {
    hapticLight();
    setThemeOverride((prev) =>
      prev === 'chrome' ? 'toon' : prev === 'toon' ? 'chrome' : (getDiceTheme() === 'chrome' ? 'toon' : 'chrome'),
    );
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        overlay: { flex: 1, backgroundColor: colors.modalOverlay },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 4,
        },
        title: {
          fontSize: 26,
          color: colors.overlayText,
          fontFamily: FONTS.gameHeader,
          textAlign: 'center',
        },
        themePill: {
          alignSelf: 'center',
          marginTop: 4,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        themePillText: {
          color: colors.textSecondary,
          fontFamily: FONTS.semiBold,
          fontSize: 11,
        },
        body: { flex: 1, paddingHorizontal: 16 },

        // Setup card
        setupCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 24,
        },
        setupTitle: {
          fontSize: 20,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: 18,
          fontFamily: FONTS.gameHeader,
        },
        sectionLabel: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textSecondary,
          marginBottom: 10,
          opacity: 0.8,
        },
        playerCountRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 20,
        },
        playerCountButton: {
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        playerCountButtonSelected: { borderColor: colors.accent },
        playerCountText: {
          fontSize: 18,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
        },
        playButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        playButtonText: {
          color: colors.overlayText,
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
        comingSoonButton: {
          backgroundColor: colors.background,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 10,
          opacity: 0.5,
        },
        comingSoonText: {
          color: colors.textTertiary,
          fontFamily: FONTS.semiBold,
          fontSize: 13,
        },

        // Opponent mini cards
        miniCardsRow: {
          flexDirection: 'row',
          gap: 8,
          marginTop: 10,
        },
        miniCard: {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 10,
          padding: 8,
          minHeight: 56,
          borderWidth: 1,
          borderColor: colors.border,
        },
        miniCardName: {
          color: colors.textPrimary,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
        },
        miniCardScore: {
          color: colors.accent,
          fontSize: 16,
          fontFamily: FONTS.extraBold,
          textAlign: 'center',
          marginTop: 2,
        },
        miniCardBadgeRow: {
          flexDirection: 'row',
          gap: 4,
          justifyContent: 'center',
          marginTop: 2,
        },
        miniCardBadge: {
          fontSize: 9,
          fontFamily: FONTS.bold,
          color: colors.orange,
        },

        // Your scorecard
        yourCard: {
          backgroundColor: colors.card,
          borderRadius: 12,
          marginTop: 10,
          padding: 12,
        },
        yourCardHeader: {
          fontSize: 12,
          fontFamily: FONTS.bold,
          color: colors.textSecondary,
          letterSpacing: 0.5,
        },
        scoreRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 6,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        scoreRowTappable: {},
        categoryLabel: {
          color: colors.textPrimary,
          fontSize: 13,
          fontFamily: FONTS.regular,
          flex: 1,
        },
        categoryLabelFilled: {
          color: colors.textTertiary,
        },
        scoreValue: {
          color: colors.textPrimary,
          fontSize: 13,
          fontFamily: FONTS.bold,
          minWidth: 36,
          textAlign: 'right',
        },
        scoreValuePreview: {
          color: colors.accent,
          opacity: 0.6,
        },
        scoreValueFilled: {
          color: colors.textPrimary,
        },
        scoreValueZero: {
          color: colors.textTertiary,
        },
        subtotalRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 4,
        },
        subtotalText: {
          color: colors.textSecondary,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
        },
        bonusEarned: {
          color: colors.accent,
          fontFamily: FONTS.bold,
        },
        bonusPending: {
          color: colors.textTertiary,
        },
        totalRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: 8,
          marginTop: 4,
          borderTopWidth: 1,
          borderTopColor: colors.accent,
        },
        totalLabel: {
          color: colors.textPrimary,
          fontSize: 14,
          fontFamily: FONTS.extraBold,
        },
        totalValue: {
          color: colors.accent,
          fontSize: 18,
          fontFamily: FONTS.extraBold,
        },

        // Dice tray
        diceTray: {
          marginTop: 12,
          borderRadius: 12,
          overflow: 'hidden',
          paddingVertical: 14,
          paddingHorizontal: 8,
        },
        diceRow: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        },
        die: {
          width: 52,
          height: 52,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        dieHeld: {
          borderColor: colors.accent,
          transform: [{ scale: 1.05 }],
        },
        dieImage: { width: 48, height: 48 },
        diePlaceholder: {
          color: colors.overlayText,
          fontFamily: FONTS.bold,
          fontSize: 14,
          textAlign: 'center',
          opacity: 0.8,
        },
        holdLabel: {
          marginTop: 2,
          fontSize: 9,
          color: colors.accent,
          fontFamily: FONTS.bold,
          textAlign: 'center',
        },
        rollPrompt: {
          color: colors.overlayText,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
          marginTop: 8,
        },

        rollButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
          marginTop: 10,
        },
        rollButtonDisabled: { opacity: 0.4 },
        rollButtonText: {
          color: colors.overlayText,
          fontFamily: FONTS.bold,
          fontSize: 14,
        },

        // CPU thinking
        cpuStatus: {
          marginTop: 10,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          alignItems: 'center',
        },
        cpuStatusText: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
        },

        // Steal overlay
        stealOverlay: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16 + insets.bottom,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 2,
          borderColor: colors.red,
        },
        stealTitle: {
          color: colors.textPrimary,
          fontFamily: FONTS.bold,
          fontSize: 14,
          textAlign: 'center',
        },
        stealTimer: {
          color: colors.textSecondary,
          fontFamily: FONTS.semiBold,
          fontSize: 12,
          textAlign: 'center',
          marginTop: 2,
        },
        stealButton: {
          backgroundColor: colors.red,
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: 'center',
          marginTop: 10,
        },
        stealButtonDisabled: { opacity: 0.4 },
        stealButtonText: {
          color: colors.overlayText,
          fontFamily: FONTS.extraBold,
          fontSize: 16,
          letterSpacing: 1,
        },

        // Steal flash
        stealFlash: {
          position: 'absolute',
          top: insets.top + 70,
          left: 16,
          right: 16,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: colors.orange + '60',
        },
        stealFlashText: {
          color: colors.textPrimary,
          fontSize: 12,
          fontFamily: FONTS.bold,
          textAlign: 'center',
        },

        // Game over
        gameOverBackdrop: {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.modalOverlay,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        gameOverCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 24,
          width: '100%',
        },
        gameOverTitle: {
          fontSize: 22,
          fontFamily: FONTS.extraBold,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: 12,
        },
        rankingRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        rankingName: {
          color: colors.textPrimary,
          fontFamily: FONTS.semiBold,
          fontSize: 14,
        },
        rankingScore: {
          color: colors.accent,
          fontFamily: FONTS.extraBold,
          fontSize: 14,
        },

        // Modal
        modalBackdrop: {
          flex: 1,
          backgroundColor: colors.modalOverlay,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
        },
        modalCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          width: '100%',
          maxHeight: '85%',
        },
        modalTitle: {
          fontSize: 18,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: 8,
        },
        modalCloseBtn: {
          marginTop: 12,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: colors.background,
          alignItems: 'center',
        },
        modalCloseText: {
          color: colors.textPrimary,
          fontFamily: FONTS.semiBold,
          fontSize: 13,
        },
      }),
    [colors, insets.top, insets.bottom],
  );

  // ── Back arrow: delegate to navigation. The beforeRemove guard above shows
  // the quit confirmation during active gameplay; here we just request goBack.
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Multiplayer handlers ───────────────────────────────────────────────────

  const handlePickCpuMode = useCallback(() => {
    hapticLight();
    void playGameSound('tap');
    setDiceMode('cpu');
  }, []);

  const handlePickMpMode = useCallback(() => {
    hapticLight();
    void playGameSound('tap');
    if (!getCurrentUser()) {
      Alert.alert(
        'Sign in required',
        'Sign in with Google to play multiplayer dice.',
      );
      return;
    }
    setDiceMode('multiplayer');
    setMpPhase('menu');
  }, []);

  const handleBackToModeSelect = useCallback(() => {
    hapticLight();
    void playGameSound('tap');
    setDiceMode(null);
    setMpPhase('menu');
    setMpCode(null);
    setMpLobbyGame(null);
  }, []);

  const handleCreateMpGame = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) return;
    if (creating) return;
    setCreating(true);
    try {
      const { code } = await mpCreate(
        { uid: user.uid, displayName: user.displayName || user.email || 'Player' },
        playerCount,
      );
      setMpCode(code);
      setMpPhase('lobby');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create game';
      Alert.alert('Could not create game', msg);
    } finally {
      setCreating(false);
    }
  }, [creating, playerCount]);

  const handleJoinMpGame = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) return;
    if (joining) return;
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length !== 6) {
      setJoinError('Enter the full 6-character code.');
      return;
    }
    setJoinError(null);
    setJoining(true);
    try {
      await mpJoin(normalized, {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Player',
      });
      setMpCode(normalized);
      setMpPhase('lobby');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join';
      setJoinError(msg);
    } finally {
      setJoining(false);
    }
  }, [joinCode, joining]);

  const handleStartMpGame = useCallback(async () => {
    const user = getCurrentUser();
    if (!user || !mpCode) return;
    try {
      await mpStart(mpCode, user.uid);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start';
      Alert.alert('Cannot start', msg);
    }
  }, [mpCode]);

  const handleExitMpGame = useCallback(() => {
    // Tell Firestore we left so the lobby cleans up (host promotion, player
    // list pruning, finishing the doc when empty). The hook's unmount path
    // also leaves on active forfeits, but lobby exits go through here only.
    const user = getCurrentUser();
    if (mpCode && user) {
      mpLeave(mpCode, user.uid).catch((e) => {
        console.warn('[DiceGameScreen] leaveDiceGame failed:', e);
      });
    }
    setMpCode(null);
    setMpLobbyGame(null);
    setMpPhase('menu');
  }, [mpCode]);

  // ── Renderers ──────────────────────────────────────────────────────────────

  const renderSetup = () => (
    <View style={styles.body}>
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>That One Dice Game</Text>
        <Text style={styles.sectionLabel}>How many players?</Text>
        <View style={styles.playerCountRow}>
          {PLAYER_COUNT_OPTIONS.map((n) => {
            const active = playerCount === n;
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.playerCountButton,
                  active && styles.playerCountButtonSelected,
                ]}
                onPress={() => {
                  hapticLight();
                  void playGameSound('tap');
                  setPlayerCount(n);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${n} players`}
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.playerCountText}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.playButton}
          onPress={onStartPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Start game versus CPU"
        >
          <Text style={styles.playButtonText}>vs CPU</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.playButton, { marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={handlePickMpMode}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="vs Players multiplayer"
        >
          <Text style={[styles.playButtonText, { color: colors.textPrimary }]}>
            vs Players
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Multiplayer menu ───────────────────────────────────────────────────────

  const renderMpMenu = () => (
    <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Multiplayer Dice</Text>
        <Text style={styles.sectionLabel}>How many players?</Text>
        <View style={styles.playerCountRow}>
          {PLAYER_COUNT_OPTIONS.map((n) => {
            const active = playerCount === n;
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.playerCountButton,
                  active && styles.playerCountButtonSelected,
                ]}
                onPress={() => {
                  hapticLight();
                  void playGameSound('tap');
                  setPlayerCount(n);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${n} players`}
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.playerCountText}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.playButton, creating && { opacity: 0.5 }]}
          onPress={handleCreateMpGame}
          disabled={creating}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Create multiplayer dice game"
        >
          <Text style={styles.playButtonText}>
            {creating ? 'Creating…' : 'Create Game'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.playButton,
            { marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
          ]}
          onPress={() => {
            hapticLight();
            void playGameSound('tap');
            setJoinCode('');
            setJoinError(null);
            setMpPhase('join');
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Join multiplayer dice game with code"
        >
          <Text style={[styles.playButtonText, { color: colors.textPrimary }]}>
            Join with Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.comingSoonButton, { opacity: 1 }]}
          onPress={handleBackToModeSelect}
          accessibilityRole="button"
          accessibilityLabel="Back to mode select"
        >
          <Text style={styles.comingSoonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderMpJoin = () => (
    <View style={styles.body}>
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Join Game</Text>
        <Text style={styles.sectionLabel}>Enter the 6-character code</Text>
        <TextInput
          value={joinCode}
          onChangeText={(t) => {
            setJoinError(null);
            setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="______"
          placeholderTextColor={colors.textTertiary}
          style={{
            backgroundColor: colors.background,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            fontSize: 24,
            fontFamily: FONTS.extraBold,
            letterSpacing: 4,
            textAlign: 'center',
            color: colors.textPrimary,
            borderWidth: 2,
            borderColor: joinError ? colors.red : colors.border,
            marginBottom: 12,
          }}
          accessibilityLabel="Game code"
        />
        {joinError && (
          <Text
            style={{
              color: colors.red,
              fontSize: 12,
              fontFamily: FONTS.semiBold,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {joinError}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.playButton, joining && { opacity: 0.5 }]}
          onPress={handleJoinMpGame}
          disabled={joining}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Join game"
        >
          <Text style={styles.playButtonText}>
            {joining ? 'Joining…' : 'Join Game'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.comingSoonButton, { opacity: 1 }]}
          onPress={() => {
            hapticLight();
            void playGameSound('tap');
            setMpPhase('menu');
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.comingSoonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMpLobby = () => {
    if (!mpCode) return null;
    const userUid = getCurrentUser()?.uid ?? '';
    const isHost =
      mpLobbyGame !== null && mpLobbyGame.host.uid === userUid;
    const canStart =
      isHost && mpLobbyGame !== null && mpLobbyGame.playerDetails.length >= 2;
    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Lobby</Text>
          <Text
            style={{
              color: colors.accent,
              fontFamily: FONTS.extraBold,
              fontSize: 36,
              letterSpacing: 6,
              textAlign: 'center',
              marginBottom: 8,
            }}
            accessibilityLabel={`Game code: ${mpCode.split('').join(' ')}`}
          >
            {mpCode}
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 12,
              fontFamily: FONTS.regular,
              textAlign: 'center',
              marginBottom: 14,
            }}
          >
            Share this code. Up to {mpLobbyGame?.playerCount ?? playerCount} players.
          </Text>
          <Text style={styles.sectionLabel}>
            Players ({mpLobbyGame?.playerDetails.length ?? 1}/
            {mpLobbyGame?.playerCount ?? playerCount})
          </Text>
          {(mpLobbyGame?.playerDetails ?? []).map((p, i) => (
            <View
              key={p.uid}
              style={{
                paddingVertical: 8,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 14,
                  fontFamily: FONTS.semiBold,
                }}
              >
                {p.displayName}
                {p.uid === userUid ? ' (you)' : ''}
                {i === 0 ? '  ' : ''}
                {i === 0 && (
                  <Text style={{ color: colors.accent, fontFamily: FONTS.bold, fontSize: 11 }}>
                    HOST
                  </Text>
                )}
              </Text>
            </View>
          ))}
          {isHost ? (
            <TouchableOpacity
              style={[styles.playButton, !canStart && { opacity: 0.5 }, { marginTop: 14 }]}
              onPress={handleStartMpGame}
              disabled={!canStart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start multiplayer game"
            >
              <Text style={styles.playButtonText}>
                {canStart ? 'Start Game' : 'Waiting for 2+ players'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontFamily: FONTS.semiBold,
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              Waiting for host to start…
            </Text>
          )}
          <TouchableOpacity
            style={[styles.comingSoonButton, { opacity: 1, marginTop: 14 }]}
            onPress={handleExitMpGame}
            accessibilityRole="button"
            accessibilityLabel="Leave lobby"
          >
            <Text style={styles.comingSoonText}>← Leave Lobby</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderMiniCards = () => {
    const cards = game.players
      .map((p, i) => ({ player: p, index: i }))
      .filter((entry) => entry.player.type !== 'human');
    if (cards.length === 0) return null;
    return (
      <View style={styles.miniCardsRow}>
        {cards.map(({ player, index }) => {
          const total = calculateTotal(player.scorecard, player.yahtzeeBonusCount);
          const isCurrent = game.currentPlayerIndex === index;
          return (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.miniCard,
                isCurrent && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => {
                hapticLight();
                void playGameSound('tap');
                setOpponentModalIndex(index);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${player.name}, score ${total}`}
            >
              <Text style={styles.miniCardName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.miniCardScore}>{total}</Text>
              <View style={styles.miniCardBadgeRow}>
                {player.stealUsed && (
                  <Text style={styles.miniCardBadge}>USED</Text>
                )}
                {player.stolenFrom && (
                  <Text style={styles.miniCardBadge}>STOLEN</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderScoreRow = (
    player: DicePlayer,
    category: ScoringCategory,
    showPreview: boolean,
  ) => {
    const value = player.scorecard[category];
    const isFilled = value !== null;
    const previewEntry = !isFilled
      ? game.possibleScores.find((p) => p.category === category)
      : undefined;
    const previewValue = previewEntry?.score;
    const tappable =
      !isFilled &&
      showPreview &&
      game.canScore &&
      game.currentPlayerIndex === game.players.indexOf(player);

    const labelStyle = [
      styles.categoryLabel,
      isFilled ? styles.categoryLabelFilled : null,
    ];
    let valueText: string;
    let valueStyle: object;
    if (isFilled) {
      valueText = String(value);
      valueStyle = [
        styles.scoreValue,
        value === 0 ? styles.scoreValueZero : styles.scoreValueFilled,
      ];
    } else if (previewValue !== undefined) {
      valueText = String(previewValue);
      valueStyle = [styles.scoreValue, styles.scoreValuePreview];
    } else {
      valueText = '—';
      valueStyle = [styles.scoreValue, styles.scoreValueZero];
    }
    const accessibilityLabel = isFilled
      ? `${CATEGORY_DISPLAY_NAMES[category]}, scored ${value}`
      : tappable
        ? `${CATEGORY_DISPLAY_NAMES[category]}, would score ${previewValue ?? 0}, tap to fill`
        : `${CATEGORY_DISPLAY_NAMES[category]}, unfilled`;

    const inner = (
      <View style={styles.scoreRow}>
        <Text style={labelStyle}>{CATEGORY_DISPLAY_NAMES[category]}</Text>
        <Text style={valueStyle as object}>{valueText}</Text>
      </View>
    );

    if (!tappable) {
      return (
        <View
          key={category}
          accessible
          accessibilityLabel={accessibilityLabel}
        >
          {inner}
        </View>
      );
    }
    return (
      <TouchableOpacity
        key={category}
        onPress={() => onScorePress(category)}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </TouchableOpacity>
    );
  };

  const renderYourScorecard = () => {
    const human = game.players.find((p) => p.type === 'human');
    if (!human) return null;
    const upperSubtotal = getUpperSubtotal(human.scorecard);
    const bonusEarned = hasUpperBonus(human.scorecard);
    const total = calculateTotal(human.scorecard, human.yahtzeeBonusCount);

    return (
      <View style={styles.yourCard}>
        <Text style={styles.yourCardHeader}>UPPER</Text>
        {UPPER_CATEGORIES.map((cat) => renderScoreRow(human, cat, true))}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalText}>Subtotal</Text>
          <Text style={styles.subtotalText}>{upperSubtotal}</Text>
        </View>
        <View style={styles.subtotalRow}>
          <Text
            style={[
              styles.subtotalText,
              bonusEarned ? styles.bonusEarned : styles.bonusPending,
            ]}
          >
            Bonus
          </Text>
          <Text
            style={[
              styles.subtotalText,
              bonusEarned ? styles.bonusEarned : styles.bonusPending,
            ]}
          >
            {bonusEarned
              ? `+${UPPER_BONUS_VALUE}`
              : `${upperSubtotal}/${UPPER_BONUS_THRESHOLD}`}
          </Text>
        </View>

        <Text style={[styles.yourCardHeader, { marginTop: 10 }]}>LOWER</Text>
        {LOWER_CATEGORIES.map((cat) => renderScoreRow(human, cat, true))}
        {human.yahtzeeBonusCount > 0 && (
          <View style={styles.subtotalRow}>
            <Text style={[styles.subtotalText, styles.bonusEarned]}>
              Yahtzee Bonus ×{human.yahtzeeBonusCount}
            </Text>
            <Text style={[styles.subtotalText, styles.bonusEarned]}>
              +{human.yahtzeeBonusCount * 100}
            </Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      </View>
    );
  };

  const renderDiceTray = () => {
    const dicePlaceholder = game.dice.every((d) => d === 0);
    return (
      <ImageBackground
        source={DICE_BACKGROUND}
        style={styles.diceTray}
        imageStyle={{ borderRadius: 12 }}
        resizeMode="cover"
      >
        <View style={styles.diceRow}>
          {game.dice.map((d, i) => {
            const isHeld = game.held[i];
            return (
              <View key={i} style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.die, isHeld && styles.dieHeld]}
                  onPress={() => onTogglePress(i)}
                  disabled={!game.isCurrentPlayerHuman || game.rollsRemaining === MAX_ROLLS}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Die ${i + 1}, value ${d === 0 ? 'unrolled' : d}, ${isHeld ? 'held' : 'not held'}`}
                  accessibilityState={{ selected: isHeld }}
                >
                  {d === 0 ? (
                    <Text style={styles.diePlaceholder}>?</Text>
                  ) : (
                    <Image
                      source={getDieFace(d, diceTheme)}
                      style={styles.dieImage}
                      resizeMode="contain"
                    />
                  )}
                </TouchableOpacity>
                {isHeld && <Text style={styles.holdLabel}>HOLD</Text>}
              </View>
            );
          })}
        </View>
        {dicePlaceholder && (
          <Text style={styles.rollPrompt}>Roll to start</Text>
        )}
      </ImageBackground>
    );
  };

  const renderRollButton = () => {
    if (!game.isCurrentPlayerHuman) return null;
    const showPickPrompt = game.canScore && !game.canRoll;
    const label = showPickPrompt
      ? 'Pick a category above'
      : `Roll (${game.rollsRemaining} left)`;
    return (
      <TouchableOpacity
        style={[styles.rollButton, !game.canRoll && styles.rollButtonDisabled]}
        onPress={onRollPress}
        disabled={!game.canRoll}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Roll dice, ${game.rollsRemaining} rolls remaining`}
      >
        <Text style={styles.rollButtonText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderCpuStatus = () => {
    if (game.isCurrentPlayerHuman) return null;
    const cp = game.currentPlayer;
    if (!cp) return null;
    return (
      <View style={styles.cpuStatus}>
        <Text style={styles.cpuStatusText}>{cp.name} is thinking…</Text>
      </View>
    );
  };

  const renderStealOverlay = () => {
    if (game.phase !== 'stealWindow') return null;
    const seconds = (game.stealTimeRemaining / 1000).toFixed(1);
    const target = game.stealableTargets[0];
    const victim =
      game.lastScoredPlayerIndex !== null
        ? game.players[game.lastScoredPlayerIndex]
        : null;
    const stealLabel = target
      ? `STEAL ${target.points} from ${victim?.name ?? 'opponent'}`
      : `Can't steal this one`;
    return (
      <View style={styles.stealOverlay}>
        <Text style={styles.stealTitle}>
          {victim ? `${victim.name} scored ${game.lastScoredValue ?? 0}!` : 'Score posted'}
        </Text>
        <Text style={styles.stealTimer}>{seconds}s left</Text>
        <TouchableOpacity
          style={[
            styles.stealButton,
            !game.canHumanSteal && styles.stealButtonDisabled,
          ]}
          onPress={onStealPress}
          disabled={!game.canHumanSteal}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={stealLabel}
        >
          <Text style={styles.stealButtonText}>{stealLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStealFlash = () => {
    if (!game.lastSteal) return null;
    if (game.phase === 'stealWindow') return null;
    const { stealerIndex, victimIndex, category, points } = game.lastSteal;
    const stealer = game.players[stealerIndex];
    const victim = game.players[victimIndex];
    if (!stealer || !victim) return null;
    return (
      <View style={styles.stealFlash}>
        <Text style={styles.stealFlashText}>
          {stealer.name} stole {CATEGORY_DISPLAY_NAMES[category]} ({points}) from{' '}
          {victim.name}!
        </Text>
      </View>
    );
  };

  const renderGameOver = () => {
    const result = game.gameResult;
    if (!result) return null;
    return (
      <View style={styles.gameOverBackdrop}>
        <View style={styles.gameOverCard}>
          <Text style={styles.gameOverTitle}>
            {result.isTie
              ? 'It’s a tie!'
              : game.players[result.winnerIndex]?.type === 'human'
                ? 'You win!'
                : `${game.players[result.winnerIndex]?.name ?? 'Opponent'} wins`}
          </Text>
          {result.rankings.map((r, idx) => {
            const p = game.players[r.playerIndex];
            if (!p) return null;
            return (
              <View key={p.id} style={styles.rankingRow}>
                <Text style={styles.rankingName}>
                  #{idx + 1}  {p.name}
                </Text>
                <Text style={styles.rankingScore}>{r.total}</Text>
              </View>
            );
          })}
          <TouchableOpacity
            style={[styles.playButton, { marginTop: 14 }]}
            onPress={onResetPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Play again"
          >
            <Text style={styles.playButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOpponentModal = () => {
    if (opponentModalIndex === null) return null;
    const p = game.players[opponentModalIndex];
    if (!p) return null;
    const total = calculateTotal(p.scorecard, p.yahtzeeBonusCount);
    const upperSubtotal = getUpperSubtotal(p.scorecard);
    const bonusEarned = hasUpperBonus(p.scorecard);
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setOpponentModalIndex(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{p.name}</Text>
            <ScrollView>
              {ALL_CATEGORIES.map((cat) => {
                const v = p.scorecard[cat];
                return (
                  <View key={cat} style={styles.scoreRow}>
                    <Text style={styles.categoryLabel}>
                      {CATEGORY_DISPLAY_NAMES[cat]}
                    </Text>
                    <Text style={styles.scoreValue}>
                      {v === null ? '—' : v}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalText}>Upper subtotal</Text>
                <Text style={styles.subtotalText}>{upperSubtotal}</Text>
              </View>
              <View style={styles.subtotalRow}>
                <Text
                  style={[
                    styles.subtotalText,
                    bonusEarned ? styles.bonusEarned : styles.bonusPending,
                  ]}
                >
                  Bonus
                </Text>
                <Text
                  style={[
                    styles.subtotalText,
                    bonusEarned ? styles.bonusEarned : styles.bonusPending,
                  ]}
                >
                  {bonusEarned
                    ? `+${UPPER_BONUS_VALUE}`
                    : `${upperSubtotal}/${UPPER_BONUS_THRESHOLD}`}
                </Text>
              </View>
              {p.yahtzeeBonusCount > 0 && (
                <View style={styles.subtotalRow}>
                  <Text style={[styles.subtotalText, styles.bonusEarned]}>
                    Yahtzee Bonus ×{p.yahtzeeBonusCount}
                  </Text>
                  <Text style={[styles.subtotalText, styles.bonusEarned]}>
                    +{p.yahtzeeBonusCount * 100}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{total}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOpponentModalIndex(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close opponent scorecard"
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Body dispatch ──────────────────────────────────────────────────────────

  const renderBody = () => {
    if (diceMode === 'multiplayer') {
      if (mpPhase === 'playing' && mpCode) {
        return (
          <View style={{ flex: 1 }}>
            <MultiplayerDiceGame code={mpCode} onExit={handleExitMpGame} />
          </View>
        );
      }
      if (mpPhase === 'lobby') return renderMpLobby();
      if (mpPhase === 'join') return renderMpJoin();
      return renderMpMenu();
    }
    if (game.phase === 'setup') return renderSetup();
    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 200 + insets.bottom }}
      >
        <Text style={{ color: colors.overlayText, fontSize: 12, fontFamily: FONTS.semiBold, textAlign: 'center', marginTop: 4 }}>
          Round {game.round} / {MAX_ROUNDS}
        </Text>
        {renderMiniCards()}
        {renderYourScorecard()}
        {renderDiceTray()}
        {renderRollButton()}
        {renderCpuStatus()}
      </ScrollView>
    );
  };

  // ── Pro gate: full-screen paywall for non-Pro users. Rendered AFTER all
  // hooks above so a Pro purchase mid-session does not change hook count.
  if (proGateVisible) {
    return (
      <ProGate
        visible={proGateVisible}
        onClose={() => {
          setProGateVisible(false);
          if (!isProUser()) {
            navigation.goBack();
          }
        }}
        isPro={entitlement.isPro}
        loading={entitlement.loading}
        error={entitlement.error}
        productPrice={entitlement.productPrice}
        onPurchase={entitlement.purchase}
        onRestore={entitlement.restore}
      />
    );
  }

  return (
    <ImageBackground source={DICE_BACKGROUND} style={styles.root} resizeMode="cover">
      <View style={styles.overlay}>
        <GameNavButtons topOffset={insets.top + 10} onBack={handleBack} />
        <View style={styles.header}>
          <Text style={styles.title}>That One Dice Game</Text>
        </View>
        <TouchableOpacity
          style={styles.themePill}
          onPress={onThemeTogglePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Dice theme: ${diceTheme}, tap to toggle`}
        >
          <Text style={styles.themePillText}>
            Theme: {diceTheme === 'chrome' ? 'Chrome' : 'Toon'}
          </Text>
        </TouchableOpacity>

        {renderBody()}
        {renderStealOverlay()}
        {renderStealFlash()}
        {game.phase === 'gameOver' && renderGameOver()}
        {renderOpponentModal()}
      </View>
    </ImageBackground>
  );
}
