import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useAppIcon } from '../hooks/useAppIcon';
import { hapticLight } from '../utils/haptics';
import { playGameSound } from '../utils/gameSounds';
import type { TriviaParentCategory, TriviaSubcategory } from '../types/trivia';
import { PARENT_TO_SUBS, SUBCATEGORY_LABELS } from '../types/trivia';
import {
  getQuestionsForCategory,
  getQuestionsForSubcategory,
} from '../data/triviaBank';

const PARENT_IMAGES: Record<TriviaParentCategory, ImageSourcePropType> = {
  general: require('../../assets/trivia/trivia-general.webp'),
  popCulture: require('../../assets/trivia/popcorn_bucket.webp'),
  scienceTech: require('../../assets/trivia/trivia-science.webp'),
  historyPolitics: require('../../assets/trivia/trivia-history.webp'),
  geography: require('../../assets/trivia/trivia-geography.webp'),
  sportsLeisure: require('../../assets/trivia/recliner_512.webp'),
  gamingGeek: require('../../assets/trivia/d20_die.webp'),
  mythFiction: require('../../assets/trivia/scroll_icon.webp'),
};

const SUBCATEGORY_IMAGES: Record<TriviaSubcategory, ImageSourcePropType> = {
  generalKnowledge: require('../../assets/trivia/trivia-general.webp'),
  film: require('../../assets/trivia/trivia-movies.webp'),
  music: require('../../assets/trivia/trivia-music.webp'),
  television: require('../../assets/trivia/crt_tv_icon.webp'),
  celebrities: require('../../assets/trivia/walk_of_fame_star.webp'),
  scienceNature: require('../../assets/trivia/trivia-science.webp'),
  computers: require('../../assets/trivia/trivia-technology.webp'),
  gadgets: require('../../assets/trivia/lightbulb_icon.webp'),
  mathematics: require('../../assets/trivia/chalkboard_icon.webp'),
  history: require('../../assets/trivia/trivia-history.webp'),
  politics: require('../../assets/trivia/gavel_icon.webp'),
  art: require('../../assets/trivia/paint_palette.webp'),
  geography: require('../../assets/trivia/trivia-geography.webp'),
  sports: require('../../assets/trivia/trivia-sports.webp'),
  boardGames: require('../../assets/trivia/board_game_pawn_monocle.webp'),
  vehicles: require('../../assets/trivia/beat_up_car.webp'),
  videoGames: require('../../assets/trivia/game_controller.webp'),
  comicsAnime: require('../../assets/trivia/explosion_speech_bubble.webp'),
  mythologyBooks: require('../../assets/trivia/scroll_icon.webp'),
};

const PARENT_LABELS: Record<TriviaParentCategory, string> = {
  general: 'General Knowledge',
  popCulture: 'Pop Culture',
  scienceTech: 'Science & Tech',
  historyPolitics: 'History & Politics',
  geography: 'Geography',
  sportsLeisure: 'Sports & Leisure',
  gamingGeek: 'Gaming & Geek',
  mythFiction: 'Myth & Fiction',
};

interface SubcategoryPickerModalProps {
  visible: boolean;
  category: TriviaParentCategory;
  onSelect: (subcategory: TriviaSubcategory | 'all') => void;
  onClose: () => void;
}

interface SubInfo {
  key: TriviaSubcategory;
  label: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
}

export default function SubcategoryPickerModal({
  visible,
  category,
  onSelect,
  onClose,
}: SubcategoryPickerModalProps) {
  const { colors } = useTheme();
  const closeXIcon = useAppIcon('closeX');

  const { totalCount, subs } = useMemo(() => {
    const total = getQuestionsForCategory(category).length;
    const subKeys = PARENT_TO_SUBS[category];
    const subInfos: SubInfo[] = subKeys.map((key) => {
      const questions = getQuestionsForSubcategory(key);
      return {
        key,
        label: SUBCATEGORY_LABELS[key],
        total: questions.length,
        easy: questions.filter((q) => q.difficulty === 'easy').length,
        medium: questions.filter((q) => q.difficulty === 'medium').length,
        hard: questions.filter((q) => q.difficulty === 'hard').length,
      };
    });
    return { totalCount: total, subs: subInfos };
  }, [category]);

  const handleSelect = useCallback(
    (value: TriviaSubcategory | 'all') => {
      hapticLight();
      playGameSound('triviaTap');
      onSelect(value);
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    hapticLight();
    onClose();
  }, [onClose]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: colors.modalOverlay,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        card: {
          width: '100%',
          maxWidth: 440,
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          maxHeight: '80%',
        },
        closeBtn: {
          position: 'absolute',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2,
        },
        title: {
          fontSize: 22,
          fontFamily: FONTS.gameHeader,
          color: colors.textPrimary,
          textAlign: 'center',
          marginTop: 8,
        },
        subtitle: {
          fontSize: 13,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 2,
        },
        scrollContent: {
          paddingBottom: 4,
        },
        allTile: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 14,
          borderWidth: 2,
          borderColor: colors.accent,
          marginTop: 16,
          gap: 12,
        },
        allText: {
          fontSize: 15,
          fontFamily: FONTS.bold,
          color: colors.accent,
        },
        allCount: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          marginTop: 2,
        },
        subTile: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          marginTop: 10,
          gap: 12,
        },
        subIcon: {
          width: 40,
          height: 40,
        },
        subInfo: {
          flex: 1,
        },
        subName: {
          fontSize: 15,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        subCount: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          marginTop: 2,
        },
        diffRow: {
          flexDirection: 'row',
          gap: 12,
          marginTop: 6,
        },
        diffText: {
          fontSize: 11,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
        },
      }),
    [colors],
  );

  const parentLabel = PARENT_LABELS[category];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} accessibilityViewIsModal={true}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close subcategory picker"
              >
                <Image
                  source={closeXIcon}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <Text style={styles.title}>{parentLabel}</Text>
              <Text style={styles.subtitle}>{totalCount} questions</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity
                  style={styles.allTile}
                  onPress={() => handleSelect('all')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`All ${parentLabel}, ${totalCount} questions`}
                >
                  <Image source={PARENT_IMAGES[category]} style={styles.subIcon} resizeMode="contain" />
                  <View style={styles.subInfo}>
                    <Text style={styles.allText}>All {parentLabel}</Text>
                    <Text style={styles.allCount}>{totalCount} questions</Text>
                  </View>
                </TouchableOpacity>

                {subs.map((sub) => (
                  <TouchableOpacity
                    key={sub.key}
                    style={styles.subTile}
                    onPress={() => handleSelect(sub.key)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${sub.label}, ${sub.total} questions`}
                  >
                    <Image source={SUBCATEGORY_IMAGES[sub.key]} style={styles.subIcon} resizeMode="contain" />
                    <View style={styles.subInfo}>
                      <Text style={styles.subName}>{sub.label}</Text>
                      <Text style={styles.subCount}>{sub.total} questions</Text>
                      <View style={styles.diffRow}>
                        <Text style={styles.diffText}>{sub.easy} easy</Text>
                        <Text style={styles.diffText}>{sub.medium} med</Text>
                        <Text style={styles.diffText}>{sub.hard} hard</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
