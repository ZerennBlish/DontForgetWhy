import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { kvGet, kvSet, kvRemove } from '../services/database';
import { safeParse } from '../utils/safeParse';
import { withLock } from '../utils/asyncMutex';
import { useFocusEffect } from '@react-navigation/native';
import { hapticMedium } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import {
  generatePuzzle,
  checkComplete,
  type Difficulty,
  type Grid,
} from '../utils/sudoku';

type GamePhase = 'select' | 'playing' | 'paused' | 'won';

interface SavedGame {
  puzzle: Grid;
  solution: Grid;
  playerGrid: Grid;
  notes: number[][][];
  difficulty: Difficulty;
  mistakes: number;
  elapsed: number;
  hintsUsed?: number;
}

function isValidSavedGame(obj: unknown): obj is SavedGame {
  if (typeof obj !== 'object' || !obj) return false;
  const g = obj as Record<string, unknown>;
  return (
    Array.isArray(g.puzzle) &&
    g.puzzle.length === 9 &&
    Array.isArray(g.solution) &&
    g.solution.length === 9 &&
    Array.isArray(g.playerGrid) &&
    g.playerGrid.length === 9 &&
    typeof g.difficulty === 'string' &&
    typeof g.elapsed === 'number'
  );
}

interface DifficultyBest {
  bestTime: number;
  bestMistakes: number;
  bestHints?: number;
  gamesPlayed?: number;
}

interface BestScores {
  easy?: DifficultyBest;
  medium?: DifficultyBest;
  hard?: DifficultyBest;
}

const GAME_KEY = 'sudokuCurrentGame';
const SCORES_KEY = 'sudokuBestScores';

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string }> = {
  easy: { label: 'Easy' },
  medium: { label: 'Medium' },
  hard: { label: 'Hard' },
};

const WIN_MESSAGES = [
  "You actually finished it. We're impressed. Mildly.",
  "Your brain cells deserve a vacation after that.",
  "Sudoku master? Let's not get ahead of ourselves.",
  "Zero mistakes? Are you sure you're the same person who forgets alarms?",
  "Even the puzzle is shocked you solved it.",
  "Quick, go set an alarm to remember this moment.",
];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getStars(mistakes: number, hints: number = 0): number {
  let stars: number;
  if (mistakes === 0) stars = 3;
  else if (mistakes <= 3) stars = 2;
  else stars = 1;

  // Hint penalty
  if (hints >= 3) stars = Math.max(1, stars - 1);
  else if (hints >= 1) stars = Math.max(1, Math.floor(stars - 0.5));

  return stars;
}

export const MAX_HINTS = 5;

function createEmptyNotes(): number[][][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => []),
  );
}

export interface SudokuCellFlags {
  isHighlighted: boolean;
  isSameNumber: boolean;
}

interface UseSudokuResult {
  // Game phase
  gamePhase: GamePhase;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  saveGameState: () => void;

  // Difficulty & scores
  difficulty: Difficulty;
  bestScores: BestScores;
  hasSavedGame: boolean;

  // Grid state
  puzzleGrid: Grid;
  playerGrid: Grid;
  notes: number[][][];
  selectedCell: [number, number] | null;
  setSelectedCell: React.Dispatch<React.SetStateAction<[number, number] | null>>;

  // Stats
  mistakes: number;
  elapsed: number;
  hintsUsed: number;
  notesMode: boolean;
  setNotesMode: React.Dispatch<React.SetStateAction<boolean>>;

  // Win state
  winMessage: string;
  finalTime: number;
  finalMistakes: number;
  finalHints: number;

  // Computed
  remainingCounts: Record<number, number>;
  showRemainingCounts: boolean;
  showMistakesDuringPlay: boolean;
  hintDisabled: boolean;
  cellFlags: SudokuCellFlags[][];

  // Callbacks
  startNewGame: (diff: Difficulty) => void;
  resumeGame: () => Promise<void>;
  handlePause: () => void;
  handleResume: () => void;
  handleBackFromGame: () => void;
  handleNumberPress: (num: number) => void;
  handleErase: () => void;
  handleHint: () => void;
  handleNewGameConfirm: () => void;
  clearSavedGame: () => void;
}

export function useSudoku(): UseSudokuResult {
  const [gamePhase, setGamePhase] = useState<GamePhase>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [bestScores, setBestScores] = useState<BestScores>({});
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Game state
  const [puzzleGrid, setPuzzleGrid] = useState<Grid>([]);
  const [playerGrid, setPlayerGrid] = useState<Grid>([]);
  const [notes, setNotes] = useState<number[][][]>(createEmptyNotes());
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [notesMode, setNotesMode] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [finalTime, setFinalTime] = useState(0);
  const [finalMistakes, setFinalMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [finalHints, setFinalHints] = useState(0);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const mistakesRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const puzzleRef = useRef<Grid>([]);
  const solutionRef = useRef<Grid>([]);
  const playerRef = useRef<Grid>([]);
  const notesRef = useRef<number[][][]>(createEmptyNotes());
  const difficultyRef = useRef<Difficulty>('medium');

  // Load best scores, settings, and check for saved game
  useFocusEffect(
    useCallback(() => {
      const scoresData = kvGet(SCORES_KEY);
      if (__DEV__) console.log('[Sudoku] loaded scores from storage:', scoresData);
      if (scoresData) {
        try { setBestScores(safeParse(scoresData, {})); } catch (e) {
          console.error('[Sudoku] parse scores failed:', e);
        }
      }
      setHasSavedGame(!!kvGet(GAME_KEY));
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
      hintsUsed: hintsUsedRef.current,
    };
    try { kvSet(GAME_KEY, JSON.stringify(saved)); } catch {}
  }, []);

  const clearSavedGame = useCallback(() => {
    try { kvRemove(GAME_KEY); } catch {}
    setHasSavedGame(false);
  }, []);

  // Serialized read-modify-write against the sudokuBestScores KV value.
  // Without the lock, two concurrent win callbacks could both read the
  // same baseline and one write could overwrite the other's stats bump.
  const recordWin = useCallback(async (diff: Difficulty, time: number, mist: number, hints: number) => {
    await withLock('sudoku-scores', async () => {
      try {
        const data = kvGet(SCORES_KEY);
        const scores: BestScores = safeParse(data, {});
        const current = scores[diff];
        const gamesPlayed = (current?.gamesPlayed ?? 0) + 1;
        const isBetter = !current
          || time < current.bestTime
          || (time === current.bestTime && mist < current.bestMistakes);
        if (isBetter) {
          scores[diff] = { bestTime: time, bestMistakes: mist, bestHints: hints, gamesPlayed };
        } else {
          scores[diff] = { ...current!, gamesPlayed };
        }
        kvSet(SCORES_KEY, JSON.stringify(scores));
        setBestScores({ ...scores });
      } catch (e) {
        console.error('[Sudoku] save scores failed:', e);
      }
    });
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
    hintsUsedRef.current = 0;
    difficultyRef.current = diff;

    setPuzzleGrid(puzzle);
    setPlayerGrid(player);
    setNotes(createEmptyNotes());
    setSelectedCell(null);
    setMistakes(0);
    setElapsed(0);
    setHintsUsed(0);
    setDifficulty(diff);
    setNotesMode(false);
    setGamePhase('playing');
    clearSavedGame();
    startTimer();
  }, [startTimer, clearSavedGame]);

  const resumeGame = useCallback(async () => {
    const data = kvGet(GAME_KEY);
    if (!data) return;
    try {
      const saved = safeParse<SavedGame | null>(data, null);
      if (!saved || !isValidSavedGame(saved)) {
        console.warn('[Sudoku] Invalid saved game, starting fresh');
        return;
      }
      puzzleRef.current = saved.puzzle;
      solutionRef.current = saved.solution;
      playerRef.current = saved.playerGrid;
      notesRef.current = saved.notes;
      mistakesRef.current = saved.mistakes;
      elapsedRef.current = saved.elapsed;
      hintsUsedRef.current = saved.hintsUsed ?? 0;
      difficultyRef.current = saved.difficulty;

      setPuzzleGrid(saved.puzzle);
      setPlayerGrid(saved.playerGrid);
      setNotes(saved.notes);
      setMistakes(saved.mistakes);
      setElapsed(saved.elapsed);
      setHintsUsed(saved.hintsUsed ?? 0);
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

  // Persist game state without touching React state. Callable from a
  // beforeRemove handler that's letting navigation through (e.g. Home
  // button), where triggering state updates on an unmounting screen
  // is wasteful.
  const saveGameState = useCallback(() => {
    stopTimer();
    saveGame();
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
    hapticMedium();

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
      playGameSound('sudokuPencil');
      saveGame();
      return;
    }

    // Place number
    const correct = solutionRef.current[row][col];
    const newGrid = playerRef.current.map((r) => [...r]);
    newGrid[row][col] = num;
    playerRef.current = newGrid;
    setPlayerGrid(newGrid);
    playGameSound('sudokuPencil');

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
      const hints = hintsUsedRef.current;
      setFinalTime(time);
      setFinalMistakes(mist);
      setFinalHints(hints);
      setWinMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);
      clearSavedGame();

      const diff = difficultyRef.current;
      if (__DEV__) console.log('[Sudoku] game won — saving stats for', diff);
      recordWin(diff, time, mist, hints);

      setTimeout(() => setGamePhase('won'), 400);
      return;
    }

    saveGame();
  }, [selectedCell, notesMode, stopTimer, saveGame, clearSavedGame, clearNotesForPlacement, recordWin]);

  const handleErase = useCallback(() => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (puzzleRef.current[row][col] !== 0) return;

    const hadValue = playerRef.current[row][col] !== 0;
    const hadNotes = notesRef.current[row][col].length > 0;
    if (!hadValue && !hadNotes) return;

    const newGrid = playerRef.current.map((r) => [...r]);
    newGrid[row][col] = 0;
    playerRef.current = newGrid;
    setPlayerGrid(newGrid);

    const updated = notesRef.current.map((r) => r.map((c) => [...c]));
    updated[row][col] = [];
    notesRef.current = updated;
    setNotes(updated);

    playGameSound('sudokuErase');
    saveGame();
  }, [selectedCell, saveGame]);

  const handleHint = useCallback(() => {
    if (hintsUsedRef.current >= MAX_HINTS) return;

    // Find all empty cells the player hasn't filled
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzleRef.current[r][c] === 0 && playerRef.current[r][c] === 0) {
          emptyCells.push([r, c]);
        }
      }
    }
    if (emptyCells.length === 0) return;

    // Pick a random empty cell
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const correctNum = solutionRef.current[row][col];

    try { hapticMedium(); } catch {}

    // Place the correct number and mark cell as given
    const newPuzzle = puzzleRef.current.map((r) => [...r]);
    newPuzzle[row][col] = correctNum;
    puzzleRef.current = newPuzzle;
    setPuzzleGrid(newPuzzle);

    const newGrid = playerRef.current.map((r) => [...r]);
    newGrid[row][col] = correctNum;
    playerRef.current = newGrid;
    setPlayerGrid(newGrid);

    clearNotesForPlacement(row, col, correctNum);

    hintsUsedRef.current += 1;
    setHintsUsed(hintsUsedRef.current);

    // Check win after hint
    if (checkComplete(newGrid, solutionRef.current)) {
      stopTimer();
      const time = elapsedRef.current;
      const mist = mistakesRef.current;
      const hints = hintsUsedRef.current;
      setFinalTime(time);
      setFinalMistakes(mist);
      setFinalHints(hints);
      setWinMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);
      clearSavedGame();

      const diff = difficultyRef.current;
      if (__DEV__) console.log('[Sudoku] game won via hint — saving stats for', diff);
      recordWin(diff, time, mist, hints);

      setTimeout(() => setGamePhase('won'), 400);
      return;
    }

    setSelectedCell([row, col]);
    saveGame();
  }, [stopTimer, saveGame, clearSavedGame, clearNotesForPlacement, recordWin]);

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
  const showHighlighting = difficulty !== 'hard';
  const showRemainingCounts = difficulty === 'easy';
  const showMistakesDuringPlay = difficulty !== 'hard';

  const hasEmptyCells = useMemo(() => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzleGrid[r]?.[c] === 0 && playerGrid[r]?.[c] === 0) return true;
      }
    }
    return false;
  }, [puzzleGrid, playerGrid]);

  const hintDisabled = hintsUsed >= MAX_HINTS || !hasEmptyCells;

  // Pre-compute the highlight flags for every cell once per
  // (selectedCell, playerGrid, showHighlighting) change. The screen
  // reads from this 9×9 array instead of recomputing flags per cell on
  // every render — critical because the timer ticks every second and
  // would otherwise re-run the highlight logic across the whole grid.
  const cellFlags = useMemo<SudokuCellFlags[][]>(() => {
    const flags: SudokuCellFlags[][] = [];
    const canHighlight = showHighlighting && !!selectedCell;
    const sr = selectedCell?.[0] ?? -1;
    const sc = selectedCell?.[1] ?? -1;
    const selVal = canHighlight ? playerGrid[sr]?.[sc] ?? 0 : 0;
    for (let r = 0; r < 9; r++) {
      const row: SudokuCellFlags[] = [];
      for (let c = 0; c < 9; c++) {
        let isHighlighted = false;
        let isSameNumber = false;
        if (canHighlight) {
          if (r === sr || c === sc) {
            isHighlighted = true;
          } else if (
            Math.floor(r / 3) === Math.floor(sr / 3) &&
            Math.floor(c / 3) === Math.floor(sc / 3)
          ) {
            isHighlighted = true;
          }
          if (selVal !== 0 && playerGrid[r]?.[c] === selVal) {
            isSameNumber = true;
          }
        }
        row.push({ isHighlighted, isSameNumber });
      }
      flags.push(row);
    }
    return flags;
  }, [selectedCell, playerGrid, showHighlighting]);

  return {
    // Game phase
    gamePhase,
    setGamePhase,
    saveGameState,

    // Difficulty & scores
    difficulty,
    bestScores,
    hasSavedGame,

    // Grid state
    puzzleGrid,
    playerGrid,
    notes,
    selectedCell,
    setSelectedCell,

    // Stats
    mistakes,
    elapsed,
    hintsUsed,
    notesMode,
    setNotesMode,

    // Win state
    winMessage,
    finalTime,
    finalMistakes,
    finalHints,

    // Computed
    remainingCounts,
    showRemainingCounts,
    showMistakesDuringPlay,
    hintDisabled,
    cellFlags,

    // Callbacks
    startNewGame,
    resumeGame,
    handlePause,
    handleResume,
    handleBackFromGame,
    handleNumberPress,
    handleErase,
    handleHint,
    handleNewGameConfirm,
    clearSavedGame,
  };
}
