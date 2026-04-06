import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import { useCheckers } from '../hooks/useCheckers';
import { getCheckerImage } from '../data/checkersAssets';
import { DIFFICULTY_LEVELS, PieceColor } from '../services/checkersAI';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkers'>;

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

export default function CheckersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const game = useCheckers();

  const [selectedColor, setSelectedColor] = useState<PieceColor>('r');
  const [selectedDifficulty, setSelectedDifficulty] = useState(2);

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
          paddingBottom: 8,
        },
        headerBack: { position: 'absolute', left: 20, top: insets.top + 10 },
        headerHome: { position: 'absolute', left: 64, top: insets.top + 10 },
        title: { fontSize: 26, fontWeight: '800', color: colors.overlayText },
        body: { flex: 1, paddingHorizontal: BOARD_H_PADDING },
        centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        loadingText: { color: colors.overlayText, fontSize: 15 },

        // Pre-game modal
        preGameCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 24,
        },
        preGameTitle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.overlayText,
          textAlign: 'center',
          marginBottom: 18,
        },
        sectionLabel: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.overlayText,
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
        colorLabel: { fontSize: 13, fontWeight: '600', color: colors.overlayText },
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
        pillText: { fontSize: 13, color: colors.textTertiary },
        pillTextActive: { color: colors.accent, fontWeight: '600' },
        playButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        playButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

        // Active game
        gameHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
        },
        gameHeaderText: { color: colors.overlayText, fontSize: 14 },
        pieceCountRow: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 22,
          gap: 6,
          marginVertical: 4,
          paddingHorizontal: 4,
        },
        pieceCountImg: { width: 18, height: 18 },
        pieceCountText: { color: colors.overlayText, fontSize: 13, fontWeight: '600' },
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
        resignText: { color: colors.red, fontSize: 13, fontWeight: '600' },

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
          fontSize: 24,
          fontWeight: '800',
          color: colors.overlayText,
          marginBottom: 6,
        },
        overlaySubtitle: {
          fontSize: 15,
          color: colors.overlayText,
          opacity: 0.8,
          marginBottom: 18,
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
              selectedColor === 'r' && styles.colorButtonSelected,
            ]}
            onPress={() => { hapticLight(); setSelectedColor('r'); }}
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
            onPress={() => { hapticLight(); setSelectedColor('b'); }}
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
                onPress={() => { hapticLight(); setSelectedDifficulty(idx); }}
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
            game.startGame(selectedColor, selectedDifficulty);
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

  // ── Piece count bar ────────────────────────────────────────────
  const renderPieceCount = (color: PieceColor) => {
    const count = color === 'r' ? game.redCount : game.blackCount;
    const kings = color === 'r' ? game.redKings : game.blackKings;
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
  };

  // ── Board ──────────────────────────────────────────────────────
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

              const bg = isSelected
                ? colors.accent + '90'
                : dark
                ? colors.accent + 'CC'
                : colors.accent + '60';

              const pieceName = cell
                ? `${cell.color === 'r' ? 'red' : 'black'} ${cell.king ? 'king' : 'piece'}`
                : 'empty';
              const label = `row ${logRow}, column ${logCol}, ${pieceName}`;

              if (!dark) {
                // Light squares are non-interactive, never have pieces
                return (
                  <View
                    key={colIdx}
                    style={[styles.square, { backgroundColor: bg }]}
                    accessibilityLabel={`row ${logRow}, column ${logCol}, empty`}
                  />
                );
              }

              return (
                <TouchableOpacity
                  key={colIdx}
                  style={[styles.square, { backgroundColor: bg }]}
                  onPress={() => {
                    hapticLight();
                    game.selectSquare(logRow, logCol);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                >
                  {cell && (
                    <Image
                      source={getCheckerImage(cell)}
                      style={styles.pieceImg}
                      resizeMode="contain"
                    />
                  )}
                  {isValidTarget && !cell && <View style={styles.moveDot} />}
                  {isValidTarget && cell && <View style={styles.captureRing} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // ── Active game ────────────────────────────────────────────────
  const renderActiveGame = () => {
    const opponentColor: PieceColor = game.playerColor === 'r' ? 'b' : 'r';
    const diffName = DIFFICULTY_LABELS[game.difficulty] ?? '';

    return (
      <View style={styles.body}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameHeaderText}>{diffName}</Text>
          <Text style={styles.gameHeaderText}>Move {game.moveCount}</Text>
        </View>
        <View
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
              style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}
            >
              Thinking…
            </Text>
          )}
        </View>
        {/* Opponent pieces */}
        {renderPieceCount(opponentColor)}
        {renderBoard()}
        {/* Player pieces */}
        {renderPieceCount(game.playerColor)}

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.resignPill}
            onPress={handleResignPress}
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

  return (
    <ImageBackground
      source={require('../../assets/checkers/checkers-bg.webp')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={styles.header}>
          <View style={styles.headerBack}>
            <BackButton
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Home');
                }
              }}
              forceDark
            />
          </View>
          <View style={styles.headerHome}>
            <HomeButton forceDark />
          </View>
          <Text style={styles.title}>Checkers</Text>
        </View>
        {game.isLoading ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : game.board.length === 0 ? (
          renderPreGame()
        ) : (
          renderActiveGame()
        )}
      </View>
    </ImageBackground>
  );
}
