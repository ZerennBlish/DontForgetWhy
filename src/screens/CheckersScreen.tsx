import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { GameNavButtons } from '../components/GameNavButtons';
import { useCheckers } from '../hooks/useCheckers';
import MultiplayerCheckersGame from '../components/MultiplayerCheckersGame';
import { getCheckerImage } from '../data/checkersAssets';
import { useAppIcon } from '../hooks/useAppIcon';
import { useIconTheme } from '../hooks/useIconTheme';
import { DIFFICULTY_LEVELS, PieceColor } from '../services/checkersAI';
import {
  createGame as mpCreateGame,
  joinGame as mpJoinGame,
  getMyGames as mpGetMyGames,
  type MultiplayerGame,
} from '../services/multiplayer';
import { getCurrentUser } from '../services/firebaseAuth';
import { isProUser } from '../services/proStatus';
import ProGate from '../components/ProGate';
import useEntitlement from '../hooks/useEntitlement';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkers'>;

type CheckersMode = 'cpu' | 'multiplayer' | null;
type MpPhase = 'menu' | 'create' | 'join' | 'playing';

const DIFFICULTY_LABELS = ['Beginner', 'Casual', 'Mid', 'Advanced', 'Expert'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_H_PADDING = 16;
const BOARD_SIZE = SCREEN_WIDTH - BOARD_H_PADDING * 2;
const SQUARE_SIZE = BOARD_SIZE / 8;

// Map visual grid coords to logical board coords based on player orientation.
function logicalCoords(
  row: number,
  col: number,
  playerColor: PieceColor,
): [number, number] {
  if (playerColor === 'b') {
    return [7 - row, 7 - col];
  }
  return [row, col];
}

function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Memoized board square ───────────────────────────────────────
interface CheckerSquareProps {
  logRow: number;
  logCol: number;
  cellPiece: { color: PieceColor; king: boolean } | null;
  isSelected: boolean;
  isValidTarget: boolean;
  isDark: boolean;
  accessibilityLabel: string;
  accentColor: string;
  squareStyle: object;
  pieceImgStyle: object;
  moveDotStyle: object;
  captureRingStyle: object;
  onPress: (logRow: number, logCol: number) => void;
}

const CheckerSquare = React.memo(function CheckerSquare({
  logRow,
  logCol,
  cellPiece,
  isSelected,
  isValidTarget,
  isDark,
  accessibilityLabel,
  accentColor,
  squareStyle,
  pieceImgStyle,
  moveDotStyle,
  captureRingStyle,
  onPress,
}: CheckerSquareProps) {
  const handlePress = useCallback(() => {
    hapticLight();
    onPress(logRow, logCol);
  }, [onPress, logRow, logCol]);

  const bg = isSelected
    ? accentColor + '90'
    : isDark
    ? accentColor + 'CC'
    : accentColor + '60';

  if (!isDark) {
    return (
      <View
        style={[squareStyle, { backgroundColor: bg }]}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <TouchableOpacity
      style={[squareStyle, { backgroundColor: bg }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {cellPiece && (
        <Image
          source={getCheckerImage(cellPiece)}
          style={pieceImgStyle}
          resizeMode="contain"
        />
      )}
      {isValidTarget && !cellPiece && <View style={moveDotStyle} />}
      {isValidTarget && cellPiece && <View style={captureRingStyle} />}
    </TouchableOpacity>
  );
});

export default function CheckersScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const game = useCheckers();
  const entitlement = useEntitlement();

  // Subscribe to icon-theme changes so getCheckerImage (which calls
  // resolveIcon at render time) reflects the current theme on re-render.
  useIconTheme();
  const chevronRightIcon = useAppIcon('ui.chevronRight');

  const [selectedColor, setSelectedColor] = useState<PieceColor>('r');
  const [selectedDifficulty, setSelectedDifficulty] = useState(2);

  // ── Multiplayer phase/state ────────────────────────────────────
  const initialMpCode = route.params?.multiplayerCode ?? null;
  const [checkersMode, setCheckersMode] = useState<CheckersMode>(
    initialMpCode ? 'multiplayer' : null,
  );
  const [mpPhase, setMpPhase] = useState<MpPhase>(
    initialMpCode ? 'playing' : 'menu',
  );
  const [multiplayerCode, setMultiplayerCode] = useState<string | null>(
    initialMpCode,
  );
  const [createColor, setCreateColor] = useState<PieceColor>('r');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeMpGames, setActiveMpGames] = useState<MultiplayerGame[]>([]);
  const [proGateVisible, setProGateVisible] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  const [joiningGame, setJoiningGame] = useState(false);

  const autoSwitchedRef = useRef(false);

  // Intercept hardware back only during CPU active game. Multiplayer state
  // lives in Firestore so closing the screen is safe.
  useEffect(() => {
    if (checkersMode !== 'cpu') return;
    if (!game.board.length || game.isGameOver) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert(
        'Quit game?',
        'Your game progress is saved automatically.',
        [
          { text: 'Keep playing', style: 'cancel' },
          { text: 'Quit', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, game.board.length, game.isGameOver, checkersMode]);

  // Auto-switch to CPU once on first load if there's a saved CPU game.
  useEffect(() => {
    if (autoSwitchedRef.current) return;
    if (game.isLoading) return;
    if (checkersMode !== null) {
      autoSwitchedRef.current = true;
      return;
    }
    autoSwitchedRef.current = true;
    if (game.board.length > 0) setCheckersMode('cpu');
  }, [game.isLoading, game.board.length, checkersMode]);

  const refreshActiveGames = useCallback(() => {
    const user = getCurrentUser();
    if (!user) {
      setActiveMpGames([]);
      return;
    }
    mpGetMyGames(user.uid)
      .then((games) => {
        setActiveMpGames(games.filter((g) => g.type === 'checkers'));
      })
      .catch(() => setActiveMpGames([]));
  }, []);

  useEffect(() => {
    if (checkersMode === 'multiplayer' && mpPhase === 'menu') {
      refreshActiveGames();
    }
  }, [checkersMode, mpPhase, refreshActiveGames]);

  useFocusEffect(
    useCallback(() => {
      if (checkersMode === 'multiplayer' && mpPhase === 'menu') {
        refreshActiveGames();
      }
    }, [checkersMode, mpPhase, refreshActiveGames]),
  );

  // ── Handlers ──────────────────────────────────────────────────
  const handleSquarePress = useCallback((logRow: number, logCol: number) => {
    game.selectSquare(logRow, logCol);
  }, [game]);

  const handleResignPress = () => {
    Alert.alert('Resign?', 'Are you sure you want to resign this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: () => {
          hapticLight();
          game.resign();
        },
      },
    ]);
  };

  const handlePickMpMode = useCallback(() => {
    if (!isProUser()) {
      setProGateVisible(true);
      return;
    }
    if (!getCurrentUser()) {
      Alert.alert(
        'Sign in required',
        'Sign in with Google to play multiplayer checkers.',
      );
      return;
    }
    hapticLight();
    playGameSound('tap');
    setCheckersMode('multiplayer');
    setMpPhase('menu');
  }, []);

  const handlePickCpuMode = useCallback(() => {
    hapticLight();
    playGameSound('tap');
    setCheckersMode('cpu');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setMultiplayerCode(null);
    setMpPhase('menu');
    setJoinCode('');
    setJoinError(null);
    refreshActiveGames();
  }, [refreshActiveGames]);

  const handleBackToModeSelect = useCallback(() => {
    hapticLight();
    playGameSound('tap');
    setCheckersMode(null);
    setMpPhase('menu');
    setMultiplayerCode(null);
    setJoinCode('');
    setJoinError(null);
  }, []);

  const handleCreateMpGame = useCallback(async () => {
    if (creatingGame) return;
    setCreatingGame(true);
    try {
      // Firestore hostColor uses 'w'/'b' shared across game types.
      // Red (moves first) maps to 'w'.
      const hostColor: 'w' | 'b' = createColor === 'r' ? 'w' : 'b';
      const { code } = await mpCreateGame('checkers', hostColor);
      setMultiplayerCode(code);
      setMpPhase('playing');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create game';
      Alert.alert('Could not create game', msg);
    } finally {
      setCreatingGame(false);
    }
  }, [createColor, creatingGame]);

  const handleJoinMpGame = useCallback(async () => {
    if (joiningGame) return;
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length !== 6) {
      setJoinError('Enter the full 6-character code.');
      return;
    }
    setJoinError(null);
    setJoiningGame(true);
    try {
      await mpJoinGame(normalized, 'checkers');
      setMultiplayerCode(normalized);
      setMpPhase('playing');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join';
      setJoinError(msg);
    } finally {
      setJoiningGame(false);
    }
  }, [joinCode, joiningGame]);

  const handleSelectActiveGame = useCallback((g: MultiplayerGame) => {
    hapticLight();
    playGameSound('tap');
    setMultiplayerCode(g.code);
    setMpPhase('playing');
  }, []);

  const gameOverTitle = (): string => {
    if (game.gameResult === 'resigned') return 'You Resigned';
    if (game.winner === game.playerColor) return 'You Won!';
    return 'You Lost';
  };
  const gameOverSubtitle = (): string => {
    if (game.gameResult === 'resigned') return 'Better luck next time';
    if (game.winner === game.playerColor) return 'Well played!';
    return 'Better luck next time';
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 4,
        },
        title: { fontSize: 28, color: colors.overlayText, fontFamily: FONTS.gameHeader },
        body: { flex: 1, paddingHorizontal: BOARD_H_PADDING },
        centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        loadingText: { color: colors.overlayText, fontSize: 14, fontFamily: FONTS.regular },

        // Pre-game modal
        preGameCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 24,
        },
        preGameTitle: {
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
        colorRow: {
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20,
        },
        colorButton: {
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        colorButtonSelected: {
          borderColor: colors.accent,
        },
        colorPieceImg: { width: 60, height: 60, marginBottom: 6 },
        colorLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: colors.textSecondary },
        pillsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
        },
        pill: {
          borderRadius: 16,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: 'transparent',
          backgroundColor: colors.background,
        },
        pillActive: {
          backgroundColor: colors.accent + '30',
          borderColor: colors.accent,
        },
        pillText: { fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary },
        pillTextActive: { color: colors.accent, fontFamily: FONTS.semiBold },
        playButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        playButtonText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 15 },

        // Active game
        gameHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
        },
        gameHeaderText: { color: colors.overlayText, fontSize: 13, fontFamily: FONTS.regular },
        pieceCountRow: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 22,
          gap: 6,
          marginVertical: 4,
          paddingHorizontal: 4,
        },
        pieceCountImg: { width: 18, height: 18 },
        pieceCountText: { color: colors.overlayText, fontSize: 12, fontFamily: FONTS.semiBold },
        pieceCountSep: { color: colors.overlayText, fontSize: 13, opacity: 0.4, marginHorizontal: 4 },

        // Board
        boardWrap: {
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          alignSelf: 'center',
          marginTop: 8,
        },
        boardRow: { flexDirection: 'row' },
        square: {
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pieceImg: { width: SQUARE_SIZE - 4, height: SQUARE_SIZE - 4 },
        moveDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.accent + '80',
        },
        captureRing: {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          borderWidth: 2,
          borderColor: colors.accent,
        },

        // Action bar
        actionBar: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 12,
        },
        resignPill: {
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 8,
          backgroundColor: colors.red + '30',
        },
        resignText: { color: colors.red, fontSize: 12, fontFamily: FONTS.semiBold },

        // Game over overlay
        overlayBackdrop: {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        overlayCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          alignItems: 'center',
        },
        overlayTitle: {
          fontSize: 22,
          fontFamily: FONTS.extraBold,
          color: colors.textPrimary,
          marginBottom: 6,
        },
        overlaySubtitle: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          opacity: 0.8,
          marginBottom: 18,
        },

        // Mode select
        modeCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 16,
          borderLeftWidth: 3,
          borderLeftColor: colors.sectionGames,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        modeCardIcon: { width: 40, height: 40 },
        modeCardBody: { flex: 1 },
        modeCardTitle: {
          fontSize: 18,
          fontFamily: FONTS.gameHeader,
          color: colors.textPrimary,
        },
        modeCardSubtitle: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          marginTop: 4,
        },
        modeCardBadge: {
          marginTop: 6,
          fontSize: 11,
          fontFamily: FONTS.bold,
          color: colors.accent,
        },

        // MP menu
        mpMenuButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 12,
        },
        mpMenuButtonSecondary: {
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        mpMenuButtonText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
        mpMenuButtonSecondaryText: {
          color: colors.textPrimary,
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
        activeGamesHeader: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.overlayText + 'CC',
          marginTop: 20,
          marginBottom: 8,
          letterSpacing: 0.5,
        },
        activeGameRow: {
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        activeGameOpponent: {
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        activeGameMeta: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          marginTop: 2,
        },
        colorDot: {
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        emptyText: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          textAlign: 'center',
          marginVertical: 12,
          fontStyle: 'italic',
        },

        createCodeLabel: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
          marginBottom: 10,
        },
        joinInput: {
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
          borderColor: colors.border,
        },
        joinInputError: { borderColor: colors.red },
        joinErrorText: {
          color: colors.red,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
          marginTop: 8,
        },
        backPill: {
          alignSelf: 'center',
          marginTop: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: colors.background,
        },
        backPillText: {
          color: colors.textPrimary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
        },
      }),
    [colors, insets.top],
  );

  // ── Mode select ────────────────────────────────────────────────
  const renderModeSelect = () => {
    const mpCount = activeMpGames.length;
    return (
      <View style={styles.body}>
        <TouchableOpacity
          style={styles.modeCard}
          onPress={handlePickCpuMode}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Play against CPU"
        >
          <Image
            source={require('../../assets/icons/icon-checkers.webp')}
            style={styles.modeCardIcon}
            resizeMode="contain"
          />
          <View style={styles.modeCardBody}>
            <Text style={styles.modeCardTitle}>vs CPU</Text>
            <Text style={styles.modeCardSubtitle}>Play against AI — 5 difficulties</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modeCard}
          onPress={handlePickMpMode}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Play against another player"
        >
          <Image
            source={getCheckerImage({ color: 'r', king: true })}
            style={styles.modeCardIcon}
            resizeMode="contain"
          />
          <View style={styles.modeCardBody}>
            <Text style={styles.modeCardTitle}>vs Player</Text>
            <Text style={styles.modeCardSubtitle}>Play a friend with a shared code</Text>
            {mpCount > 0 && (
              <Text style={styles.modeCardBadge}>
                {mpCount} active game{mpCount === 1 ? '' : 's'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Multiplayer menu ───────────────────────────────────────────
  const renderMultiplayerMenu = () => {
    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <TouchableOpacity
          style={[styles.mpMenuButton, { marginTop: 16 }]}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            setMpPhase('create');
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Create a new game"
        >
          <Text style={styles.mpMenuButtonText}>Create Game</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mpMenuButtonSecondary}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            setJoinCode('');
            setJoinError(null);
            setMpPhase('join');
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Join a game by code"
        >
          <Text style={styles.mpMenuButtonSecondaryText}>Join with Code</Text>
        </TouchableOpacity>

        <Text style={styles.activeGamesHeader}>ACTIVE GAMES</Text>
        {activeMpGames.length === 0 ? (
          <Text style={styles.emptyText}>No active games.</Text>
        ) : (
          activeMpGames.map((g) => {
            const myUid = getCurrentUser()?.uid ?? '';
            const amHost = g.host.uid === myUid;
            // hostColor 'w' → red, 'b' → black
            const myHostColor: PieceColor = g.hostColor === 'w' ? 'r' : 'b';
            const myColor: PieceColor = amHost
              ? myHostColor
              : myHostColor === 'r' ? 'b' : 'r';
            const opponent = amHost ? g.guest : g.host;
            const opponentName = opponent?.displayName ?? null;
            const waiting = g.status === 'waiting';
            const myTurn = g.turn === myUid;
            const status = waiting
              ? 'Waiting for opponent'
              : myTurn
                ? 'Your turn'
                : `${opponentName ?? 'Opponent'}'s turn`;
            return (
              <TouchableOpacity
                key={g.code}
                style={styles.activeGameRow}
                onPress={() => handleSelectActiveGame(g)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Resume game ${g.code}`}
              >
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: myColor === 'r' ? '#DC2626' : '#222222' },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeGameOpponent}>
                    {waiting ? 'Code ' + g.code : (opponentName ?? 'Opponent')}
                  </Text>
                  <Text style={styles.activeGameMeta}>
                    {status} · {relativeTime(g.lastMoveAt)}
                  </Text>
                </View>
                <Image
                  source={chevronRightIcon}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.backPill}
          onPress={handleBackToModeSelect}
          accessibilityRole="button"
          accessibilityLabel="Back to mode select"
        >
          <Text style={styles.backPillText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── Create game ────────────────────────────────────────────────
  const renderCreateGame = () => {
    return (
      <View style={styles.body}>
        <View style={styles.preGameCard}>
          <Text style={styles.preGameTitle}>Create Game</Text>
          <Text style={styles.sectionLabel}>Your Color</Text>
          <View style={styles.colorRow}>
            <TouchableOpacity
              style={[
                styles.colorButton,
                createColor === 'r' && styles.colorButtonSelected,
              ]}
              onPress={() => { hapticLight(); playGameSound('tap'); setCreateColor('r'); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Play as red (moves first)"
            >
              <Image
                source={getCheckerImage({ color: 'r', king: false })}
                style={styles.colorPieceImg}
                resizeMode="contain"
              />
              <Text style={styles.colorLabel}>Red</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.colorButton,
                createColor === 'b' && styles.colorButtonSelected,
              ]}
              onPress={() => { hapticLight(); playGameSound('tap'); setCreateColor('b'); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Play as black"
            >
              <Image
                source={getCheckerImage({ color: 'b', king: false })}
                style={styles.colorPieceImg}
                resizeMode="contain"
              />
              <Text style={styles.colorLabel}>Black</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.playButton, creatingGame && { opacity: 0.5 }]}
            onPress={handleCreateMpGame}
            disabled={creatingGame}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create game"
          >
            <Text style={styles.playButtonText}>
              {creatingGame ? 'Creating…' : 'Create Game'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.backPill}
          onPress={() => { hapticLight(); playGameSound('tap'); setMpPhase('menu'); }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backPillText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Join game ──────────────────────────────────────────────────
  const renderJoinGame = () => {
    return (
      <View style={styles.body}>
        <View style={styles.preGameCard}>
          <Text style={styles.preGameTitle}>Join Game</Text>
          <Text style={styles.createCodeLabel}>Enter the 6-character code</Text>
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
            style={[styles.joinInput, joinError ? styles.joinInputError : null]}
            accessibilityLabel="Game code"
          />
          {joinError && <Text style={styles.joinErrorText}>{joinError}</Text>}
          <TouchableOpacity
            style={[styles.playButton, { marginTop: 20 }, joiningGame && { opacity: 0.5 }]}
            onPress={handleJoinMpGame}
            disabled={joiningGame}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Join game"
          >
            <Text style={styles.playButtonText}>
              {joiningGame ? 'Joining…' : 'Join Game'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.backPill}
          onPress={() => { hapticLight(); playGameSound('tap'); setMpPhase('menu'); }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backPillText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Pre-game modal (CPU) ───────────────────────────────────────
  const renderPreGame = () => (
    <View style={styles.body}>
      <View style={styles.preGameCard}>
        <Text style={styles.preGameTitle}>New Game</Text>

        <Text style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorRow}>
          <TouchableOpacity
            style={[
              styles.colorButton,
              selectedColor === 'r' && styles.colorButtonSelected,
            ]}
            onPress={() => { hapticLight(); playGameSound('tap'); setSelectedColor('r'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Play as red (moves first)"
            accessibilityState={{ selected: selectedColor === 'r' }}
          >
            <Image
              source={getCheckerImage({ color: 'r', king: false })}
              style={styles.colorPieceImg}
              resizeMode="contain"
            />
            <Text style={styles.colorLabel}>Red</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.colorButton,
              selectedColor === 'b' && styles.colorButtonSelected,
            ]}
            onPress={() => { hapticLight(); playGameSound('tap'); setSelectedColor('b'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Play as black"
            accessibilityState={{ selected: selectedColor === 'b' }}
          >
            <Image
              source={getCheckerImage({ color: 'b', king: false })}
              style={styles.colorPieceImg}
              resizeMode="contain"
            />
            <Text style={styles.colorLabel}>Black</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Difficulty</Text>
        <View style={styles.pillsRow}>
          {DIFFICULTY_LEVELS.map((_, idx) => {
            const active = selectedDifficulty === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => { hapticLight(); playGameSound('tap'); setSelectedDifficulty(idx); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={DIFFICULTY_LABELS[idx]}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {DIFFICULTY_LABELS[idx]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            game.startGame(selectedColor, selectedDifficulty);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Play"
        >
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backPill, { marginTop: 14 }]}
          onPress={handleBackToModeSelect}
          accessibilityRole="button"
          accessibilityLabel="Change mode"
        >
          <Text style={styles.backPillText}>← Change Mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Piece count bar ────────────────────────────────────────────
  const renderPieceCount = (color: PieceColor) => {
    const count = color === 'r' ? game.redCount : game.blackCount;
    const kings = color === 'r' ? game.redKings : game.blackKings;
    const regulars = count - kings;
    return (
      <View style={styles.pieceCountRow} accessibilityLiveRegion="polite">
        <Image
          source={getCheckerImage({ color, king: false })}
          style={styles.pieceCountImg}
          resizeMode="contain"
        />
        <Text style={styles.pieceCountText}>{regulars}</Text>
        {kings > 0 && (
          <>
            <Text style={styles.pieceCountSep}>|</Text>
            <Image
              source={getCheckerImage({ color, king: true })}
              style={styles.pieceCountImg}
              resizeMode="contain"
            />
            <Text style={styles.pieceCountText}>{kings}</Text>
          </>
        )}
      </View>
    );
  };

  // ── Board (CPU) ────────────────────────────────────────────────
  const renderBoard = () => {
    const { board, selectedSquare, validMoveTargets, playerColor } = game;
    return (
      <View style={styles.boardWrap}>
        {board.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.boardRow}>
            {row.map((cell, colIdx) => {
              const dark = isDarkSquare(rowIdx, colIdx);
              const [logRow, logCol] = logicalCoords(rowIdx, colIdx, playerColor);
              const isSelected =
                selectedSquare !== null &&
                selectedSquare[0] === logRow &&
                selectedSquare[1] === logCol;
              const isValidTarget = validMoveTargets.some(
                ([r, c]) => r === logRow && c === logCol,
              );
              const pieceName = cell
                ? `${cell.color === 'r' ? 'red' : 'black'} ${cell.king ? 'king' : 'piece'}`
                : 'empty';
              const label = dark
                ? `row ${logRow}, column ${logCol}, ${pieceName}`
                : `row ${logRow}, column ${logCol}, empty`;
              return (
                <CheckerSquare
                  key={colIdx}
                  logRow={logRow}
                  logCol={logCol}
                  cellPiece={cell}
                  isSelected={isSelected}
                  isValidTarget={isValidTarget}
                  isDark={dark}
                  accessibilityLabel={label}
                  accentColor={colors.accent}
                  squareStyle={styles.square}
                  pieceImgStyle={styles.pieceImg}
                  moveDotStyle={styles.moveDot}
                  captureRingStyle={styles.captureRing}
                  onPress={handleSquarePress}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // ── Active game (CPU) ──────────────────────────────────────────
  const renderActiveGame = () => {
    const opponentColor: PieceColor = game.playerColor === 'r' ? 'b' : 'r';
    const diffName = DIFFICULTY_LABELS[game.difficulty] ?? '';

    return (
      <View style={styles.body}>
        <View style={styles.gameHeader} accessibilityLiveRegion="polite">
          <Text style={styles.gameHeaderText}>{diffName}</Text>
          <Text style={styles.gameHeaderText}>Move {game.moveCount}</Text>
        </View>
        <View
          accessibilityLiveRegion="polite"
          style={{
            height: 24,
            marginHorizontal: 16,
            marginBottom: 4,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {game.isAIThinking && (
            <Text
              style={{ color: '#FFFFFF', fontSize: 12, fontFamily: FONTS.semiBold }}
            >
              Thinking…
            </Text>
          )}
        </View>
        {renderPieceCount(opponentColor)}
        {renderBoard()}
        {renderPieceCount(game.playerColor)}

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.resignPill}
            onPress={() => {
              hapticLight();
              playGameSound('tap');
              handleResignPress();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Resign"
          >
            <Text style={styles.resignText}>Resign</Text>
          </TouchableOpacity>
        </View>

        {game.isGameOver && (
          <View style={styles.overlayBackdrop}>
            <View style={styles.overlayCard}>
              <Text style={styles.overlayTitle}>{gameOverTitle()}</Text>
              <Text style={styles.overlaySubtitle}>{gameOverSubtitle()}</Text>
              <TouchableOpacity
                style={[styles.playButton, { alignSelf: 'stretch' }]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  game.newGame();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="New game"
              >
                <Text style={styles.playButtonText}>New Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Body dispatch ──────────────────────────────────────────────
  const renderBody = () => {
    if (game.isLoading && !multiplayerCode) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      );
    }
    if (checkersMode === 'multiplayer' && mpPhase === 'playing' && multiplayerCode) {
      return (
        <MultiplayerCheckersGame
          code={multiplayerCode}
          onExit={handleBackToMenu}
        />
      );
    }
    if (checkersMode === 'multiplayer' && mpPhase === 'menu') return renderMultiplayerMenu();
    if (checkersMode === 'multiplayer' && mpPhase === 'create') return renderCreateGame();
    if (checkersMode === 'multiplayer' && mpPhase === 'join') return renderJoinGame();
    if (checkersMode === null) return renderModeSelect();
    // checkersMode === 'cpu'
    if (game.board.length === 0) return renderPreGame();
    return renderActiveGame();
  };

  return (
    <ImageBackground
      source={require('../../assets/checkers/checkers-bg.webp')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <GameNavButtons topOffset={insets.top + 10} />
        <View style={styles.header}>
          <Image source={require('../../assets/icons/icon-checkers.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
        </View>
        <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Checkers</Text>
        {renderBody()}
      </View>
      {proGateVisible && (
        <ProGate
          visible={proGateVisible}
          onClose={() => setProGateVisible(false)}
          game="checkers"
          isPro={entitlement.isPro}
          loading={entitlement.loading}
          error={entitlement.error}
          productPrice={entitlement.productPrice}
          onPurchase={entitlement.purchase}
          onRestore={entitlement.restore}
        />
      )}
    </ImageBackground>
  );
}
