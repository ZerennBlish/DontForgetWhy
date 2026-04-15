import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  ImageBackground,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import { GameNavButtons } from '../components/GameNavButtons';
import APP_ICONS from '../data/appIconAssets';
import type { RootStackParamList } from '../navigation/types';
import { YEARLY_RIDDLES } from '../data/riddles';
import { useDailyRiddle, getFormattedDate, difficultyColor } from '../hooks/useDailyRiddle';
import { isProUser } from '../services/proStatus';
import ProGate from '../components/ProGate';
import useEntitlement from '../hooks/useEntitlement';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyRiddle'>;

export default function DailyRiddleScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    mode, setMode,
    dailyRiddle, stats, revealed, answered, resultMessage,
    alreadyPlayedToday, revealAnim,
    onlineRiddles, onlineLoading, onlineError,
    expandedOnlineId, setExpandedOnlineId,
    handleReveal, handleAnswer, handleFetchOnlineRiddles,
  } = useDailyRiddle();

  const [proGateVisible, setProGateVisible] = useState(false);
  const entitlement = useEntitlement();

  const handleBonusTabPress = () => {
    hapticLight();
    playGameSound('tap');
    if (isProUser()) {
      setMode('browse');
    } else {
      setProGateVisible(true);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        scrollContent: {
          paddingBottom: 60 + insets.bottom,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 4,
        },
        title: {
          fontSize: 28,
          color: colors.overlayText,
          fontFamily: FONTS.gameHeader,
        },
        dateText: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.overlaySecondary,
          marginTop: 4,
          textAlign: 'center',
        },
        streakRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 8,
          gap: 6,
        },
        streakText: {
          fontSize: 14,
          fontFamily: FONTS.bold,
          color: colors.orange,
        },
        statsRow: {
          flexDirection: 'row',
          gap: 16,
          marginTop: 4,
        },
        statText: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.overlaySecondary,
        },

        // Daily riddle area (no card box — question floats over background)
        riddleCard: {
          marginHorizontal: 16,
          marginTop: 12,
          padding: 24,
        },
        badgeRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
        },
        difficultyBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        },
        difficultyBadgeText: {
          fontSize: 12,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
        },
        categoryBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: colors.activeBackground,
        },
        categoryBadgeText: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textSecondary,
        },
        questionText: {
          fontSize: 20,
          fontFamily: FONTS.semiBold,
          color: colors.overlayText,
          fontStyle: 'italic',
          lineHeight: 32,
          textAlign: 'center',
          marginVertical: 8,
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        },
        // Reveal section
        answerSection: {
          marginTop: 20,
          alignItems: 'center',
        },
        answerDivider: {
          width: 60,
          height: 2,
          backgroundColor: colors.border,
          borderRadius: 1,
          marginBottom: 16,
        },
        answerText: {
          fontSize: 18,
          fontFamily: FONTS.extraBold,
          color: colors.accent,
          textAlign: 'center',
        },
        didYouGetIt: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.overlaySecondary,
          marginTop: 16,
          marginBottom: 12,
        },
        answerBtnRow: {
          flexDirection: 'row',
          gap: 12,
          width: '100%',
        },
        gotItBtn: {
          flex: 1,
          backgroundColor: colors.success,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        gotItBtnText: {
          fontSize: 15,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
        },
        nopeBtn: {
          flex: 1,
          backgroundColor: colors.red,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        nopeBtnText: {
          fontSize: 15,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
        },
        resultText: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.overlaySecondary,
          fontStyle: 'italic',
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 22,
        },

        // Reveal button
        revealBtn: {
          marginHorizontal: 16,
          marginTop: 16,
          backgroundColor: colors.accent,
          borderRadius: 16,
          paddingVertical: 18,
          alignItems: 'center',
        },
        revealBtnText: {
          fontSize: 17,
          fontFamily: FONTS.bold,
          color: colors.overlayText,
        },

        // Browse mode
        modeToggle: {
          flexDirection: 'row',
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        modeBtn: {
          flex: 1,
          paddingVertical: 12,
          alignItems: 'center',
        },
        modeBtnActive: {
          backgroundColor: colors.accent,
        },
        modeBtnText: {
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          color: colors.textSecondary,
        },
        modeBtnTextActive: {
          color: colors.textPrimary,
        },
        proBadge: {
          backgroundColor: colors.accent,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          marginLeft: 4,
        },
        proBadgeText: {
          fontSize: 9,
          fontFamily: FONTS.bold,
          color: '#FFFFFF',
          letterSpacing: 0.5,
        },
        browseCount: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 4,
        },

        // Already played today
        alreadyPlayed: {
          alignItems: 'center',
          paddingTop: 8,
        },
        alreadyPlayedText: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          fontStyle: 'italic',
        },

        // Online riddle cards
        onlineCard: {
          marginHorizontal: 16,
          marginTop: 10,
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        },
        onlineBadge: {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 10,
          backgroundColor: colors.activeBackground,
          marginBottom: 8,
        },
        onlineBadgeText: {
          fontSize: 11,
          fontFamily: FONTS.semiBold,
          color: colors.textTertiary,
        },
        onlineQuestion: {
          fontSize: 15,
          fontFamily: FONTS.regular,
          color: colors.textPrimary,
          fontStyle: 'italic',
          lineHeight: 24,
        },
        onlineAnswer: {
          fontSize: 14,
          fontFamily: FONTS.bold,
          color: colors.accent,
          marginTop: 12,
        },
        onlineTapHint: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          marginTop: 8,
          fontStyle: 'italic',
        },

        // Load more button
        loadMoreBtn: {
          marginHorizontal: 16,
          marginTop: 16,
          backgroundColor: colors.card,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.accent,
        },
        loadMoreText: {
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          color: colors.accent,
        },

        // Loading & error
        loadingContainer: {
          alignItems: 'center',
          paddingVertical: 40,
        },
        loadingText: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          marginTop: 12,
        },
        errorText: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          marginHorizontal: 16,
          marginTop: 16,
          textAlign: 'center',
          lineHeight: 20,
        },
      }),
    [colors, insets.bottom],
  );

  // ─── Render: Daily Mode ────────────────────────────────────────────────

  const renderDaily = () => {
    return (
      <>
        <View style={styles.riddleCard}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: difficultyColor(dailyRiddle.difficulty) },
              ]}
            >
              <Text style={styles.difficultyBadgeText}>
                {dailyRiddle.difficulty.charAt(0).toUpperCase() +
                  dailyRiddle.difficulty.slice(1)}
              </Text>
            </View>
            <View style={[styles.categoryBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Text style={styles.categoryBadgeText}>
                {dailyRiddle.category}
              </Text>
            </View>
          </View>

          <Text style={styles.questionText}>
            {'\u201C'}{dailyRiddle.question}{'\u201D'}
          </Text>

          {revealed && (
            <Animated.View
              accessibilityLiveRegion="polite"
              style={[
                styles.answerSection,
                {
                  opacity: alreadyPlayedToday ? 1 : revealAnim,
                  transform: [
                    {
                      translateY: alreadyPlayedToday
                        ? 0
                        : revealAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.answerDivider} />
              <Text style={styles.answerText}>{dailyRiddle.answer}</Text>

              {!answered && !alreadyPlayedToday ? (
                <>
                  <Text style={styles.didYouGetIt}>Did you get it?</Text>
                  <View style={styles.answerBtnRow}>
                    <TouchableOpacity
                      style={styles.gotItBtn}
                      onPress={() => { playGameSound('triviaCorrect'); handleAnswer(true); }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="I got it"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Image source={APP_ICONS.win} style={{ width: 22, height: 22 }} resizeMode="contain" />
                        <Text style={styles.gotItBtnText}>Got it!</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.nopeBtn}
                      onPress={() => { playGameSound('triviaWrong'); handleAnswer(false); }}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="I didn't get it"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Image source={APP_ICONS.loss} style={{ width: 22, height: 22 }} resizeMode="contain" />
                        <Text style={styles.nopeBtnText}>Nope</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
              ) : answered || alreadyPlayedToday ? (
                <>
                  {resultMessage ? (
                    <Text style={styles.resultText}>
                      {'\u201C'}{resultMessage}{'\u201D'}
                    </Text>
                  ) : (
                    <View style={[styles.alreadyPlayed, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                      <Image source={require('../../assets/icons/icon-win.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                      <Text style={styles.alreadyPlayedText}>
                        You already played today!
                      </Text>
                    </View>
                  )}
                </>
              ) : null}
            </Animated.View>
          )}
        </View>

        {!revealed && !alreadyPlayedToday && (
          <TouchableOpacity
            style={styles.revealBtn}
            onPress={() => { hapticLight(); playGameSound('tap'); handleReveal(); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Reveal answer"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image source={require('../../assets/icons/icon-magnify.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={styles.revealBtnText}>Reveal Answer</Text>
            </View>
          </TouchableOpacity>
        )}
      </>
    );
  };

  // ─── Render: Browse Mode ───────────────────────────────────────────────

  const renderBrowse = () => (
    <>
      {onlineLoading && onlineRiddles.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Fetching fresh riddles...</Text>
        </View>
      ) : onlineError && onlineRiddles.length === 0 ? (
        <>
          <Text style={styles.errorText}>
            Couldn't fetch new riddles. Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => { hapticLight(); playGameSound('tap'); handleFetchOnlineRiddles(); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.loadMoreText}>Try Again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.browseCount}>
            {onlineRiddles.length} fresh riddle{onlineRiddles.length !== 1 ? 's' : ''}
          </Text>

          {onlineRiddles.map((riddle) => {
            const isExpanded = expandedOnlineId === riddle.id;
            return (
              <TouchableOpacity
                key={riddle.id}
                style={styles.onlineCard}
                onPress={() => {
                  hapticLight();
                  playGameSound('tap');
                  setExpandedOnlineId(isExpanded ? null : riddle.id);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Online riddle: ${riddle.question}`}
              >
                <View style={[styles.onlineBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Image source={require('../../assets/icons/icon-globe.webp')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                  <Text style={styles.onlineBadgeText}>Online</Text>
                </View>
                <Text style={styles.onlineQuestion}>
                  {'\u201C'}{riddle.question}{'\u201D'}
                </Text>
                {isExpanded ? (
                  <Text style={styles.onlineAnswer}>{riddle.answer}</Text>
                ) : (
                  <Text style={styles.onlineTapHint}>Tap to reveal answer</Text>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => { hapticLight(); playGameSound('tap'); handleFetchOnlineRiddles(); }}
            activeOpacity={0.7}
            disabled={onlineLoading}
            accessibilityRole="button"
            accessibilityLabel="Load more riddles"
          >
            {onlineLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>

          {onlineError && onlineRiddles.length > 0 && (
            <Text style={styles.errorText}>
              Some riddles couldn't be loaded. Try again later.
            </Text>
          )}
        </>
      )}
    </>
  );

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <ImageBackground source={require('../../assets/door.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <GameNavButtons topOffset={insets.top + 10} />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Image source={require('../../assets/icons/icon-lightbulb.webp')} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>
      <Text style={[styles.title, { textAlign: 'center', marginTop: 0 }]}>Daily Riddle</Text>
      <Text style={[styles.dateText, { paddingHorizontal: 20 }]}>{getFormattedDate()}</Text>

      {stats.streak > 0 && (
        <View style={[styles.streakRow, { paddingHorizontal: 20 }]} accessibilityLiveRegion="polite">
          <Image source={require('../../assets/icons/icon-fire.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
          <Text style={styles.streakText}>{stats.streak} day streak</Text>
        </View>
      )}

      {stats.totalPlayed > 0 && (
        <View style={[styles.statsRow, { paddingHorizontal: 20 }]}>
          <Text style={styles.statText}>
            Played: {stats.totalPlayed}
          </Text>
          <Text style={styles.statText}>
            Correct: {stats.totalCorrect}
          </Text>
          <Text style={styles.statText}>
            Seen: {stats.seenRiddleIds.length}/{YEARLY_RIDDLES.length}
          </Text>
        </View>
      )}

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'daily' && styles.modeBtnActive]}
          onPress={() => { hapticLight(); playGameSound('tap'); setMode('daily'); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Today's riddle"
          accessibilityState={{ selected: mode === 'daily' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Image source={require('../../assets/icons/icon-star.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text
              style={[
                styles.modeBtnText,
                mode === 'daily' && styles.modeBtnTextActive,
              ]}
            >
              Today
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'browse' && styles.modeBtnActive]}
          onPress={handleBonusTabPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Bonus riddles (Pro)"
          accessibilityState={{ selected: mode === 'browse' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Image source={require('../../assets/icons/icon-books.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text
              style={[
                styles.modeBtnText,
                mode === 'browse' && styles.modeBtnTextActive,
              ]}
            >
              Bonus Riddles
            </Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {mode === 'daily' ? renderDaily() : renderBrowse()}
    </ScrollView>
    {proGateVisible && (
      <ProGate
        visible={proGateVisible}
        onClose={() => setProGateVisible(false)}
        isPro={entitlement.isPro}
        loading={entitlement.loading}
        error={entitlement.error}
        productPrice={entitlement.productPrice}
        onPurchase={entitlement.purchase}
        onRestore={entitlement.restore}
      />
    )}
    </View>
    </ImageBackground>
  );
}
