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
import { useMultiplayerCheckers } from '../hooks/useMultiplayerCheckers';
import { endGame, resign as mpResign } from '../services/multiplayer';
import { getCheckerImage } from '../data/checkersAssets';
import { useIconTheme } from '../hooks/useIconTheme';
import type { PieceColor } from '../services/checkersAI';

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
const BOARD_SIZE = SCREEN_WIDTH - BOARD_H_PADDING * 2;
const SQUARE_SIZE = BOARD_SIZE / 8;

function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

// Map visual display coords (what the user sees) to logical board coords
// (what's in state). When the player is black, the board is rotated 180°.
function logicalCoords(
  displayRow: number,
  displayCol: number,
  playerColor: PieceColor,
): [number, number] {
  if (playerColor === 'b') {
    return [7 - displayRow, 7 - displayCol];
  }
  return [displayRow, displayCol];
}

interface MultiplayerCheckersGameProps {
  code: string;
  onExit: () => void;
}

export default function MultiplayerCheckersGame({
  code,
  onExit,
}: MultiplayerCheckersGameProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mp = useMultiplayerCheckers({ gameCode: code });
  const navigation = useNavigation();

  // Subscribe to icon-theme changes so getCheckerImage (which calls
  // resolveIcon at render time) reflects the current theme on re-render.
  useIconTheme();

  const [exitTitle] = useState(() => pickRandom(EXIT_TITLES));
  const [exitMessage] = useState(() => pickRandom(EXIT_MESSAGES));

  const bypassExitRef = useRef(false);
  const mpRef = useRef(mp);
  useEffect(() => {
    mpRef.current = mp;
  });

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

        // Piece count bar
        pieceCountRow: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 22,
          gap: 6,
          marginVertical: 4,
          paddingHorizontal: 4,
        },
        pieceCountImg: { width: 18, height: 18 },
        pieceCountText: {
          color: colors.overlayText,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
        },
        pieceCountSep: {
          color: colors.overlayText,
          fontSize: 13,
          opacity: 0.4,
          marginHorizontal: 4,
        },

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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderWidth: 2,
          borderColor: colors.accent,
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
      }),
    [colors],
  );

  // ── Handlers ─────────────────────────────────────────────────
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
    endGame(code, 'complete', null)
      .catch(() => {})
      .finally(() => onExit());
  }, [code, onExit]);

  const renderPieceCount = useCallback(
    (color: PieceColor) => {
      const count = color === 'r' ? mp.redCount : mp.blackCount;
      const kings = color === 'r' ? mp.redKings : mp.blackKings;
      const regulars = count - kings;
      return (
        <View style={styles.pieceCountRow}>
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
    },
    [mp.redCount, mp.blackCount, mp.redKings, mp.blackKings, styles],
  );

  const renderBoard = useCallback(() => {
    return (
      <View style={styles.boardWrap}>
        {mp.board.map((row, displayRow) => (
          <View key={displayRow} style={styles.boardRow}>
            {row.map((cell, displayCol) => {
              const dark = isDarkSquare(displayRow, displayCol);
              const [logRow, logCol] = logicalCoords(
                displayRow,
                displayCol,
                mp.playerColor,
              );
              const isSelected =
                mp.selectedSquare !== null &&
                mp.selectedSquare[0] === logRow &&
                mp.selectedSquare[1] === logCol;
              const isLegalTarget = mp.legalMoves.some(
                ([r, c]) => r === logRow && c === logCol,
              );

              const bg = isSelected
                ? colors.accent + '90'
                : dark
                  ? colors.accent + 'CC'
                  : colors.accent + '60';

              if (!dark) {
                return (
                  <View
                    key={displayCol}
                    style={[styles.square, { backgroundColor: bg }]}
                  />
                );
              }

              // Build accessibility label: logical position, piece, state.
              const pieceLabel = cell
                ? `${cell.color === 'r' ? 'red' : 'black'}${cell.king ? ' king' : ''} piece`
                : 'empty';
              const stateBits: string[] = [];
              if (isSelected) stateBits.push('selected');
              else if (isLegalTarget) stateBits.push('can move here');
              const a11yLabel = `Row ${logRow + 1}, column ${logCol + 1}, ${pieceLabel}${
                stateBits.length ? ', ' + stateBits.join(', ') : ''
              }`;

              return (
                <TouchableOpacity
                  key={displayCol}
                  style={[styles.square, { backgroundColor: bg }]}
                  onPress={() => mp.selectSquare(logRow, logCol)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={a11yLabel}
                >
                  {cell && (
                    <Image
                      source={getCheckerImage(cell)}
                      style={styles.pieceImg}
                      resizeMode="contain"
                    />
                  )}
                  {isLegalTarget && !cell && <View style={styles.moveDot} />}
                  {isLegalTarget && cell && <View style={styles.captureRing} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  }, [mp, colors, styles]);

  const overlayTitle = (): string => {
    const opp = mp.opponentName || 'Opponent';
    switch (mp.gameResult) {
      case 'red_wins':
        return mp.playerColor === 'r' ? 'You Win!' : `${opp} Wins`;
      case 'black_wins':
        return mp.playerColor === 'b' ? 'You Win!' : `${opp} Wins`;
      case 'draw':
        return 'Draw by Agreement';
      case 'resigned':
        return mp.winner === mp.playerColor ? `${opp} Resigned — You Win!` : 'You Resigned';
      default:
        return 'Game Over';
    }
  };

  // ── Branching UI ────────────────────────────────────────────

  if (!mp.isConnected) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    );
  }

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

  const opponentColor: PieceColor = mp.playerColor === 'r' ? 'b' : 'r';

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
          <Text
            style={{
              color: colors.overlayText + 'AA',
              fontSize: 11,
              fontFamily: FONTS.regular,
              marginTop: 2,
            }}
          >
            Playing {mp.playerColor === 'r' ? 'red' : 'black'} · Move{' '}
            {mp.moveCount}
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

      {/* Opponent's pieces (top) */}
      {renderPieceCount(opponentColor)}
      {renderBoard()}
      {/* My pieces (bottom) */}
      {renderPieceCount(mp.playerColor)}

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
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontFamily: FONTS.regular,
                textAlign: 'center',
              }}
            >
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
            <Text style={styles.overlaySubtitle}>Code {code}</Text>
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
          </View>
        </View>
      )}
    </ScrollView>
  );
}
