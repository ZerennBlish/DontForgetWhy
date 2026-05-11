import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticHeavy, hapticLight, hapticMedium } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { useMultiplayerDiceGame } from '../hooks/useMultiplayerDiceGame';
import { leaveDiceGame } from '../services/multiplayerDice';
import {
  ALL_CATEGORIES,
  CATEGORY_DISPLAY_NAMES,
  LOWER_CATEGORIES,
  MAX_ROLLS,
  MAX_ROUNDS,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  UPPER_CATEGORIES,
  type ScoringCategory,
} from '../services/diceGameTypes';
import {
  calculateTotal,
  getUpperSubtotal,
  hasUpperBonus,
} from '../services/diceGameScoring';
import {
  DICE_BACKGROUND,
  getDieFace,
  getDiceTheme,
} from '../data/diceAssets';

const EXIT_TITLES = [
  'Abandoning the table?',
  'Rolling away so soon?',
  'The dice are judging you.',
  'Bowing out?',
];
const EXIT_MESSAGES = [
  'Your scorecard stays exactly where it is. Embarrassing.',
  "Everyone else is still playing. You're the weak link.",
  'The dice never forget. Neither will the group chat.',
  'Quitting mid-roll. Bold move.',
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface MultiplayerDiceGameProps {
  code: string;
  onExit: () => void;
}

export default function MultiplayerDiceGame({
  code,
  onExit,
}: MultiplayerDiceGameProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mp = useMultiplayerDiceGame({ gameCode: code, onGameEnd: onExit });

  const [exitTitle] = useState(() => pickRandom(EXIT_TITLES));
  const [exitMessage] = useState(() => pickRandom(EXIT_MESSAGES));

  const diceTheme = getDiceTheme();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [opponentModalUid, setOpponentModalUid] = useState<string | null>(null);

  // ── Track changes for sound + haptic side effects ─────────────────────────
  const prevDiceKeyRef = useRef('');
  const prevStealClaimRef = useRef('');
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mp.game) return;
    const diceKey = mp.game.dice.join('-');
    if (
      diceKey !== prevDiceKeyRef.current &&
      mp.game.dice.some((d) => d !== 0)
    ) {
      if (prevDiceKeyRef.current !== '') {
        void playGameSound('tap');
        hapticLight();
      }
      prevDiceKeyRef.current = diceKey;
    } else if (diceKey !== prevDiceKeyRef.current) {
      prevDiceKeyRef.current = diceKey;
    }
  }, [mp.game]);

  useEffect(() => {
    if (!mp.game) return;
    const claim = mp.game.stealClaim;
    const claimKey = claim ? claim.stealerUid : '';
    if (claimKey !== prevStealClaimRef.current && claimKey !== '') {
      void playGameSound('capture');
      hapticHeavy();
    }
    prevStealClaimRef.current = claimKey;
  }, [mp.game]);

  useEffect(() => {
    if (!mp.game) return;
    if (
      mp.game.status === 'finished' &&
      prevStatusRef.current !== 'finished'
    ) {
      const iWon =
        !!mp.game.result?.winnerUid && mp.game.result.winnerUid === mp.myUid;
      void playGameSound(iWon ? 'gameWin' : 'gameLoss');
      if (iWon) hapticMedium();
      else hapticHeavy();
    }
    prevStatusRef.current = mp.game.status;
  }, [mp.game, mp.myUid]);

  // ── Exit guard during active play ─────────────────────────────────────────
  const bypassExitRef = useRef(false);
  const exitedRef = useRef(false);
  const isActive = !!mp.game && mp.game.status === 'active';

  useEffect(() => {
    if (!isActive) return;
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (bypassExitRef.current) return;
      if (mp.game?.status === 'finished') return;
      e.preventDefault();
      Alert.alert(exitTitle, exitMessage, [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'I Quit',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveDiceGame(code, mp.myUid);
            } catch {
              // ignore
            }
            bypassExitRef.current = true;
            exitedRef.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsub;
  }, [isActive, mp.game?.status, exitTitle, exitMessage, code, mp.myUid, navigation]);

  // ── Sound + haptic wrappers around hook actions ───────────────────────────

  const handleRoll = () => {
    hapticLight();
    void playGameSound('tap');
    mp.roll();
  };

  const handleToggle = (i: number) => {
    hapticLight();
    void playGameSound('tap');
    mp.toggleHold(i);
  };

  const handleScore = (cat: ScoringCategory) => {
    hapticMedium();
    void playGameSound('chessPlace');
    mp.score(cat);
  };

  const handleSteal = () => {
    hapticHeavy();
    void playGameSound('capture');
    mp.steal();
  };

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave game?',
      isActive ? 'You will forfeit this game.' : 'Leave this lobby.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            if (exitedRef.current) {
              onExit();
              return;
            }
            exitedRef.current = true;
            mp.leave();
            onExit();
          },
        },
      ],
    );
  }, [isActive, mp, onExit]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, paddingHorizontal: 16 },
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        muted: {
          color: colors.overlayText,
          fontSize: 14,
          fontFamily: FONTS.regular,
        },
        warning: {
          color: colors.red,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
          marginVertical: 4,
        },
        round: {
          color: colors.overlayText,
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
          marginTop: 4,
        },
        miniCardsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
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
        miniCardBadge: {
          fontSize: 9,
          fontFamily: FONTS.bold,
          color: colors.orange,
          textAlign: 'center',
          marginTop: 2,
        },
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
        categoryLabel: {
          color: colors.textPrimary,
          fontSize: 13,
          fontFamily: FONTS.regular,
          flex: 1,
        },
        scoreValue: {
          color: colors.textPrimary,
          fontSize: 13,
          fontFamily: FONTS.bold,
          minWidth: 36,
          textAlign: 'right',
        },
        scoreValuePreview: { color: colors.accent, opacity: 0.6 },
        scoreValueZero: { color: colors.textTertiary },
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
        bonusEarned: { color: colors.accent, fontFamily: FONTS.bold },
        bonusPending: { color: colors.textTertiary },
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
          opacity: 0.8,
        },
        holdLabel: {
          marginTop: 2,
          fontSize: 9,
          color: colors.accent,
          fontFamily: FONTS.bold,
          textAlign: 'center',
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
        turnStatus: {
          marginTop: 10,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.card,
          alignItems: 'center',
        },
        turnStatusText: {
          color: colors.textSecondary,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
        },
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
        leaveBtn: {
          alignSelf: 'center',
          marginTop: 14,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 16,
          backgroundColor: colors.red + '30',
        },
        leaveBtnText: {
          color: colors.red,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
        },
        gameOverCard: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 24,
          marginTop: 24,
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
        primaryBtn: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 16,
        },
        primaryBtnText: {
          color: colors.overlayText,
          fontFamily: FONTS.bold,
          fontSize: 15,
        },
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
    [colors, insets.bottom],
  );

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!mp.isConnected) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Connecting…</Text>
      </View>
    );
  }
  if (!mp.game) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading game…</Text>
      </View>
    );
  }

  // ── Inner renderers ───────────────────────────────────────────────────────

  const renderMiniCards = () => {
    if (mp.opponents.length === 0) return null;
    return (
      <View style={styles.miniCardsRow}>
        {mp.opponents.map((p) => {
          const sc = mp.game?.scorecards[p.uid];
          const bonus = mp.game?.yahtzeeBonuses[p.uid] ?? 0;
          const total = sc ? calculateTotal(sc, bonus) : 0;
          const isCurrent = mp.game?.currentPlayerUid === p.uid;
          return (
            <TouchableOpacity
              key={p.uid}
              style={[
                styles.miniCard,
                isCurrent && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => {
                hapticLight();
                void playGameSound('tap');
                setOpponentModalUid(p.uid);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${p.displayName}, score ${total}`}
            >
              <Text style={styles.miniCardName} numberOfLines={1}>
                {p.displayName}
              </Text>
              <Text style={styles.miniCardScore}>{total}</Text>
              {mp.game?.stealUsed[p.uid] && (
                <Text style={styles.miniCardBadge}>USED</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderScoreRow = (cat: ScoringCategory) => {
    const v = mp.myScorecard[cat];
    const isFilled = v !== null;
    const preview = !isFilled
      ? mp.possibleScores.find((p) => p.category === cat)?.score
      : undefined;
    const tappable = !isFilled && mp.canScore;
    const labelText = CATEGORY_DISPLAY_NAMES[cat];
    let valueText: string;
    let valueStyle: object;
    if (isFilled) {
      valueText = String(v);
      valueStyle =
        v === 0
          ? [styles.scoreValue, styles.scoreValueZero]
          : styles.scoreValue;
    } else if (preview !== undefined) {
      valueText = String(preview);
      valueStyle = [styles.scoreValue, styles.scoreValuePreview];
    } else {
      valueText = '—';
      valueStyle = [styles.scoreValue, styles.scoreValueZero];
    }
    const accessibilityLabel = isFilled
      ? `${labelText}, scored ${v}`
      : tappable
        ? `${labelText}, would score ${preview ?? 0}, tap to fill`
        : `${labelText}, unfilled`;
    const inner = (
      <View style={styles.scoreRow}>
        <Text style={styles.categoryLabel}>{labelText}</Text>
        <Text style={valueStyle as object}>{valueText}</Text>
      </View>
    );
    if (!tappable) {
      return (
        <View key={cat} accessible accessibilityLabel={accessibilityLabel}>
          {inner}
        </View>
      );
    }
    return (
      <TouchableOpacity
        key={cat}
        onPress={() => handleScore(cat)}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </TouchableOpacity>
    );
  };

  const renderYourScorecard = () => {
    const upperSubtotal = getUpperSubtotal(mp.myScorecard);
    const bonusEarned = hasUpperBonus(mp.myScorecard);
    return (
      <View style={styles.yourCard}>
        <Text style={styles.yourCardHeader}>UPPER</Text>
        {UPPER_CATEGORIES.map((cat) => renderScoreRow(cat))}
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
        {LOWER_CATEGORIES.map((cat) => renderScoreRow(cat))}
        {mp.myYahtzeeBonus > 0 && (
          <View style={styles.subtotalRow}>
            <Text style={[styles.subtotalText, styles.bonusEarned]}>
              Yahtzee Bonus ×{mp.myYahtzeeBonus}
            </Text>
            <Text style={[styles.subtotalText, styles.bonusEarned]}>
              +{mp.myYahtzeeBonus * 100}
            </Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{mp.myTotal}</Text>
        </View>
      </View>
    );
  };

  const renderDiceTray = () => {
    const dice = mp.game?.dice ?? [0, 0, 0, 0, 0];
    const held = mp.game?.held ?? [false, false, false, false, false];
    return (
      <ImageBackground
        source={DICE_BACKGROUND}
        style={styles.diceTray}
        imageStyle={{ borderRadius: 12 }}
        resizeMode="cover"
      >
        <View style={styles.diceRow}>
          {dice.map((d, i) => {
            const isHeld = held[i];
            const canTap =
              mp.isMyTurn &&
              !mp.game?.stealWindowActive &&
              (mp.game?.rollsRemaining ?? MAX_ROLLS) < MAX_ROLLS;
            return (
              <View key={i} style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.die, isHeld && styles.dieHeld]}
                  onPress={() => handleToggle(i)}
                  disabled={!canTap}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Die ${i + 1}, value ${d === 0 ? 'unrolled' : d}, ${isHeld ? 'held' : 'not held'}`}
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
      </ImageBackground>
    );
  };

  const renderRollButton = () => {
    if (!mp.isMyTurn) return null;
    const showPickPrompt = mp.canScore && !mp.canRoll;
    const label = showPickPrompt
      ? 'Pick a category above'
      : `Roll (${mp.game?.rollsRemaining ?? MAX_ROLLS} left)`;
    return (
      <TouchableOpacity
        style={[styles.rollButton, !mp.canRoll && styles.rollButtonDisabled]}
        onPress={handleRoll}
        disabled={!mp.canRoll}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Roll dice, ${mp.game?.rollsRemaining ?? 0} rolls remaining`}
      >
        <Text style={styles.rollButtonText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderTurnStatus = () => {
    if (mp.isMyTurn) return null;
    return (
      <View style={styles.turnStatus}>
        <Text style={styles.turnStatusText}>
          {mp.currentPlayerName || 'Opponent'} is rolling…
        </Text>
      </View>
    );
  };

  const renderStealOverlay = () => {
    if (!mp.game?.stealWindowActive) return null;
    const seconds = (mp.stealTimeRemaining / 1000).toFixed(1);
    const victimUid = mp.game.lastScoredPlayerUid;
    const victim = mp.game.playerDetails.find((p) => p.uid === victimUid);
    const points = mp.game.lastScoredValue ?? 0;
    const stealLabel = mp.canHumanSteal
      ? `STEAL ${points} from ${victim?.displayName ?? 'opponent'}`
      : mp.game.stealClaim
        ? 'Already claimed'
        : `Can't steal this one`;
    return (
      <View style={styles.stealOverlay}>
        <Text style={styles.stealTitle}>
          {victim
            ? `${victim.displayName} scored ${points}!`
            : 'Score posted'}
        </Text>
        <Text style={styles.stealTimer}>{seconds}s left</Text>
        <TouchableOpacity
          style={[
            styles.stealButton,
            !mp.canHumanSteal && styles.stealButtonDisabled,
          ]}
          onPress={handleSteal}
          disabled={!mp.canHumanSteal}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={stealLabel}
        >
          <Text style={styles.stealButtonText}>{stealLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOpponentModal = () => {
    if (!opponentModalUid || !mp.game) return null;
    const p = mp.game.playerDetails.find((x) => x.uid === opponentModalUid);
    if (!p) return null;
    const sc = mp.game.scorecards[p.uid] ?? null;
    if (!sc) return null;
    const bonus = mp.game.yahtzeeBonuses[p.uid] ?? 0;
    const upperSubtotal = getUpperSubtotal(sc);
    const bonusEarned = hasUpperBonus(sc);
    const total = calculateTotal(sc, bonus);
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setOpponentModalUid(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{p.displayName}</Text>
            <ScrollView>
              {ALL_CATEGORIES.map((cat) => {
                const v = sc[cat];
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
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{total}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOpponentModalUid(null)}
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

  const renderGameOver = () => {
    const result = mp.game?.result;
    if (!result || !mp.game) return null;
    const winnerName =
      result.winnerUid
        ? mp.game.playerDetails.find((p) => p.uid === result.winnerUid)
            ?.displayName ?? 'Winner'
        : null;
    return (
      <View style={styles.gameOverCard}>
        <Text style={styles.gameOverTitle}>
          {result.isTie
            ? 'It’s a tie!'
            : result.winnerUid === mp.myUid
              ? 'You win!'
              : `${winnerName ?? 'Opponent'} wins`}
        </Text>
        {result.rankings.map((r, idx) => {
          const p = mp.game?.playerDetails.find((x) => x.uid === r.uid);
          return (
            <View key={r.uid} style={styles.rankingRow}>
              <Text style={styles.rankingName}>
                #{idx + 1}  {p?.displayName ?? r.uid}
                {r.uid === mp.myUid ? ' (you)' : ''}
              </Text>
              <Text style={styles.rankingScore}>{r.total}</Text>
            </View>
          );
        })}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            hapticLight();
            void playGameSound('tap');
            onExit();
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
        >
          <Text style={styles.primaryBtnText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Body ──────────────────────────────────────────────────────────────────

  if (mp.game.status === 'finished') {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {renderGameOver()}
      </ScrollView>
    );
  }

  // status === 'active' (lobby/waiting handled by parent screen)
  return (
    <View style={styles.root}>
      {!mp.isConnected && (
        <Text style={styles.warning}>Reconnecting…</Text>
      )}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200 + insets.bottom }}
      >
        <Text style={styles.round}>
          Round {mp.game.round} / {MAX_ROUNDS}
        </Text>
        {renderMiniCards()}
        {renderYourScorecard()}
        {renderDiceTray()}
        {renderRollButton()}
        {renderTurnStatus()}
        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={handleLeave}
          accessibilityRole="button"
          accessibilityLabel="Leave game"
        >
          <Text style={styles.leaveBtnText}>Leave Game</Text>
        </TouchableOpacity>
      </ScrollView>
      {renderStealOverlay()}
      {renderOpponentModal()}
    </View>
  );
}
