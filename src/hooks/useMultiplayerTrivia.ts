import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { listenToGame, type MultiplayerGame } from '../services/multiplayer';
import {
  startTriviaGame,
  submitAnswer as submitAnswerService,
  advanceToNextQuestion as advanceService,
  leaveTriviaGame as leaveService,
  type TriviaMultiplayerGame,
  type TriviaPlayer,
  type TriviaLastAnswer,
  type TriviaPhase,
  type TriviaStatus,
} from '../services/multiplayerTrivia';
import { getCurrentUser } from '../services/firebaseAuth';
import { playGameSound } from '../utils/gameSounds';
import type { TriviaQuestion } from '../types/trivia';

const QUESTION_TIMER_SECONDS = 15;
const RESULT_DISPLAY_SECONDS = 3;

interface UseMultiplayerTriviaParams {
  gameCode: string;
  onGameEnd?: () => void;
}

interface UseMultiplayerTriviaReturn {
  players: TriviaPlayer[];
  myIndex: number;
  isHost: boolean;
  status: TriviaStatus | null;
  phase: TriviaPhase | null;
  category: string;

  currentQuestion: TriviaQuestion | null;
  currentQuestionNumber: number;
  totalQuestions: number;
  activePlayerIndex: number;
  isMyTurn: boolean;
  timeRemaining: number;
  attemptsThisQuestion: string[];

  lastAnswer: TriviaLastAnswer | null;
  winner: string | null;
  isConnected: boolean;

  handleSubmitAnswer: (answer: string) => void;
  handleAdvance: () => void;
  handleLeave: () => void;
  handleStart: () => void;
}

export function useMultiplayerTrivia({
  gameCode,
  onGameEnd,
}: UseMultiplayerTriviaParams): UseMultiplayerTriviaReturn {
  const myUid = useMemo(() => getCurrentUser()?.uid ?? '', []);

  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<TriviaPlayer[]>([]);
  const [hostUid, setHostUid] = useState<string>('');
  const [status, setStatus] = useState<TriviaStatus | null>(null);
  const [phase, setPhase] = useState<TriviaPhase | null>(null);
  const [category, setCategory] = useState<string>('');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [attemptsThisQuestion, setAttemptsThisQuestion] = useState<string[]>([]);
  const [lastAnswer, setLastAnswer] = useState<TriviaLastAnswer | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIMER_SECONDS);

  const onGameEndRef = useRef<typeof onGameEnd>(onGameEnd);
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const endedRef = useRef(false);
  const prevAnswerKeyRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myIndex = useMemo(
    () => players.findIndex((p) => p.uid === myUid),
    [players, myUid],
  );
  const isHost = !!myUid && hostUid === myUid;
  const isMyTurn =
    !!myUid &&
    players.length > activePlayerIndex &&
    players[activePlayerIndex]?.uid === myUid;
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions = questions.length;
  const currentQuestionNumber =
    totalQuestions === 0
      ? 0
      : Math.min(currentQuestionIndex + 1, totalQuestions);

  // ── Firestore subscription ───────────────────────────────────────
  useEffect(() => {
    const unsub = listenToGame(gameCode, (game: MultiplayerGame | null) => {
      if (!game) {
        setIsConnected(false);
        return;
      }
      const trivia = game as unknown as TriviaMultiplayerGame;
      if (trivia.type !== 'trivia') {
        setIsConnected(false);
        return;
      }
      setIsConnected(true);

      setHostUid(trivia.host?.uid ?? '');
      setPlayers(trivia.triviaPlayers ?? []);
      setStatus(trivia.status);
      setPhase(trivia.phase);
      setCategory(trivia.category ?? '');
      setQuestions(trivia.questions ?? []);
      setCurrentQuestionIndex(trivia.currentQuestionIndex ?? 0);
      setActivePlayerIndex(trivia.activePlayerIndex ?? 0);
      setAttemptsThisQuestion(trivia.attemptsThisQuestion ?? []);
      setLastAnswer(trivia.lastAnswer ?? null);
      setWinner(trivia.winner ?? null);

      // Sound on new answer event
      if (trivia.lastAnswer) {
        const key = `${trivia.lastAnswer.uid}|${trivia.lastAnswer.answer}|${trivia.currentQuestionIndex}`;
        if (key !== prevAnswerKeyRef.current) {
          prevAnswerKeyRef.current = key;
          playGameSound(
            trivia.lastAnswer.correct ? 'triviaCorrect' : 'triviaWrong',
          );
        }
      } else {
        // lastAnswer was cleared — allow the next answer key to re-fire.
        prevAnswerKeyRef.current = '';
      }

      // Final phase
      if (trivia.phase === 'final' && !endedRef.current) {
        endedRef.current = true;
        const iWon = !!trivia.winner && trivia.winner === myUid;
        playGameSound(iWon ? 'gameWin' : 'gameLoss');
        onGameEndRef.current?.();
      }
    });
    return () => unsub();
  }, [gameCode, myUid]);

  // ── Question timer ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeRemaining(QUESTION_TIMER_SECONDS);
      return;
    }
    setTimeRemaining(QUESTION_TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (isMyTurn) {
            submitAnswerService(gameCode, '').catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, activePlayerIndex, currentQuestionIndex, isMyTurn, gameCode]);

  // ── Host auto-advance after result display ──────────────────────
  useEffect(() => {
    if (phase !== 'result') {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      return;
    }
    if (!isHost) return;
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      advanceService(gameCode).catch((e) =>
        console.warn('[useMultiplayerTrivia] advance failed:', e),
      );
    }, RESULT_DISPLAY_SECONDS * 1000);
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [phase, isHost, gameCode]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSubmitAnswer = useCallback(
    (answer: string) => {
      if (!isMyTurn || phase !== 'question') return;
      playGameSound('tap');
      submitAnswerService(gameCode, answer).catch((e) =>
        console.warn('[useMultiplayerTrivia] submitAnswer failed:', e),
      );
    },
    [isMyTurn, phase, gameCode],
  );

  const handleAdvance = useCallback(() => {
    if (!isHost || phase !== 'result') return;
    advanceService(gameCode).catch((e) =>
      console.warn('[useMultiplayerTrivia] advance failed:', e),
    );
  }, [isHost, phase, gameCode]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave game?',
      status === 'active'
        ? 'You will forfeit this game.'
        : 'You will leave this game.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            leaveService(gameCode).catch((e) =>
              console.warn('[useMultiplayerTrivia] leave failed:', e),
            );
          },
        },
      ],
    );
  }, [gameCode, status]);

  const handleStart = useCallback(() => {
    if (!isHost) return;
    startTriviaGame(gameCode).catch((e) => {
      const msg = e instanceof Error ? e.message : 'Failed to start';
      Alert.alert('Cannot start', msg);
    });
  }, [isHost, gameCode]);

  return {
    players,
    myIndex,
    isHost,
    status,
    phase,
    category,
    currentQuestion,
    currentQuestionNumber,
    totalQuestions,
    activePlayerIndex,
    isMyTurn,
    timeRemaining,
    attemptsThisQuestion,
    lastAnswer,
    winner,
    isConnected,
    handleSubmitAnswer,
    handleAdvance,
    handleLeave,
    handleStart,
  };
}
