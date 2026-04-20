import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
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
import { useMultiplayerChess } from '../hooks/useMultiplayerChess';
import { endGame, resign as mpResign } from '../services/multiplayer';
import { getPieceImage } from '../data/chessAssets';
import APP_ICONS from '../data/appIconAssets';

const EXIT_TITLES = [
  'Running Away?',
  'Abandoning Ship?',
  'Cold Feet?',
  'Quitting Already?',
  'Tactical Retreat?',
];
const EXIT_MESSAGES = [
  'Your opponent is literally waiting for you right now.',
  'Real brave. Leaving mid-game.',
  'The board remembers. So will your opponent.',
  'You sure? This is a bad look.',
  'Your pieces are judging you.',
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_H_PADDING = 16;
const BOARD_BORDER = 2;
const BOARD_SIZE = SCREEN_WIDTH - BOARD_H_PADDING * 2;
const INNER_BOARD = BOARD_SIZE - BOARD_BORDER * 2;
const SQUARE_SIZE = INNER_BOARD / 8;

const FILES_WHITE = 'abcdefgh';
const FILES_BLACK = 'hgfedcba';

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

function rankLabelText(row: number, playerColor: 'w' | 'b'): string {
  return playerColor === 'b' ? String(row + 1) : String(8 - row);
}

function fileLabelText(col: number, playerColor: 'w' | 'b'): string {
  return (playerColor === 'b' ? FILES_BLACK : FILES_WHITE)[col];
}

function isLight(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

interface MultiplayerChessGameProps {
  code: string;
  onExit: () => void;
}

export default function MultiplayerChessGame({
  code,
  onExit,
}: MultiplayerChessGameProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mp = useMultiplayerChess({ gameCode: code });
  const navigation = useNavigation();

  // DFW-personality exit dialog — one title/message picked per mount.
  const [exitTitle] = useState(() => pickRandom(EXIT_TITLES));
  const [exitMessage] = useState(() => pickRandom(EXIT_MESSAGES));

  // Refs for the beforeRemove listener's closure. We want the listener to
  // read the latest mp state without re-subscribing on every render.
  const bypassExitRef = useRef(false);
  const mpRef = useRef(mp);
  useEffect(() => {
    mpRef.current = mp;
  });

  // Only block exit during the active game — waiting/finished states are free to leave.
  const isMpActive =
    mp.isConnected && !!mp.opponentUid && !mp.isGameOver;

  // Waiting = connected, created, but no opponent yet. Tracked in a ref
  // so the unmount cleanup can read the latest value.
  const isWaitingRef = useRef(false);
  const hasExitedRef = useRef(false);
  useEffect(() => {
    isWaitingRef.current =
      mp.isConnected && !mp.opponentUid && !mp.isGameOver;
  });

  useEffect(() => {
    if (!isMpActive) return;
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (bypassExitRef.current) return;
      if (mpRef.current.isGameOver) return;
      e.preventDefault();
      Alert.alert(exitTitle, exitMessage, [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'Ask for Break',
          onPress: () => {
            mpRef.current.handleRequestBreak();
            if (Platform.OS === 'android') {
              ToastAndroid.show(
                'Break request sent. Waiting for response…',
                ToastAndroid.SHORT,
              );
            }
          },
        },
        {
          text: 'I Quit',
          style: 'destructive',
          onPress: async () => {
            try {
              await mpResign(code);
            } catch {
              if (Platform.OS === 'android') {
                ToastAndroid.show(
                  'Failed to resign — check your connection',
                  ToastAndroid.SHORT,
                );
              } else {
                Alert.alert(
                  'Failed to resign',
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
  }, [isMpActive, exitTitle, exitMessage, code, navigation]);

  // On unmount, if the player navigated away from a still-waiting game
  // (without pressing "Cancel Game"), mark the game finished so it doesn't
  // linger in their active list and block new game creation.
  useEffect(() => {
    return () => {
      if (isWaitingRef.current && !hasExitedRef.current) {
        hasExitedRef.current = true;
        endGame(code, 'complete', null).catch(() => {});
      }
    };
  }, [code]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, paddingHorizontal: BOARD_H_PADDING },
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        loadingText: {
          color: colors.overlayText,
          fontSize: 14,
          fontFamily: FONTS.regular,
        },
        waitingCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          alignItems: 'center',
          gap: 16,
        },
        waitingLabel: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          marginBottom: 4,
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
          marginTop: 4,
        },
        copyButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
          alignSelf: 'stretch',
          alignItems: 'center',
        },
        copyButtonText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 14,
        },
        waitingIndicator: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.regular,
          fontStyle: 'italic',
        },
        cancelPill: {
          marginTop: 12,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: colors.red + '30',
        },
        cancelPillText: {
          color: colors.red,
          fontFamily: FONTS.semiBold,
          fontSize: 12,
        },

        opponentBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 10,
        },
        opponentName: {
          color: colors.overlayText,
          fontSize: 14,
          fontFamily: FONTS.semiBold,
        },
        turnPill: {
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: colors.accent + '30',
        },
        turnPillText: {
          color: colors.accent,
          fontSize: 12,
          fontFamily: FONTS.bold,
        },
        turnPillInactive: { backgroundColor: colors.background },
        turnPillInactiveText: {
          color: colors.textSecondary,
          fontSize: 12,
          fontFamily: FONTS.regular,
        },
        connectionBanner: {
          paddingVertical: 4,
          alignItems: 'center',
        },
        connectionText: {
          color: colors.textTertiary,
          fontSize: 11,
          fontFamily: FONTS.regular,
          fontStyle: 'italic',
        },

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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderWidth: 2,
          borderColor: colors.accent,
        },
        rankLabel: {
          position: 'absolute',
          top: 1,
          left: 2,
          fontSize: 9,
          color: colors.overlayText + '60',
        },
        fileLabel: {
          position: 'absolute',
          bottom: 1,
          right: 2,
          fontSize: 9,
          color: colors.overlayText + '60',
        },

        // Action bar
        actionBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
        },
        actionPill: {
          flex: 1,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: colors.background,
          alignItems: 'center',
        },
        actionPillText: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        resignPill: { backgroundColor: colors.red + '30' },
        resignText: {
          color: colors.red,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
        },
        disabledPill: { opacity: 0.5 },

        // Offer modal
        offerBackdrop: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        offerCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          width: '100%',
          alignItems: 'center',
          gap: 14,
        },
        offerTitle: {
          fontSize: 17,
          fontFamily: FONTS.extraBold,
          color: colors.textPrimary,
          textAlign: 'center',
        },
        offerButtons: {
          flexDirection: 'row',
          gap: 10,
          alignSelf: 'stretch',
        },
        offerBtn: {
          flex: 1,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
        },
        offerBtnAccept: { backgroundColor: colors.accent },
        offerBtnAcceptText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 13,
        },
        offerBtnDecline: { backgroundColor: colors.background },
        offerBtnDeclineText: {
          color: colors.textPrimary,
          fontFamily: FONTS.semiBold,
          fontSize: 13,
        },
        offerBtnDestructive: { backgroundColor: colors.red + '30' },
        offerBtnDestructiveText: {
          color: colors.red,
          fontFamily: FONTS.bold,
          fontSize: 13,
        },

        // Game over
        overlayBackdrop: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
          textAlign: 'center',
        },
        overlaySubtitle: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          opacity: 0.8,
          marginBottom: 18,
          textAlign: 'center',
        },
        primaryButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignSelf: 'stretch',
          alignItems: 'center',
        },
        primaryButtonText: {
          color: '#FFFFFF',
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
        secondaryButton: {
          backgroundColor: colors.background,
          borderRadius: 12,
          paddingVertical: 14,
          alignSelf: 'stretch',
          alignItems: 'center',
          marginTop: 10,
        },
        secondaryButtonText: {
          color: colors.textPrimary,
          fontFamily: FONTS.bold,
          fontSize: 15,
        },

        // Review nav
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
    [colors],
  );

  // ── Handlers ────────────────────────────────────────────────────
  const handleCopyCode = useCallback(async () => {
    hapticLight();
    playGameSound('tap');
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      // swallow
    }
  }, [code]);

  const handleCancelWaiting = useCallback(() => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;
    hapticLight();
    // Abort before an opponent joins — mark finished so it doesn't linger as active.
    endGame(code, 'complete', null)
      .catch(() => {})
      .finally(() => onExit());
  }, [code, onExit]);

  // ── Render board (active or review) ─────────────────────────────
  const renderBoard = useCallback(
    (
      board: typeof mp.board,
      interactive: boolean,
    ) => {
      const turnColor: 'w' | 'b' = mp.isPlayerTurn
        ? mp.playerColor
        : mp.playerColor === 'w'
          ? 'b'
          : 'w';

      return (
        <View
          style={[
            styles.boardWrap,
            interactive &&
              mp.isInCheck && { borderColor: '#EF4444' },
            interactive &&
              !mp.isInCheck &&
              mp.isPlayerTurn && { borderColor: colors.accent },
          ]}
        >
          {board.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.boardRow}>
              {row.map((cell, colIdx) => {
                const selected =
                  interactive &&
                  mp.selectedSquare?.row === rowIdx &&
                  mp.selectedSquare?.col === colIdx;
                const legal =
                  interactive &&
                  mp.legalMoves.some(
                    (m) => m.row === rowIdx && m.col === colIdx,
                  );
                const lastFromTo =
                  interactive &&
                  mp.lastMove &&
                  ((mp.lastMove.from.row === rowIdx &&
                    mp.lastMove.from.col === colIdx) ||
                    (mp.lastMove.to.row === rowIdx &&
                      mp.lastMove.to.col === colIdx));
                const kingInCheck =
                  interactive &&
                  mp.isInCheck &&
                  !!cell &&
                  cell.type === 'k' &&
                  cell.color === turnColor;

                let bg: string;
                if (selected) bg = colors.accent + '90';
                else if (kingInCheck) bg = 'rgba(220, 38, 38, 0.6)';
                else if (lastFromTo) bg = 'rgba(250, 204, 21, 0.4)';
                else bg = isLight(rowIdx, colIdx)
                  ? colors.accent + '60'
                  : colors.accent + 'CC';

                const showRank = colIdx === 0;
                const showFile = rowIdx === 7;

                // Build accessibility label: square name, piece, state.
                const sqName = `${fileLabelText(colIdx, mp.playerColor)}${rankLabelText(rowIdx, mp.playerColor)}`;
                const pieceLabel = cell
                  ? `${cell.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[cell.type] ?? cell.type}`
                  : 'empty';
                const stateBits: string[] = [];
                if (selected) stateBits.push('selected');
                else if (legal) stateBits.push('can move here');
                if (kingInCheck) stateBits.push('in check');
                if (lastFromTo) stateBits.push('last move');
                const a11yLabel = `${sqName}, ${pieceLabel}${
                  stateBits.length ? ', ' + stateBits.join(', ') : ''
                }`;

                const content = (
                  <>
                    {showRank && (
                      <Text style={styles.rankLabel}>
                        {rankLabelText(rowIdx, mp.playerColor)}
                      </Text>
                    )}
                    {showFile && (
                      <Text style={styles.fileLabel}>
                        {fileLabelText(colIdx, mp.playerColor)}
                      </Text>
                    )}
                    {cell && (
                      <Image
                        source={getPieceImage(cell)}
                        style={styles.pieceImg}
                        resizeMode="contain"
                      />
                    )}
                    {legal && !cell && <View style={styles.moveDot} />}
                    {legal && cell && <View style={styles.captureRing} />}
                  </>
                );

                if (!interactive) {
                  return (
                    <View
                      key={colIdx}
                      style={[styles.square, { backgroundColor: bg }]}
                      accessible={true}
                      accessibilityLabel={a11yLabel}
                    >
                      {content}
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={colIdx}
                    style={[styles.square, { backgroundColor: bg }]}
                    onPress={() => mp.handleSquarePress(rowIdx, colIdx)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={a11yLabel}
                  >
                    {content}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      );
    },
    [colors, mp, styles],
  );

  // ── Overlay: game over ──────────────────────────────────────────
  const overlayTitle = (): string => {
    const opp = mp.opponentName || 'Opponent';
    switch (mp.gameResult) {
      case 'checkmate':
        return mp.winner === mp.playerColor ? 'Checkmate — You Win!' : `Checkmate — ${opp} Wins`;
      case 'stalemate':
        return 'Stalemate';
      case 'draw':
        return 'Draw by Agreement';
      case 'resigned':
        return mp.winner === mp.playerColor ? `${opp} Resigned — You Win!` : 'You Resigned';
      case 'complete':
        return 'Game Ended';
      default:
        return 'Game Over';
    }
  };

  // ── Branching UI ────────────────────────────────────────────────

  // 1) Initial loading (first snapshot hasn't arrived yet).
  if (!mp.isConnected) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    );
  }

  // 2) Review mode.
  if (mp.reviewIndex !== null && mp.reviewBoard) {
    const total = mp.moveHistory.length;
    const atStart = mp.reviewIndex === 0;
    const atEnd = mp.reviewIndex >= total;
    return (
      <View style={styles.root}>
        {renderBoard(mp.reviewBoard, false)}
        <View style={styles.reviewNav}>
          <TouchableOpacity
            style={[styles.reviewBtn, atStart && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); mp.reviewFirst(); }}
            disabled={atStart}
            accessibilityRole="button"
            accessibilityLabel="Go to start"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={APP_ICONS.chevronLeft} style={{ width: 20, height: 20 }} resizeMode="contain" />
              <Image source={APP_ICONS.chevronLeft} style={{ width: 20, height: 20, marginLeft: -8 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewBtn, atStart && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); mp.reviewPrev(); }}
            disabled={atStart}
            accessibilityRole="button"
            accessibilityLabel="Step back"
          >
            <Image source={APP_ICONS.chevronLeft} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.reviewCounter}>
            {mp.reviewIndex === 0 ? 'Start' : `Move ${mp.reviewIndex}`} of {total}
          </Text>
          <TouchableOpacity
            style={[styles.reviewBtn, atEnd && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); mp.reviewNext(); }}
            disabled={atEnd}
            accessibilityRole="button"
            accessibilityLabel="Step forward"
          >
            <Image source={APP_ICONS.chevronRight} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewBtn, atEnd && { opacity: 0.3 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); mp.reviewLast(); }}
            disabled={atEnd}
            accessibilityRole="button"
            accessibilityLabel="Go to end"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={APP_ICONS.chevronRight} style={{ width: 20, height: 20 }} resizeMode="contain" />
              <Image source={APP_ICONS.chevronRight} style={{ width: 20, height: 20, marginLeft: -8 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 16 }]}
          onPress={() => {
            hapticLight();
            playGameSound('tap');
            mp.exitReview();
            onExit();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
        >
          <Text style={styles.primaryButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3) Waiting for opponent (game created, nobody joined yet).
  if (!mp.opponentUid && !mp.isGameOver) {
    return (
      <View style={styles.center}>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingLabel}>Your game code</Text>
          <Text
            style={styles.codeDisplay}
            accessibilityLabel={`Game code: ${code.split('').join(' ')}`}
            accessibilityRole="text"
          >
            {code}
          </Text>
          <Text style={styles.codeHint}>
            Share this with your opponent. They enter it on the Join screen.
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
          <Text style={styles.waitingIndicator}>Waiting for opponent…</Text>
          <TouchableOpacity
            style={styles.cancelPill}
            onPress={handleCancelWaiting}
            accessibilityRole="button"
            accessibilityLabel="Cancel game"
          >
            <Text style={styles.cancelPillText}>Cancel Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4) Active game (with optional game over overlay).
  const moveNum = Math.max(1, Math.ceil(mp.moveHistory.length / 2));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.opponentBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.opponentName}>
            {mp.opponentName || 'Opponent'}
          </Text>
          <Text style={{ color: colors.overlayText + 'AA', fontSize: 11, fontFamily: FONTS.regular, marginTop: 2 }}>
            Playing {mp.playerColor === 'w' ? 'black' : 'white'} · Move {moveNum}
          </Text>
        </View>
        <View
          style={[styles.turnPill, !mp.isPlayerTurn && styles.turnPillInactive]}
          accessibilityLiveRegion="polite"
        >
          <Text
            style={
              mp.isPlayerTurn ? styles.turnPillText : styles.turnPillInactiveText
            }
            accessibilityLabel={
              mp.isGameOver
                ? 'Game over'
                : mp.isPlayerTurn
                  ? 'Your turn'
                  : `${mp.opponentName || 'Opponent'}'s turn`
            }
          >
            {mp.isGameOver
              ? 'Game Over'
              : mp.isPlayerTurn
                ? 'Your Turn'
                : 'Their Turn'}
          </Text>
        </View>
      </View>

      {renderBoard(mp.board, !mp.isGameOver)}

      {!mp.isGameOver && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.actionPill,
              mp.drawOfferSent && styles.disabledPill,
            ]}
            onPress={() => {
              if (mp.drawOfferSent) return;
              hapticLight();
              playGameSound('tap');
              mp.handleOfferDraw();
            }}
            disabled={mp.drawOfferSent}
            accessibilityRole="button"
            accessibilityLabel="Offer draw"
          >
            <Text style={styles.actionPillText}>
              {mp.drawOfferSent ? 'Draw Offered' : 'Offer Draw'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionPill,
              mp.breakRequestSent && styles.disabledPill,
            ]}
            onPress={() => {
              if (mp.breakRequestSent) return;
              hapticLight();
              playGameSound('tap');
              mp.handleRequestBreak();
            }}
            disabled={mp.breakRequestSent}
            accessibilityRole="button"
            accessibilityLabel="Request break"
          >
            <Text style={styles.actionPillText}>
              {mp.breakRequestSent ? 'Break Asked' : 'Take Break'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionPill, styles.resignPill]}
            onPress={() => {
              hapticLight();
              playGameSound('tap');
              mp.handleResign();
            }}
            accessibilityRole="button"
            accessibilityLabel="Resign"
          >
            <Text style={styles.resignText}>Resign</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Incoming draw offer */}
      {!mp.isGameOver && mp.drawOfferPending && (
        <View style={styles.offerBackdrop}>
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>
              Your opponent offers a draw.
            </Text>
            <View style={styles.offerButtons}>
              <TouchableOpacity
                style={[styles.offerBtn, styles.offerBtnDecline]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  mp.handleRespondToDraw(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Decline draw"
              >
                <Text style={styles.offerBtnDeclineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.offerBtn, styles.offerBtnAccept]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  mp.handleRespondToDraw(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Accept draw"
              >
                <Text style={styles.offerBtnAcceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Incoming break request */}
      {!mp.isGameOver && mp.breakRequestPending && (
        <View style={styles.offerBackdrop}>
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>
              Your opponent wants to take a break.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONTS.regular, textAlign: 'center' }}>
              Decline to forfeit instead of waiting.
            </Text>
            <View style={styles.offerButtons}>
              <TouchableOpacity
                style={[styles.offerBtn, styles.offerBtnDestructive]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  mp.handleRespondToBreak(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Forfeit"
              >
                <Text style={styles.offerBtnDestructiveText}>I Forfeit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.offerBtn, styles.offerBtnAccept]}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  mp.handleRespondToBreak(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Continue later"
              >
                <Text style={styles.offerBtnAcceptText}>Continue Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Game over overlay */}
      {mp.isGameOver && (
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>{overlayTitle()}</Text>
            <Text style={styles.overlaySubtitle}>
              Code {code}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                hapticLight();
                playGameSound('tap');
                mp.startReview();
              }}
              accessibilityRole="button"
              accessibilityLabel="Review game"
            >
              <Text style={styles.primaryButtonText}>Review Game</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                hapticLight();
                playGameSound('tap');
                onExit();
              }}
              accessibilityRole="button"
              accessibilityLabel="Back to menu"
            >
              <Text style={styles.secondaryButtonText}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
