import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import type { ThemeColors } from '../theme/colors';
import {
  generatePuzzle,
  checkComplete,
  type Difficulty,
  type Grid,
} from '../utils/sudoku';

type Props = NativeStackScreenProps<RootStackParamList, 'Sudoku'>;
type GamePhase = 'select' | 'playing' | 'paused' | 'won';

interface SavedGame {
  puzzle: Grid;
  solution: Grid;
  playerGrid: Grid;
  notes: number[][][];
  difficulty: Difficulty;
  mistakes: number;
  elapsed: number;
}

interface DifficultyBest {
  bestTime: number;
  bestMistakes: number;
}

interface BestScores {
  easy?: DifficultyBest;
  medium?: DifficultyBest;
  hard?: DifficultyBest;
}

const GAME_KEY = 'sudokuCurrentGame';
const SCORES_KEY = 'sudokuBestScores';

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; clues: string }> = {
  easy: { label: 'Easy', clues: '46\u201351 clues' },
  medium: { label: 'Medium', clues: '36\u201341 clues' },
  hard: { label: 'Hard', clues: '26\u201331 clues' },
};

const WIN_MESSAGES = [
  "You actually finished it. We're impressed. Mildly.",
  "Your brain cells deserve a vacation after that.",
  "Sudoku master? Let's not get ahead of ourselves.",
  "Zero mistakes? Are you sure you're the same person who forgets alarms?",
  "Even the puzzle is shocked you solved it.",
  "Quick, go set an alarm to remember this moment.",
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getStars(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 3) return 2;
  return 1;
}

function createEmptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => []),
  );
}

// ---------- Main Screen ----------

export default function SudokuScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [gamePhase, setGamePhase] = useState<GamePhase>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [bestScores, setBestScores] = useState<BestScores>({});
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Game state
  const [puzzleGrid, setPuzzleGrid] = useState<Grid>([]);
  const [solutionGrid, setSolutionGrid] = useState<Grid>([]);
  const [playerGrid, setPlayerGrid] = useState<Grid>([]);
  const [notes, setNotes] = useState<number[][][]>(createEmptyNotes());
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [notesMode, setNotesMode] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [finalTime, setFinalTime] = useState(0);
  const [finalMistakes, setFinalMistakes] = useState(0);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const mistakesRef = useRef(0);
  const puzzleRef = useRef<Grid>([]);
  const solutionRef = useRef<Grid>([]);
  const playerRef = useRef<Grid>([]);
  const notesRef = useRef<number[][][]>(createEmptyNotes());
  const difficultyRef = useRef<Difficulty>('medium');

  // Load best scores and check for saved game
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SCORES_KEY).then((data) => {
        if (data) {
          try { setBestScores(JSON.parse(data)); } catch {}
        }
      });
      AsyncStorage.getItem(GAME_KEY).then((data) => {
        setHasSavedGame(!!data);
      });
    }, []),
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveGame = useCallback(() => {
    const saved: SavedGame = {
      puzzle: puzzleRef.current,
      solution: solutionRef.current,
      playerGrid: playerRef.current,
      notes: notesRef.current,
      difficulty: difficultyRef.current,
      mistakes: mistakesRef.current,
      elapsed: elapsedRef.current,
    };
    AsyncStorage.setItem(GAME_KEY, JSON.stringify(saved)).catch(() => {});
  }, []);

  const clearSavedGame = useCallback(() => {
    AsyncStorage.removeItem(GAME_KEY).catch(() => {});
    setHasSavedGame(false);
  }, []);

  const startNewGame = useCallback((diff: Difficulty) => {
    const { puzzle, solution } = generatePuzzle(diff);
    const player = puzzle.map((row) => [...row]);

    puzzleRef.current = puzzle;
    solutionRef.current = solution;
    playerRef.current = player;
    notesRef.current = createEmptyNotes();
    mistakesRef.current = 0;
    elapsedRef.current = 0;
    difficultyRef.current = diff;

    setPuzzleGrid(puzzle);
    setSolutionGrid(solution);
    setPlayerGrid(player);
    setNotes(createEmptyNotes());
    setSelectedCell(null);
    setMistakes(0);
    setElapsed(0);
    setDifficulty(diff);
    setNotesMode(false);
    setGamePhase('playing');
    clearSavedGame();
    startTimer();
  }, [startTimer, clearSavedGame]);

  const resumeGame = useCallback(async () => {
    const data = await AsyncStorage.getItem(GAME_KEY);
    if (!data) return;
    try {
      const saved: SavedGame = JSON.parse(data);
      puzzleRef.current = saved.puzzle;
      solutionRef.current = saved.solution;
      playerRef.current = saved.playerGrid;
      notesRef.current = saved.notes;
      mistakesRef.current = saved.mistakes;
      elapsedRef.current = saved.elapsed;
      difficultyRef.current = saved.difficulty;

      setPuzzleGrid(saved.puzzle);
      setSolutionGrid(saved.solution);
      setPlayerGrid(saved.playerGrid);
      setNotes(saved.notes);
      setMistakes(saved.mistakes);
      setElapsed(saved.elapsed);
      setDifficulty(saved.difficulty);
      setSelectedCell(null);
      setNotesMode(false);
      setGamePhase('playing');
      startTimer();
    } catch {
      clearSavedGame();
    }
  }, [startTimer, clearSavedGame]);

  const handlePause = useCallback(() => {
    stopTimer();
    saveGame();
    setGamePhase('paused');
  }, [stopTimer, saveGame]);

  const handleResume = useCallback(() => {
    startTimer();
    setGamePhase('playing');
  }, [startTimer]);

  const handleBackFromGame = useCallback(() => {
    stopTimer();
    saveGame();
    setHasSavedGame(true);
    setGamePhase('select');
  }, [stopTimer, saveGame]);

  // Remove notes from row/col/box when a number is placed
  const clearNotesForPlacement = useCallback((row: number, col: number, num: number) => {
    const updated = notesRef.current.map((r) => r.map((c) => [...c]));
    for (let c = 0; c < 9; c++) {
      updated[row][c] = updated[row][c].filter((n) => n !== num);
    }
    for (let r = 0; r < 9; r++) {
      updated[r][col] = updated[r][col].filter((n) => n !== num);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        updated[r][c] = updated[r][c].filter((n) => n !== num);
      }
    }
    updated[row][col] = [];
    notesRef.current = updated;
    setNotes(updated);
  }, []);

  const handleNumberPress = useCallback((num: number) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (puzzleRef.current[row][col] !== 0) return;

    if (notesMode) {
      const updated = notesRef.current.map((r) => r.map((c) => [...c]));
      const cellNotes = updated[row][col];
      const idx = cellNotes.indexOf(num);
      if (idx >= 0) {
        cellNotes.splice(idx, 1);
      } else {
        cellNotes.push(num);
        cellNotes.sort();
      }
      notesRef.current = updated;
      setNotes(updated);
      saveGame();
      return;
    }

    // Place number
    const correct = solutionRef.current[row][col];
    const newGrid = playerRef.current.map((r) => [...r]);
    newGrid[row][col] = num;
    playerRef.current = newGrid;
    setPlayerGrid(newGrid);

    clearNotesForPlacement(row, col, num);

    if (num !== correct) {
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
    }

    // Check win
    if (checkComplete(newGrid, solutionRef.current)) {
      stopTimer();
      const time = elapsedRef.current;
      const mist = mistakesRef.current;
      setFinalTime(time);
      setFinalMistakes(mist);
      setWinMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);
      clearSavedGame();

      AsyncStorage.getItem(SCORES_KEY).then((data) => {
        const scores: BestScores = data ? JSON.parse(data) : {};
        const diff = difficultyRef.current;
        const current = scores[diff];
        const isBetter = !current
          || time < current.bestTime
          || (time === current.bestTime && mist < current.bestMistakes);
        if (isBetter) {
          scores[diff] = { bestTime: time, bestMistakes: mist };
          AsyncStorage.setItem(SCORES_KEY, JSON.stringify(scores));
          setBestScores({ ...scores });
        }
      }).catch(() => {});

      setTimeout(() => setGamePhase('won'), 400);
      return;
    }

    saveGame();
  }, [selectedCell, notesMode, stopTimer, saveGame, clearSavedGame, clearNotesForPlacement]);

  const handleErase = useCallback(() => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (puzzleRef.current[row][col] !== 0) return;

    const newGrid = playerRef.current.map((r) => [...r]);
    newGrid[row][col] = 0;
    playerRef.current = newGrid;
    setPlayerGrid(newGrid);

    const updated = notesRef.current.map((r) => r.map((c) => [...c]));
    updated[row][col] = [];
    notesRef.current = updated;
    setNotes(updated);

    saveGame();
  }, [selectedCell, saveGame]);

  const handleNewGameConfirm = useCallback(() => {
    Alert.alert('New Game', 'Start a new puzzle? Current progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        onPress: () => {
          stopTimer();
          clearSavedGame();
          setGamePhase('select');
        },
      },
    ]);
  }, [stopTimer, clearSavedGame]);

  // Count remaining for each number (used on Easy only)
  const remainingCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) counts[n] = 9;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = playerGrid[r]?.[c];
        if (v && v >= 1 && v <= 9) counts[v]--;
      }
    }
    return counts;
  }, [playerGrid]);

  // Difficulty-aware helpers
  const showErrors = difficulty !== 'hard';
  const showHighlighting = difficulty !== 'hard';
  const showRemainingCounts = difficulty === 'easy';
  const showMistakesDuringPlay = difficulty !== 'hard';

  const isWrongNumber = useCallback((row: number, col: number): boolean => {
    if (!showErrors) return false;
    if (!solutionGrid[row]) return false;
    const val = playerGrid[row]?.[col];
    if (!val || val === 0) return false;
    if (puzzleGrid[row]?.[col] !== 0) return false;
    return val !== solutionGrid[row][col];
  }, [playerGrid, puzzleGrid, solutionGrid, showErrors]);

  const isHighlighted = useCallback((row: number, col: number): boolean => {
    if (!showHighlighting) return false;
    if (!selectedCell) return false;
    const [sr, sc] = selectedCell;
    if (row === sr || col === sc) return true;
    if (Math.floor(row / 3) === Math.floor(sr / 3) && Math.floor(col / 3) === Math.floor(sc / 3)) return true;
    return false;
  }, [selectedCell, showHighlighting]);

  const isSameNumber = useCallback((row: number, col: number): boolean => {
    if (!showHighlighting) return false;
    if (!selectedCell) return false;
    const [sr, sc] = selectedCell;
    const selVal = playerGrid[sr]?.[sc];
    if (!selVal || selVal === 0) return false;
    return playerGrid[row]?.[col] === selVal;
  }, [selectedCell, playerGrid, showHighlighting]);

  // ---------- Styles ----------

  const { width: screenWidth } = Dimensions.get('window');
  const GRID_SIZE = Math.min(screenWidth - 32, 380);
  const CELL_SIZE = Math.floor(GRID_SIZE / 9);

  const styles = useMemo(
    () => makeStyles(colors, insets.bottom, CELL_SIZE, GRID_SIZE),
    [colors, insets.bottom, CELL_SIZE, GRID_SIZE],
  );

  // ---------- Render: Difficulty Select ----------

  if (gamePhase === 'select') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.selectContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{'\u{1F522}'} Sudoku</Text>
          <Text style={styles.selectSubtitle}>Classic number puzzle. No forgetting allowed.</Text>
        </View>

        {hasSavedGame && (
          <TouchableOpacity
            style={[styles.difficultyBtn, { borderColor: colors.accent, borderWidth: 2 }]}
            onPress={resumeGame}
            activeOpacity={0.7}
          >
            <Text style={styles.difficultyLabel}>{'\u25B6\uFE0F'} Continue Game</Text>
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
            >
              <Text style={styles.difficultyLabel}>{config.label}</Text>
              <Text style={styles.difficultyInfo}>{config.clues}</Text>
              {best ? (
                <Text style={styles.bestScoreText}>
                  {'\u{1F3C6}'} Best: {formatTime(best.bestTime)} ({best.bestMistakes} mistake{best.bestMistakes !== 1 ? 's' : ''})
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

  // ---------- Render: Paused ----------

  if (gamePhase === 'paused') {
    return (
      <View style={[styles.container, styles.centeredContent]}>
        <Text style={styles.pauseEmoji}>{'\u23F8\uFE0F'}</Text>
        <Text style={styles.pauseTitle}>Paused</Text>
        <Text style={styles.pauseSubtitle}>{formatTime(elapsed)}</Text>
        <TouchableOpacity style={styles.resumeBtn} onPress={handleResume} activeOpacity={0.7}>
          <Text style={styles.resumeBtnText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changeDifficultyBtn}
          onPress={() => { clearSavedGame(); setGamePhase('select'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.changeDifficultyText}>Quit Game</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- Render: Won ----------

  if (gamePhase === 'won') {
    const stars = getStars(finalMistakes);
    const isHard = difficulty === 'hard';
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.winContent}>
        <Text style={styles.winEmoji}>{'\u{1F389}'}</Text>
        <Text style={styles.winTitle}>Puzzle Complete!</Text>

        {isHard && (
          <Text style={styles.hardRevealText}>Let's see how you actually did...</Text>
        )}

        <Text style={styles.starsText}>{'\u2B50'.repeat(stars)}</Text>

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
          onPress={() => startNewGame(difficulty)}
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.gameHeader}>
        <View style={styles.gameHeaderRow}>
          <TouchableOpacity onPress={handleBackFromGame} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.gameDifficulty}>{DIFFICULTY_CONFIG[difficulty].label}</Text>
        </View>
        <View style={styles.statsRow}>
          {showMistakesDuringPlay ? (
            <Text style={styles.statText}>
              {'\u274C'} {mistakes}
            </Text>
          ) : (
            <View style={styles.statPlaceholder} />
          )}
          <TouchableOpacity onPress={handlePause} activeOpacity={0.7}>
            <Text style={styles.timerText}>{'\u23F1\uFE0F'} {formatTime(elapsed)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNewGameConfirm} activeOpacity={0.7}>
            <Text style={[styles.statText, { color: colors.accent }]}>{'\u{1F504}'} New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridOuter}>
          {Array.from({ length: 9 }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: 9 }, (_, col) => {
                const isGiven = puzzleGrid[row]?.[col] !== 0;
                const value = playerGrid[row]?.[col] || 0;
                const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;
                const isWrong = isWrongNumber(row, col);
                const highlighted = isHighlighted(row, col);
                const sameNum = isSameNumber(row, col);
                const cellNotes = notes[row]?.[col] || [];

                const borderRight = col % 3 === 2 && col < 8 ? 2 : 0.5;
                const borderBottom = row % 3 === 2 && row < 8 ? 2 : 0.5;
                const borderLeft = col === 0 ? 2 : 0;
                const borderTop = row === 0 ? 2 : 0;

                let bgColor = colors.card;
                if (isSelected) bgColor = colors.accent;
                else if (sameNum) bgColor = colors.activeBackground;
                else if (highlighted) bgColor = colors.background;

                let textColor = colors.textPrimary;
                if (isSelected) textColor = colors.overlayText;
                else if (isWrong) textColor = colors.red;
                else if (!isGiven && value !== 0) textColor = colors.accent;

                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setSelectedCell([row, col])}
                    activeOpacity={0.8}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: bgColor,
                        borderRightWidth: borderRight,
                        borderBottomWidth: borderBottom,
                        borderLeftWidth: borderLeft,
                        borderTopWidth: borderTop,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {value !== 0 ? (
                      <Text
                        style={[
                          styles.cellText,
                          {
                            color: textColor,
                            fontWeight: isGiven ? '700' : '500',
                          },
                        ]}
                      >
                        {value}
                      </Text>
                    ) : cellNotes.length > 0 ? (
                      <View style={styles.notesGrid}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <Text
                            key={n}
                            style={[
                              styles.noteText,
                              { color: cellNotes.includes(n) ? colors.textSecondary : 'transparent' },
                            ]}
                          >
                            {n}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </TouchableOpacity>
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
            onPress={() => setNotesMode(!notesMode)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, notesMode && { color: colors.overlayText }]}>
              {'\u270F\uFE0F'} Notes {notesMode ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={handleErase} activeOpacity={0.7}>
            <Text style={styles.toolBtnText}>{'\u232B'} Erase</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------- Styles ----------

function makeStyles(colors: ThemeColors, bottomInset: number, cellSize: number, _gridSize: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    selectContent: {
      paddingBottom: 60 + bottomInset,
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

    // Paused
    centeredContent: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    pauseEmoji: {
      fontSize: 64,
      marginBottom: 12,
    },
    pauseTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    pauseSubtitle: {
      fontSize: 18,
      color: colors.textSecondary,
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
      fontSize: 16,
      fontWeight: '700',
      color: colors.overlayText,
    },

    // Win
    winContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 60 + bottomInset,
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
    hardRevealText: {
      fontSize: 15,
      color: colors.textTertiary,
      fontStyle: 'italic',
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
      fontSize: 16,
      fontWeight: '600',
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
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    statText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    statPlaceholder: {
      width: 40,
    },
    timerText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Grid
    gridContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    gridOuter: {
      width: cellSize * 9 + 4,
      borderWidth: 2,
      borderColor: colors.textSecondary,
      borderRadius: 4,
      overflow: 'hidden',
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
    },
    numberRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    numBtn: {
      width: (Dimensions.get('window').width - 32 - 32) / 9,
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    numBtnText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    numBtnCount: {
      fontSize: 10,
      color: colors.textTertiary,
      marginTop: 2,
    },
    toolRow: {
      flexDirection: 'row',
      gap: 12,
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
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
}
