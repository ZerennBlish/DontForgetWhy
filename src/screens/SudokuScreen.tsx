import React, { useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ImageBackground,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import type { RootStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';
import { GameNavButtons } from '../components/GameNavButtons';
import { useAppIcon } from '../hooks/useAppIcon';
import type { Difficulty } from '../utils/sudoku';
import { useSudoku, DIFFICULTY_CONFIG, formatTime, getStars, MAX_HINTS } from '../hooks/useSudoku';

type Props = NativeStackScreenProps<RootStackParamList, 'Sudoku'>;

// ---------- Cell ----------

// Memoized cell component. Pulled out so the timer tick (every 1s) only
// re-renders the timer text, not all 81 cells. React.memo skips a cell
// re-render if its props are referentially equal — which they will be
// because the parent passes stable callbacks and pre-computed flags.
interface SudokuCellProps {
  row: number;
  col: number;
  value: number;
  isGiven: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isSameNumber: boolean;
  cellNotes: number[];
  borderRight: number;
  borderBottom: number;
  borderLeft: number;
  borderTop: number;
  cellTextStyle: object;
  notesGridStyle: object;
  noteTextStyle: object;
  baseCellStyle: object;
  onPress: (row: number, col: number) => void;
}

const SudokuCell = React.memo(function SudokuCell({
  row,
  col,
  value,
  isGiven,
  isSelected,
  isHighlighted,
  isSameNumber,
  cellNotes,
  borderRight,
  borderBottom,
  borderLeft,
  borderTop,
  cellTextStyle,
  notesGridStyle,
  noteTextStyle,
  baseCellStyle,
  onPress,
}: SudokuCellProps) {
  const handlePress = useCallback(() => onPress(row, col), [onPress, row, col]);

  let bgColor: string = 'transparent';
  if (isSelected) bgColor = 'rgba(74,144,217,0.25)';
  else if (isSameNumber) bgColor = 'rgba(74,144,217,0.15)';
  else if (isHighlighted) bgColor = 'rgba(0,0,0,0.06)';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        baseCellStyle,
        {
          backgroundColor: bgColor,
          borderRightWidth: borderRight,
          borderBottomWidth: borderBottom,
          borderLeftWidth: borderLeft,
          borderTopWidth: borderTop,
          borderColor: 'rgba(0,0,0,0.2)',
        },
      ]}
    >
      {value !== 0 ? (
        <Text
          style={[
            cellTextStyle,
            {
              color: isGiven ? '#000000' : '#1A1A44',
              fontFamily: isGiven ? FONTS.bold : FONTS.semiBold,
            },
          ]}
        >
          {value}
        </Text>
      ) : cellNotes.length > 0 ? (
        <View style={notesGridStyle}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Text
              key={n}
              style={[
                noteTextStyle,
                { color: cellNotes.includes(n) ? '#999999' : 'transparent' },
              ]}
            >
              {n}
            </Text>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

// ---------- Main Screen ----------

export default function SudokuScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const sudokuIcon = useAppIcon('card.sudoku');
  const partyIcon = useAppIcon('status.party');
  const starIcon = useAppIcon('status.star');
  const lossIcon = useAppIcon('status.loss');
  const hourglassIcon = useAppIcon('status.hourglass');
  const refreshIcon = useAppIcon('ui.refresh');
  const pencilIcon = useAppIcon('edit');
  const eraseIcon = useAppIcon('ui.erase');
  const lightbulbIcon = useAppIcon('trivia.lightbulb');

  const {
    gamePhase, setGamePhase,
    difficulty, bestScores, hasSavedGame,
    puzzleGrid, playerGrid, notes, selectedCell, setSelectedCell,
    mistakes, elapsed, hintsUsed, notesMode, setNotesMode,
    winMessage, finalTime, finalMistakes, finalHints,
    remainingCounts, showRemainingCounts, showMistakesDuringPlay,
    hintDisabled,
    cellFlags,
    startNewGame, resumeGame, handlePause, handleResume, handleBackFromGame,
    saveGameState,
    handleNumberPress, handleErase, handleHint, handleNewGameConfirm,
    clearSavedGame,
  } = useSudoku();

  // Stable cell-press handler. Each SudokuCell wraps this in its own
  // useCallback that closes over its row/col, so cells receive a stable
  // onPress reference and React.memo can skip re-renders.
  const handleCellPress = useCallback((row: number, col: number) => {
    hapticLight();
    setSelectedCell([row, col]);
  }, [setSelectedCell]);

  // Intercept hardware back during active gameplay. Home nav uses popToTop()
  // which dispatches POP_TO_TOP (or RESET) — for those we save progress and
  // let navigation through. A plain POP is a per-screen back gesture, which
  // we absorb into an in-game "return to menu" transition.
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const actionType = e.data.action.type;
      if (actionType === 'POP_TO_TOP' || actionType === 'RESET') {
        saveGameState();
        return;
      }
      e.preventDefault();
      handleBackFromGame();
    });
    return unsubscribe;
  }, [navigation, gamePhase, handleBackFromGame, saveGameState]);

  // ---------- Styles ----------

  const { width: screenWidth } = Dimensions.get('window');
  const GRID_SIZE = Math.min(screenWidth - 32, screenWidth > 600 ? 540 : 380);
  const CELL_SIZE = Math.floor(GRID_SIZE / 9);

  const styles = useMemo(
    () => makeStyles(colors, insets.bottom, insets.top, CELL_SIZE, GRID_SIZE),
    [colors, insets.bottom, insets.top, CELL_SIZE, GRID_SIZE],
  );

  // ---------- Render: Difficulty Select ----------

  if (gamePhase === 'select') {
    return (
      <ImageBackground source={require('../../assets/newspaper.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <GameNavButtons topOffset={insets.top + 10} />
      <View style={styles.header}>
        <Image source={sudokuIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Sudoku</Text>
      <ScrollView style={styles.container} contentContainerStyle={styles.selectContent}>
        <Text style={[styles.selectSubtitle, { paddingHorizontal: 20 }]}>Classic number puzzle. No forgetting allowed.</Text>

        {hasSavedGame && (
          <TouchableOpacity
            style={[styles.difficultyBtn, { borderColor: colors.accent, borderWidth: 2 }]}
            onPress={() => { hapticLight(); playGameSound('tap'); resumeGame(); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Continue game"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <GlowIcon source={MEDIA_ICONS.gamePlay} size={24} glowColor={colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.difficultyLabel}>Continue Game</Text>
            </View>
            <Text style={styles.difficultyInfo}>Resume your saved puzzle</Text>
          </TouchableOpacity>
        )}

        {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
          const config = DIFFICULTY_CONFIG[diff];
          const best = bestScores[diff];
          return (
            <TouchableOpacity
              key={diff}
              style={styles.difficultyBtn}
              onPress={() => {
                hapticLight();
                playGameSound('tap');
                if (hasSavedGame) {
                  Alert.alert(
                    'New Game',
                    'You have a game in progress. Start a new one?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'New Game', onPress: () => startNewGame(diff) },
                    ],
                  );
                } else {
                  startNewGame(diff);
                }
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={config.label}
              accessibilityState={{ selected: false }}
            >
              <Text style={styles.difficultyLabel}>{config.label}</Text>
              {best?.gamesPlayed ? (
                <Text style={styles.difficultyInfo}>
                  {best.gamesPlayed} game{best.gamesPlayed !== 1 ? 's' : ''} played
                </Text>
              ) : (
                <Text style={[styles.difficultyInfo]}>
                  No games played
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

  // ---------- Render: Paused ----------

  if (gamePhase === 'paused') {
    return (
      <ImageBackground source={require('../../assets/newspaper.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <View style={[styles.container, styles.centeredContent]}>
        <GlowIcon source={MEDIA_ICONS.pause} size={48} glowColor={colors.success} />
        <Text style={styles.pauseTitle}>Paused</Text>
        <Text style={styles.pauseSubtitle}>{formatTime(elapsed)}</Text>
        <TouchableOpacity style={styles.resumeBtn} onPress={() => { hapticLight(); playGameSound('tap'); handleResume(); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Continue game">
          <Text style={styles.resumeBtnText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changeDifficultyBtn}
          onPress={() => { hapticLight(); playGameSound('tap'); clearSavedGame(); setGamePhase('select'); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change difficulty"
        >
          <Text style={styles.changeDifficultyText}>Quit Game</Text>
        </TouchableOpacity>
      </View>
      </View>
      </ImageBackground>
    );
  }

  // ---------- Render: Won ----------

  if (gamePhase === 'won') {
    const stars = getStars(finalMistakes, finalHints);
    const isHard = difficulty === 'hard';
    return (
      <ImageBackground source={require('../../assets/newspaper.webp')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <GameNavButtons topOffset={insets.top + 10} />
      <View style={styles.winHeader}>
        <Image source={sudokuIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Sudoku</Text>
      <ScrollView style={styles.container} contentContainerStyle={styles.winContent}>
        <Image source={partyIcon} style={{ width: 48, height: 48, marginBottom: 8 }} resizeMode="contain" />
        <Text style={styles.winTitle}>Puzzle Complete!</Text>

        {isHard && (
          <Text style={styles.hardRevealText}>Let's see how you actually did...</Text>
        )}

        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 20 }}>
          {Array.from({ length: stars }, (_, i) => (
            <Image key={i} source={starIcon} style={{ width: 36, height: 36 }} resizeMode="contain" />
          ))}
        </View>

        <View style={styles.winStatsCard}>
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Time</Text>
            <Text style={styles.winStatValue}>{formatTime(finalTime)}</Text>
          </View>
          <View style={styles.winDivider} />
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Mistakes</Text>
            <Text style={styles.winStatValue}>{finalMistakes}</Text>
          </View>
          {finalHints > 0 && (
            <>
              <View style={styles.winDivider} />
              <View style={styles.winStatRow}>
                <Text style={styles.winStatLabel}>Hints Used</Text>
                <Text style={styles.winStatValue}>{finalHints}</Text>
              </View>
            </>
          )}
          <View style={styles.winDivider} />
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Difficulty</Text>
            <Text style={styles.winStatValue}>{DIFFICULTY_CONFIG[difficulty].label}</Text>
          </View>
          <View style={styles.winDivider} />
          <View style={styles.winStatRow}>
            <Text style={styles.winStatLabel}>Rating</Text>
            <Text style={styles.winStatValue}>
              {stars === 3 ? 'Perfect!' : stars === 2 ? 'Great' : 'Keep practicing'}
            </Text>
          </View>
        </View>

        <Text style={styles.winMessage}>{`"${winMessage}"`}</Text>

        <TouchableOpacity
          style={styles.playAgainBtn}
          onPress={() => { hapticLight(); playGameSound('tap'); startNewGame(difficulty); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Play again"
        >
          <Text style={styles.playAgainText}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changeDifficultyBtn}
          onPress={() => { hapticLight(); playGameSound('tap'); setGamePhase('select'); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change difficulty"
        >
          <Text style={styles.changeDifficultyText}>Change Difficulty</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
      </ImageBackground>
    );
  }

  // ---------- Render: Game Board ----------

  return (
    <ImageBackground source={require('../../assets/newspaper.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' }}>
    <GameNavButtons topOffset={insets.top + 10} onBack={handleBackFromGame} />
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.gameHeader}>
        <View style={styles.gameHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} />
          <Text style={styles.gameDifficulty}>{DIFFICULTY_CONFIG[difficulty].label}</Text>
        </View>
        <View style={styles.statsRow} accessibilityLiveRegion="polite">
          {showMistakesDuringPlay ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={lossIcon} style={{ width: 14, height: 14 }} resizeMode="contain" />
              <Text style={styles.statText}>{mistakes}</Text>
            </View>
          ) : (
            <View style={styles.statPlaceholder} />
          )}
          <TouchableOpacity onPress={() => { hapticLight(); playGameSound('tap'); handlePause(); }} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={hourglassIcon} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { hapticLight(); playGameSound('tap'); handleNewGameConfirm(); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Start new game">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={refreshIcon} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={[styles.statText, { color: colors.accent }]}>New</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridOuter}>
          {Array.from({ length: 9 }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: 9 }, (_, col) => {
                const flags = cellFlags[row]?.[col];
                return (
                  <SudokuCell
                    key={col}
                    row={row}
                    col={col}
                    value={playerGrid[row]?.[col] || 0}
                    isGiven={puzzleGrid[row]?.[col] !== 0}
                    isSelected={selectedCell?.[0] === row && selectedCell?.[1] === col}
                    isHighlighted={flags?.isHighlighted ?? false}
                    isSameNumber={flags?.isSameNumber ?? false}
                    cellNotes={notes[row]?.[col] || []}
                    borderRight={col % 3 === 2 && col < 8 ? 2 : 0.5}
                    borderBottom={row % 3 === 2 && row < 8 ? 2 : 0.5}
                    borderLeft={col === 0 ? 2 : 0}
                    borderTop={row === 0 ? 2 : 0}
                    cellTextStyle={styles.cellText}
                    notesGridStyle={styles.notesGrid}
                    noteTextStyle={styles.noteText}
                    baseCellStyle={styles.cell}
                    onPress={handleCellPress}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Number Pad */}
      <View style={styles.numberPad}>
        <View style={styles.numberRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const remaining = remainingCounts[num] || 0;
            const exhausted = showRemainingCounts && remaining <= 0;
            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.numBtn,
                  exhausted && { opacity: 0.3 },
                ]}
                onPress={() => handleNumberPress(num)}
                activeOpacity={0.7}
                disabled={exhausted && !notesMode}
              >
                <Text style={styles.numBtnText}>{num}</Text>
                {showRemainingCounts && (
                  <Text style={styles.numBtnCount}>{remaining}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.toolRow}>
          <TouchableOpacity
            style={[styles.toolBtn, notesMode && { backgroundColor: colors.accent }]}
            onPress={() => { hapticLight(); playGameSound('tap'); setNotesMode(!notesMode); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Toggle notes mode"
            accessibilityState={{ selected: notesMode }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={pencilIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
              <Text style={[styles.toolBtnText, notesMode && { color: colors.overlayText }]}>
                Notes {notesMode ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => { hapticLight(); playGameSound('tap'); handleErase(); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Erase cell">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Image source={eraseIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
              <Text style={styles.toolBtnText}>Erase</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, hintDisabled && { opacity: 0.4 }]}
            onPress={handleHint}
            activeOpacity={0.7}
            disabled={hintDisabled}
          >
            {hintsUsed >= MAX_HINTS ? (
              <Text style={[styles.toolBtnText, { color: colors.textTertiary }]}>No hints left</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Image source={lightbulbIcon} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={[styles.toolBtnText, hintDisabled && { color: colors.textTertiary }]}>Hint ({MAX_HINTS - hintsUsed})</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </View>
    </ImageBackground>
  );
}

// ---------- Styles ----------

function makeStyles(colors: ThemeColors, bottomInset: number, topInset: number, cellSize: number, _gridSize: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    selectContent: {
      paddingBottom: 60 + bottomInset,
      maxWidth: 500,
      alignSelf: 'center' as const,
      width: '100%' as const,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: topInset + 10,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    title: {
      fontSize: 28,
      color: colors.overlayText,
      fontFamily: FONTS.gameHeader,
    },
    selectSubtitle: {
      fontSize: 14,
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

    // Paused
    centeredContent: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      maxWidth: 500,
      alignSelf: 'center' as const,
      width: '100%' as const,
    },
    pauseTitle: {
      fontSize: 26,
      fontFamily: FONTS.extraBold,
      color: colors.overlayText,
      marginBottom: 8,
    },
    pauseSubtitle: {
      fontSize: 17,
      fontFamily: FONTS.regular,
      color: 'rgba(255,255,255,0.7)',
      marginBottom: 32,
    },
    resumeBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 48,
      marginBottom: 12,
      width: '100%',
      alignItems: 'center',
    },
    resumeBtnText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.overlayText,
    },

    // Win
    winContent: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 60 + bottomInset,
      maxWidth: 500,
      alignSelf: 'center' as const,
      width: '100%' as const,
    },
    winHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      paddingTop: topInset + 10,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    winTitle: {
      fontSize: 26,
      fontFamily: FONTS.extraBold,
      color: colors.overlayText,
      marginBottom: 12,
    },
    hardRevealText: {
      fontSize: 14,
      fontFamily: FONTS.regular,
      color: colors.overlaySecondary,
      fontStyle: 'italic',
      marginBottom: 12,
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
      color: colors.overlaySecondary,
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

    // Game Header
    gameHeader: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 8,
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
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    statText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.overlaySecondary,
    },
    statPlaceholder: {
      width: 40,
    },
    timerText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.overlaySecondary,
    },

    // Grid
    gridContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    gridOuter: {
      width: cellSize * 9 + 4,
      borderWidth: 2,
      borderColor: 'rgba(0,0,0,0.3)',
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,245,0.35)',
    },
    gridRow: {
      flexDirection: 'row',
    },
    cell: {
      width: cellSize,
      height: cellSize,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cellText: {
      fontSize: cellSize * 0.5,
      fontFamily: FONTS.regular,
    },
    notesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: cellSize - 4,
      height: cellSize - 4,
    },
    noteText: {
      width: (cellSize - 4) / 3,
      height: (cellSize - 4) / 3,
      fontSize: cellSize * 0.2,
      textAlign: 'center',
      lineHeight: (cellSize - 4) / 3,
    },

    // Number Pad
    numberPad: {
      paddingHorizontal: 16,
      paddingBottom: 16 + bottomInset,
      marginTop: 'auto' as const,
      maxWidth: 600,
      alignSelf: 'center' as const,
      width: '100%' as const,
    },
    numberRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    numBtn: {
      width: (Math.min(Dimensions.get('window').width, 600) - 32 - 32) / 9,
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    numBtnText: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: colors.textPrimary,
    },
    numBtnCount: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 2,
    },
    toolRow: {
      flexDirection: 'row',
      gap: 8,
    },
    toolBtn: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    toolBtnText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
  });
}
