import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  ImageBackground,
  Image,
  ImageSourcePropType,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import type { RootStackParamList } from '../navigation/types';
import { RIDDLES, CATEGORY_LABELS } from '../data/riddles';
import { useDailyRiddle, ALL_CATEGORIES, getFormattedDate, difficultyColor } from '../hooks/useDailyRiddle';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyRiddle'>;

const RIDDLE_CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  memory: require('../../assets/trivia/trivia-general.webp'),
  classic: require('../../assets/trivia/trivia-history.webp'),
  wordplay: require('../../assets/icons/icon-wordplay.webp'),
  logic: require('../../assets/icons/icon-puzzle.webp'),
  quick: require('../../assets/icons/icon-quick.webp'),
};

export default function DailyRiddleScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    mode, setMode,
    dailyRiddle, stats, revealed, answered, resultMessage, gotIt,
    hintShown, alreadyPlayedToday, revealAnim,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    expandedRiddleId, setExpandedRiddleId,
    filteredRiddles,
    browseSource, setBrowseSource,
    onlineRiddles, onlineLoading, onlineError,
    expandedOnlineId, setExpandedOnlineId,
    isOnlineAvailable,
    handleReveal, handleAnswer, handleShowHint, handleFetchOnlineRiddles,
  } = useDailyRiddle();

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
        headerBack: {
          position: 'absolute',
          left: 20,
          top: insets.top + 10,
          zIndex: 10,
        },
        headerHome: {
          position: 'absolute',
          left: 64,
          top: insets.top + 10,
          zIndex: 10,
        },
        title: {
          fontSize: 28,
          color: colors.overlayText,
          fontFamily: FONTS.gameHeader,
        },
        dateText: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: 'rgba(255,255,255,0.5)',
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
          color: 'rgba(255,255,255,0.5)',
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
          color: '#FFFFFF',
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
          color: '#FFFFFF',
          fontStyle: 'italic',
          lineHeight: 32,
          textAlign: 'center',
          marginVertical: 8,
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        },
        hintBtn: {
          alignSelf: 'center',
          marginTop: 12,
          paddingVertical: 8,
          paddingHorizontal: 16,
        },
        hintBtnText: {
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: FONTS.semiBold,
        },
        hintText: {
          fontSize: 13,
          color: colors.accent,
          fontFamily: FONTS.semiBold,
          textAlign: 'center',
          marginTop: 8,
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
          color: 'rgba(255,255,255,0.5)',
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
          backgroundColor: '#4CAF50',
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        gotItBtnText: {
          fontSize: 15,
          fontFamily: FONTS.bold,
          color: '#FFFFFF',
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
          color: '#FFFFFF',
        },
        resultText: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: 'rgba(255,255,255,0.7)',
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

        // Browse button
        browseBtn: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        browseBtnText: {
          fontSize: 15,
          fontFamily: FONTS.semiBold,
          color: colors.accent,
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
        searchInput: {
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.border,
        },
        filterRow: {
          flexDirection: 'row',
          marginHorizontal: 16,
          marginTop: 12,
          gap: 8,
          flexWrap: 'wrap',
        },
        filterBtn: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        filterBtnActive: {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
        },
        filterBtnText: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textSecondary,
        },
        filterBtnTextActive: {
          color: colors.textPrimary,
        },
        browseCard: {
          marginHorizontal: 16,
          marginTop: 10,
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        },
        browseCardRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        browseSeenIcon: {
          fontSize: 16,
          color: '#4CAF50',
        },
        browseQuestion: {
          flex: 1,
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.textPrimary,
          lineHeight: 22,
        },
        browseChevron: {
          fontSize: 16,
          color: colors.textTertiary,
        },
        browseBadgeRow: {
          flexDirection: 'row',
          gap: 6,
          marginTop: 8,
        },
        browseAnswer: {
          fontSize: 14,
          fontFamily: FONTS.bold,
          color: colors.accent,
          marginTop: 12,
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

        // Browse source toggle
        sourceToggle: {
          flexDirection: 'row',
          marginHorizontal: 16,
          marginTop: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        sourceBtn: {
          flex: 1,
          paddingVertical: 10,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        },
        sourceBtnActive: {
          backgroundColor: colors.accent,
        },
        sourceBtnDisabled: {
          opacity: 0.4,
        },
        sourceBtnText: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textSecondary,
        },
        sourceBtnTextActive: {
          color: colors.textPrimary,
        },
        sourceBtnIcon: {
          fontSize: 14,
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
        noInternetText: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          fontStyle: 'italic',
          marginHorizontal: 16,
          marginTop: 4,
        },
      }),
    [colors, insets.bottom],
  );

  // ─── Render: Daily Mode ────────────────────────────────────────────────

  const renderDaily = () => {
    const hintLetter = dailyRiddle.answer.charAt(0).toUpperCase();

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
              {RIDDLE_CATEGORY_IMAGES[dailyRiddle.category] && (
                <Image source={RIDDLE_CATEGORY_IMAGES[dailyRiddle.category]} style={{ width: 14, height: 14 }} resizeMode="contain" />
              )}
              <Text style={styles.categoryBadgeText}>
                {CATEGORY_LABELS[dailyRiddle.category]}
              </Text>
            </View>
          </View>

          <Text style={styles.questionText}>
            {'\u201C'}{dailyRiddle.question}{'\u201D'}
          </Text>

          {!revealed && !alreadyPlayedToday && (
            <>
              {!hintShown ? (
                <TouchableOpacity
                  style={[styles.hintBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  onPress={() => { hapticLight(); playGameSound('tap'); handleShowHint(); }}
                  activeOpacity={0.7}
                >
                  <Image source={require('../../assets/icons/icon-lightbulb.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  <Text style={styles.hintBtnText}>Need a hint?</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.hintText}>
                  Starts with "{hintLetter}"
                </Text>
              )}
            </>
          )}

          {revealed && (
            <Animated.View
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
                      onPress={() => handleAnswer(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.gotItBtnText}>
                        {'\u2705'} Got it!
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.nopeBtn}
                      onPress={() => handleAnswer(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.nopeBtnText}>
                        {'\u274C'} Nope
                      </Text>
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
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image source={require('../../assets/icons/icon-magnify.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={styles.revealBtnText}>Reveal Answer</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => { hapticLight(); playGameSound('tap'); setMode('browse'); }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('../../assets/icons/icon-books.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text style={styles.browseBtnText}>Browse All Riddles</Text>
          </View>
        </TouchableOpacity>

      </>
    );
  };

  // ─── Render: Browse Mode ───────────────────────────────────────────────

  const renderBrowse = () => {
    const seenSet = new Set(stats.seenRiddleIds);
    return (
      <>
        {/* Source toggle: Offline Bank / Fresh Riddles (online disabled — coming soon) */}
        <View style={styles.sourceToggle}>
          <TouchableOpacity
            style={[styles.sourceBtn, styles.sourceBtnActive]}
            activeOpacity={1}
          >
            <Image source={require('../../assets/icons/icon-phone.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text style={[styles.sourceBtnText, styles.sourceBtnTextActive]}>
              Offline Bank
            </Text>
          </TouchableOpacity>
          <View
            style={[styles.sourceBtn, { opacity: 0.4 }]}
            pointerEvents="none"
          >
            <Image source={require('../../assets/icons/icon-globe.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text style={[styles.sourceBtnText, { color: colors.textTertiary }]}>
              Fresh Riddles
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary, fontStyle: 'italic', marginHorizontal: 16, marginTop: 4 }}>
          Online riddles coming soon
        </Text>

        {browseSource === 'offline' ? (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Search riddles..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterRow, { paddingHorizontal: 16 }]}
            >
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  selectedCategory === 'all' && styles.filterBtnActive,
                ]}
                onPress={() => { hapticLight(); playGameSound('tap'); setSelectedCategory('all'); }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    selectedCategory === 'all' && styles.filterBtnTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {ALL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterBtn,
                    selectedCategory === cat && styles.filterBtnActive,
                  ]}
                  onPress={() => { hapticLight(); playGameSound('tap'); setSelectedCategory(cat); }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {RIDDLE_CATEGORY_IMAGES[cat] && (
                      <Image source={RIDDLE_CATEGORY_IMAGES[cat]} style={{ width: 24, height: 24 }} resizeMode="contain" />
                    )}
                    <Text
                      style={[
                        styles.filterBtnText,
                        selectedCategory === cat && styles.filterBtnTextActive,
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.browseCount}>
              {filteredRiddles.length} riddle{filteredRiddles.length !== 1 ? 's' : ''}
            </Text>

            {filteredRiddles.map((riddle) => {
              const isExpanded = expandedRiddleId === riddle.id;
              const isSeen = seenSet.has(riddle.id);
              return (
                <TouchableOpacity
                  key={riddle.id}
                  style={styles.browseCard}
                  onPress={() => {
                    hapticLight();
                    playGameSound('tap');
                    setExpandedRiddleId(isExpanded ? null : riddle.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.browseCardRow}>
                    {isSeen && (
                      <Text style={styles.browseSeenIcon}>{'\u2705'}</Text>
                    )}
                    <Text
                      style={styles.browseQuestion}
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {riddle.question}
                    </Text>
                    <Text style={styles.browseChevron}>
                      {isExpanded ? '\u2304' : '\u203A'}
                    </Text>
                  </View>
                  <View style={styles.browseBadgeRow}>
                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: difficultyColor(riddle.difficulty) },
                      ]}
                    >
                      <Text style={styles.difficultyBadgeText}>
                        {riddle.difficulty.charAt(0).toUpperCase() +
                          riddle.difficulty.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {CATEGORY_LABELS[riddle.category]}
                      </Text>
                    </View>
                  </View>
                  {isExpanded && (
                    <Text style={styles.browseAnswer}>{riddle.answer}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <>
            {/* Online riddles */}
            {onlineLoading && onlineRiddles.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Fetching fresh riddles...</Text>
              </View>
            ) : onlineError && onlineRiddles.length === 0 ? (
              <>
                <Text style={styles.errorText}>
                  Couldn't fetch new riddles. Check your connection or browse the offline bank.
                </Text>
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => { hapticLight(); playGameSound('tap'); handleFetchOnlineRiddles(); }}
                  activeOpacity={0.7}
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
        )}
      </>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <ImageBackground source={require('../../assets/door.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <View style={styles.headerBack}>
      <BackButton onPress={() => navigation.goBack()} forceDark />
    </View>
    <View style={styles.headerHome}>
      <HomeButton forceDark />
    </View>
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
        <View style={[styles.streakRow, { paddingHorizontal: 20 }]}>
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
            Seen: {stats.seenRiddleIds.length}/{RIDDLES.length}
          </Text>
        </View>
      )}

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'daily' && styles.modeBtnActive]}
          onPress={() => { hapticLight(); playGameSound('tap'); setMode('daily'); }}
          activeOpacity={0.7}
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
          onPress={() => { hapticLight(); playGameSound('tap'); setMode('browse'); }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Image source={require('../../assets/icons/icon-books.webp')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text
              style={[
                styles.modeBtnText,
                mode === 'browse' && styles.modeBtnTextActive,
              ]}
            >
              Browse All
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {mode === 'daily' ? renderDaily() : renderBrowse()}
    </ScrollView>
    </View>
    </ImageBackground>
  );
}
