import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import type { Chess } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { GameNavButtons } from '../components/GameNavButtons';
import { useChess } from '../hooks/useChess';
import { getPieceImage } from '../data/chessAssets';
import APP_ICONS from '../data/appIconAssets';
import { DIFFICULTY_LEVELS } from '../services/chessAI';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chess'>;

const DIFFICULTY_LABELS = ['Easy', 'Intermediate', 'Hard', 'Expert', 'Master'];
const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
// ── Helpers: visual grid → chess square & labels ────────────────
function squareForCell(
  row: number,
  col: number,
  playerColor: 'w' | 'b',
): string {
  if (playerColor === 'b') {
    return `${'hgfedcba'[col]}${row + 1}`;
  }
  return `${'abcdefgh'[col]}${8 - row}`;
}
function rankLabel(row: number, playerColor: 'w' | 'b'): string {
  return playerColor === 'b' ? String(row + 1) : String(8 - row);
}
function fileLabel(col: number, playerColor: 'w' | 'b'): string {
  return playerColor === 'b' ? 'hgfedcba'[col] : 'abcdefgh'[col];
}
function isLightSquare(row: number, col: number): boolean {
  // Even parity = light square, holds for both orientations
  // (180° rotation preserves (row+col) parity).
  return (row + col) % 2 === 0;
}

// Return the list of piece types of `color` that were captured during the
// game (i.e. captured BY the opponent). Derived from chess.js verbose
// history so promotions don't wrongly flag the original pawn as captured.
function getCapturedPieces(game: Chess, color: 'w' | 'b'): string[] {
  const history = game.history({ verbose: true });
  const captured: string[] = [];
  for (const move of history) {
    if (move.captured && move.color !== color) {
      captured.push(move.captured);
    }
  }
  return captured;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_H_PADDING = 16;
const BOARD_BORDER = 2;
const BOARD_SIZE = SCREEN_WIDTH - BOARD_H_PADDING * 2;
const INNER_BOARD = BOARD_SIZE - BOARD_BORDER * 2;
const SQUARE_SIZE = INNER_BOARD / 8;

// ── Memoized board square ───────────────────────────────────────
// Each square is its own React.memo'd component so a re-render of
// ChessScreen (e.g. from the turnPulse animation, AI thinking flag,
// or roast toast) doesn't re-render all 64 squares. Square props are
// primitives or stable references; React.memo skips squares whose
// state didn't actually change.
interface ChessSquareProps {
  square: string;
  cellPiece: { type: string; color: 'w' | 'b' } | null;
  isSelected: boolean;
  isValidMove: boolean;
  isLight: boolean;
  isKingInCheck: boolean;
  isLastMoveSquare: boolean;
  isThreatened: boolean;
  showRankLabel: boolean;
  showFileLabel: boolean;
  rankLabelText: string;
  fileLabelText: string;
  accessibilityLabel: string;
  accentColor: string;
  squareStyle: object;
  rankLabelStyle: object;
  fileLabelStyle: object;
  pieceImgStyle: object;
  moveDotStyle: object;
  captureRingStyle: object;
  onPress: (square: string) => void;
}

const ChessSquare = React.memo(function ChessSquare({
  square,
  cellPiece,
  isSelected,
  isValidMove,
  isLight,
  isKingInCheck,
  isLastMoveSquare,
  isThreatened,
  showRankLabel,
  showFileLabel,
  rankLabelText,
  fileLabelText,
  accessibilityLabel,
  accentColor,
  squareStyle,
  rankLabelStyle,
  fileLabelStyle,
  pieceImgStyle,
  moveDotStyle,
  captureRingStyle,
  onPress,
}: ChessSquareProps) {
  const handlePress = useCallback(() => {
    hapticLight();
    onPress(square);
  }, [onPress, square]);

  let bg: string;
  if (isSelected) {
    bg = accentColor + '90';
  } else if (isKingInCheck) {
    bg = 'rgba(220, 38, 38, 0.6)';
  } else if (isThreatened) {
    bg = 'rgba(220, 38, 38, 0.35)';
  } else if (isLastMoveSquare) {
    bg = 'rgba(250, 204, 21, 0.4)';
  } else {
    bg = isLight ? accentColor + '60' : accentColor + 'CC';
  }

  return (
    <TouchableOpacity
      style={[squareStyle, { backgroundColor: bg }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {showRankLabel && <Text style={rankLabelStyle}>{rankLabelText}</Text>}
      {showFileLabel && <Text style={fileLabelStyle}>{fileLabelText}</Text>}
      {cellPiece && (
        <Image
          source={getPieceImage(cellPiece)}
          style={pieceImgStyle}
          resizeMode="contain"
        />
      )}
      {isValidMove && !cellPiece && <View style={moveDotStyle} />}
      {isValidMove && cellPiece && <View style={captureRingStyle} />}
    </TouchableOpacity>
  );
});

export default function ChessScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const chess = useChess();

  const [selectedColor, setSelectedColor] = useState<'w' | 'b'>('w');
  const [selectedDifficulty, setSelectedDifficulty] = useState(2);
  const [teachingEnabled, setTeachingEnabled] = useState(true);

  const roastFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(roastFade, {
      toValue: chess.currentRoast ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [chess.currentRoast, roastFade]);

  // ── Pulsing animation for "Your Move" / "CHECK!" ──
  const turnPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (chess.isPlayerTurn) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(turnPulse, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(turnPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      turnPulse.setValue(1);
    }
  }, [chess.isPlayerTurn, turnPulse]);

  // Intercept hardware back during active game
  useEffect(() => {
    if (!chess.game || chess.isGameOver) return;
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
  }, [navigation, chess.game, chess.isGameOver]);

  const severityBg: Record<string, string> = useMemo(
    () => ({
      good: colors.accent + '30',
      inaccuracy: '#F59E0B' + '30',
      mistake: '#F97316' + '30',
      blunder: '#EF4444' + '30',
      catastrophe: '#DC2626' + '50',
      takeBack: colors.accent + '30',
    }),
    [colors.accent],
  );

  // Stable square-press handler. Each ChessSquare wraps this in its own
  // useCallback so a re-render of ChessScreen doesn't churn the onPress
  // identity for all 64 squares.
  const handleSquarePress = useCallback((sq: string) => {
    chess.selectSquare(sq);
  }, [chess]);

  const handleResignPress = () => {
    Alert.alert('Resign?', 'Are you sure you want to resign this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: () => {
          hapticLight();
          chess.resign();
        },
      },
    ]);
  };

  const gameOverTitle = (): string => {
    switch (chess.gameResult) {
      case 'checkmate': return 'Checkmate!';
      case 'stalemate': return 'Stalemate';
      case 'draw': return 'Draw';
      case 'resigned': return 'You Resigned';
      default: return 'Game Over';
    }
  };
  const gameOverSubtitle = (): string => {
    if (chess.gameResult === 'stalemate' || chess.gameResult === 'draw') {
      return "It's a draw";
    }
    if (chess.gameResult === 'resigned') return 'You lost';
    if (chess.gameResult === 'checkmate') {
      return chess.winner === chess.playerColor ? 'You won!' : 'You lost';
    }
    return '';
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
        capturesRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          minHeight: 22,
          gap: 2,
          marginVertical: 4,
        },
        capturedPiece: { width: 18, height: 18 },

        // Board
        boardWrap: {
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          alignSelf: 'center',
          marginTop: 8,
          borderWidth: BOARD_BORDER,
          borderColor: 'transparent',
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
        rankLabel: {
          position: 'absolute',
          top: 1, left: 2,
          fontSize: 9,
          color: colors.overlayText + '60',
        },
        fileLabel: {
          position: 'absolute',
          bottom: 1, right: 2,
          fontSize: 9,
          color: colors.overlayText + '60',
        },

        // Action bar
        actionBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
        },
        actionPill: {
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 8,
          backgroundColor: colors.background,
        },
        actionPillText: { fontSize: 12, fontFamily: FONTS.semiBold, color: colors.textPrimary },
        resignPill: { backgroundColor: colors.red + '30' },
        resignText: { color: colors.red, fontSize: 12, fontFamily: FONTS.semiBold },

        // Roast toast
        roastToast: {
          position: 'absolute',
          left: 20, right: 20,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        roastText: {
          color: colors.overlayText,
          fontSize: 12,
          fontFamily: FONTS.regular,
          textAlign: 'center',
        },

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

        // Review mode
        reviewNav: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
          gap: 8,
        },
        reviewBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
        reviewCounter: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          marginHorizontal: 8,
          minWidth: 100,
          textAlign: 'center',
        },
      }),
    [colors, insets.top],
  );

  // ── Pre-game modal ─────────────────────────────────────────────
  const renderPreGame = () => (
    <View style={styles.body}>
      <View style={styles.preGameCard}>
        <Text style={styles.preGameTitle}>New Game</Text>

        <Text style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorRow}>
          <TouchableOpacity
            style={[
              styles.colorButton,
              selectedColor === 'w' && styles.colorButtonSelected,
            ]}
            onPress={() => { hapticLight(); playGameSound('tap'); setSelectedColor('w'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Play as white"
            accessibilityState={{ selected: selectedColor === 'w' }}
          >
            <Image
              source={getPieceImage({ type: 'k', color: 'w' })}
              style={styles.colorPieceImg}
              resizeMode="contain"
            />
            <Text style={styles.colorLabel}>White</Text>
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
              source={getPieceImage({ type: 'k', color: 'b' })}
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
                accessibilityRole="tab"
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

        {selectedDifficulty <= 2 && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: teachingEnabled ? colors.accent + '20' : colors.background,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: teachingEnabled ? colors.accent : 'transparent',
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 20,
            }}
            onPress={() => {
              hapticLight();
              playGameSound('tap');
              setTeachingEnabled(!teachingEnabled);
            }}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityLabel="Training mode"
            accessibilityState={{ checked: teachingEnabled }}
          >
            <Text style={{ color: teachingEnabled ? colors.accent : colors.textSecondary, fontSize: 13, fontFamily: FONTS.semiBold }}>
              Training Mode
            </Text>
            <View
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: teachingEnabled ? colors.accent : colors.background,
                borderWidth: 1,
                borderColor: teachingEnabled ? colors.accent : colors.border,
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.overlayText,
                  alignSelf: teachingEnabled ? 'flex-end' : 'flex-start',
                }}
              />
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            chess.startGame(selectedColor, selectedDifficulty);
            chess.setTeachingMode(teachingEnabled && selectedDifficulty <= 2);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Play"
        >
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Board renderer (interactive, active game) ─────────────────
  const renderBoard = () => {
    const { board, selectedSquare, validMoves, playerColor } = chess;
    return (
      <View style={[
        styles.boardWrap,
        chess.isInCheck && { borderColor: '#EF4444' },
        !chess.isInCheck && chess.isPlayerTurn && { borderColor: colors.accent },
      ]}>
        {board.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.boardRow}>
            {row.map((cell, colIdx) => {
              const sq = squareForCell(rowIdx, colIdx, playerColor);
              const isSelected = selectedSquare === sq;
              const isValidMove = validMoves.includes(sq);
              const isLight = isLightSquare(rowIdx, colIdx);
              const isKingInCheck = !!(
                chess.isInCheck &&
                cell &&
                cell.type === 'k' &&
                cell.color === chess.game?.turn()
              );
              const isLastMoveSquare = !!(
                chess.teachingMode &&
                chess.lastMoveSquares &&
                (sq === chess.lastMoveSquares.from || sq === chess.lastMoveSquares.to)
              );
              const isThreatened = !!(
                chess.teachingMode &&
                chess.threatenedSquares.has(sq)
              );
              let label = cell
                ? `${sq}, ${cell.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[cell.type] || cell.type}`
                : `${sq}, empty`;
              if (isThreatened && cell) label += ', threatened';
              if (isLastMoveSquare) label += ', last move';
              return (
                <ChessSquare
                  key={colIdx}
                  square={sq}
                  cellPiece={cell}
                  isSelected={isSelected}
                  isValidMove={isValidMove}
                  isLight={isLight}
                  isKingInCheck={isKingInCheck}
                  isLastMoveSquare={isLastMoveSquare}
                  isThreatened={isThreatened}
                  showRankLabel={colIdx === 0}
                  showFileLabel={rowIdx === 7}
                  rankLabelText={rankLabel(rowIdx, playerColor)}
                  fileLabelText={fileLabel(colIdx, playerColor)}
                  accessibilityLabel={label}
                  accentColor={colors.accent}
                  squareStyle={styles.square}
                  rankLabelStyle={styles.rankLabel}
                  fileLabelStyle={styles.fileLabel}
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

  // ── Board renderer (non-interactive, review mode) ─────────────
  const renderReviewBoard = () => {
    const { reviewBoard, playerColor } = chess;
    return (
      <View style={styles.boardWrap}>
        {reviewBoard.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.boardRow}>
            {row.map((cell, colIdx) => {
              const sq = squareForCell(rowIdx, colIdx, playerColor);
              const isLight = isLightSquare(rowIdx, colIdx);
              const bg = isLight ? colors.accent + '60' : colors.accent + 'CC';
              const showRankLabel = colIdx === 0;
              const showFileLabel = rowIdx === 7;
              const label = cell
                ? `${sq}, ${cell.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[cell.type] || cell.type}`
                : `${sq}, empty`;
              return (
                <View
                  key={colIdx}
                  style={[styles.square, { backgroundColor: bg }]}
                  accessible={true}
                  accessibilityLabel={label}
                >
                  {showRankLabel && (
                    <Text style={styles.rankLabel}>
                      {rankLabel(rowIdx, playerColor)}
                    </Text>
                  )}
                  {showFileLabel && (
                    <Text style={styles.fileLabel}>
                      {fileLabel(colIdx, playerColor)}
                    </Text>
                  )}
                  {cell && (
                    <Image
                      source={getPieceImage(cell)}
                      style={styles.pieceImg}
                      resizeMode="contain"
                    />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderCaptured = (pieces: string[], color: 'w' | 'b') => (
    <View style={styles.capturesRow}>
      {pieces.map((type, i) => (
        <Image
          key={i}
          source={getPieceImage({ type, color })}
          style={styles.capturedPiece}
          resizeMode="contain"
        />
      ))}
    </View>
  );

  // Captured pieces only change when a move that captures lands. Recompute
  // on move-history length change instead of on every animation tick.
  const playerCapturedPieces = useMemo(() => {
    if (!chess.game) return [];
    const opp: 'w' | 'b' = chess.playerColor === 'w' ? 'b' : 'w';
    return getCapturedPieces(chess.game, opp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.game, chess.moveHistory.length, chess.playerColor]);

  const opponentCapturedPieces = useMemo(() => {
    if (!chess.game) return [];
    return getCapturedPieces(chess.game, chess.playerColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess.game, chess.moveHistory.length, chess.playerColor]);

  // ── Active game ────────────────────────────────────────────────
  const renderActiveGame = () => {
    const opponentColor: 'w' | 'b' = chess.playerColor === 'w' ? 'b' : 'w';
    const moveNum = Math.max(1, Math.ceil(chess.moveHistory.length / 2));
    const diffName = DIFFICULTY_LABELS[chess.difficulty] ?? '';

    return (
      <View style={styles.body}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameHeaderText}>{diffName}</Text>
          <Text style={styles.gameHeaderText} accessibilityLiveRegion="polite">Move {moveNum}</Text>
        </View>
        <View
          accessibilityLiveRegion="polite"
          style={{
            height: 28,
            marginHorizontal: 16,
            marginBottom: 4,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {chess.isGameOver && chess.gameResult === 'checkmate' ? (
            <Text style={{ color: '#EF4444', fontSize: 17, fontFamily: FONTS.extraBold }}>
              CHECKMATE!
            </Text>
          ) : chess.isInCheck ? (
            <Animated.Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={{
                color: '#EF4444',
                fontSize: 17,
                fontFamily: FONTS.extraBold,
                opacity: chess.isPlayerTurn ? turnPulse : 1,
              }}
            >
              CHECK!
            </Animated.Text>
          ) : chess.isAIThinking ? (
            <Text
              style={{ color: '#FFFFFF', fontSize: 12, fontFamily: FONTS.semiBold }}
            >
              Thinking…
            </Text>
          ) : chess.isPlayerTurn ? (
            <Animated.Text
              accessibilityLiveRegion="polite"
              style={{
                color: colors.accent,
                fontSize: 18,
                fontFamily: FONTS.extraBold,
                opacity: turnPulse,
              }}
            >
              Your Move
            </Animated.Text>
          ) : null}
        </View>
        {/* Opponent captures (pieces opponent took from player) */}
        {renderCaptured(opponentCapturedPieces, chess.playerColor)}
        {renderBoard()}
        {/* Player captures (pieces player took from opponent) */}
        {renderCaptured(playerCapturedPieces, opponentColor)}

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.actionPill,
              { opacity: chess.takeBackAvailable ? 1 : 0.4 },
            ]}
            onPress={() => {
              if (!chess.takeBackAvailable) return;
              hapticLight();
              playGameSound('tap');
              chess.takeBack();
            }}
            disabled={!chess.takeBackAvailable}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              chess.takeBackUsed ? 'Take back used' : 'Take back'
            }
            accessibilityState={{ disabled: !chess.takeBackAvailable }}
          >
            <Text style={styles.actionPillText}>
              {chess.takeBackUsed ? 'Used' : 'Take Back'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionPill, styles.resignPill]}
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

        {chess.currentRoast && (
          <Animated.View
            style={[
              styles.roastToast,
              {
                bottom: insets.bottom + 70,
                backgroundColor:
                  severityBg[chess.roastSeverity || 'good'] ||
                  colors.accent + '30',
                opacity: roastFade,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.roastText}>{chess.currentRoast}</Text>
          </Animated.View>
        )}

        {chess.isGameOver && !chess.isReviewing && (
          <View style={styles.overlayBackdrop}>
            <View style={styles.overlayCard}>
              <Text style={styles.overlayTitle}>{gameOverTitle()}</Text>
              <Text style={styles.overlaySubtitle}>{gameOverSubtitle()}</Text>
              <TouchableOpacity
                style={[styles.playButton, { alignSelf: 'stretch' }]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  chess.enterReview();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Review game"
              >
                <Text style={styles.playButtonText}>Review Game</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.playButton, { alignSelf: 'stretch', marginTop: 10, backgroundColor: colors.background }]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  chess.newGame();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="New game"
              >
                <Text style={[styles.playButtonText, { color: colors.textPrimary }]}>New Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Review mode ────────────────────────────────────────────────
  const renderReviewMode = () => {
    const total = chess.fenHistoryLength - 1;
    const atStart = chess.reviewIndex === 0;
    const atEnd = chess.reviewIndex === chess.fenHistoryLength - 1;

    return (
      <View style={styles.body}>
        {renderReviewBoard()}

        <View style={styles.reviewNav}>
          <TouchableOpacity
            style={[styles.reviewBtn, atStart && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); chess.reviewGoToStart(); }}
            disabled={atStart}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go to start"
            accessibilityState={{ disabled: atStart }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={APP_ICONS.chevronLeft} style={{ width: 20, height: 20 }} resizeMode="contain" />
              <Image source={APP_ICONS.chevronLeft} style={{ width: 20, height: 20, marginLeft: -8 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewBtn, atStart && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); chess.reviewStepBack(); }}
            disabled={atStart}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Step back"
            accessibilityState={{ disabled: atStart }}
          >
            <Image source={APP_ICONS.chevronLeft} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </TouchableOpacity>

          <Text style={styles.reviewCounter}>
            {chess.reviewIndex === 0 ? 'Start' : `Move ${chess.reviewIndex}`} of {total}
          </Text>

          <TouchableOpacity
            style={[styles.reviewBtn, atEnd && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); chess.reviewStepForward(); }}
            disabled={atEnd}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Step forward"
            accessibilityState={{ disabled: atEnd }}
          >
            <Image source={APP_ICONS.chevronRight} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewBtn, atEnd && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); chess.reviewGoToEnd(); }}
            disabled={atEnd}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go to end"
            accessibilityState={{ disabled: atEnd }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={APP_ICONS.chevronRight} style={{ width: 20, height: 20 }} resizeMode="contain" />
              <Image source={APP_ICONS.chevronRight} style={{ width: 20, height: 20, marginLeft: -8 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.playButton, { marginTop: 16 }]}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            chess.newGame();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="New game"
        >
          <Text style={styles.playButtonText}>New Game</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/chess/chessbg.webp')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <GameNavButtons topOffset={insets.top + 10} />
        <View style={styles.header}>
          <Image source={require('../../assets/icons/icon-chess.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
        </View>
        <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Chess</Text>
        {chess.isLoading ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : !chess.game ? (
          renderPreGame()
        ) : chess.isReviewing ? (
          renderReviewMode()
        ) : (
          renderActiveGame()
        )}
      </View>
    </ImageBackground>
  );
}
