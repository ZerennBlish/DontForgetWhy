import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alarm } from '../types/alarm';
import { isAlarmPinned } from '../services/widgetPins';
import AlarmCard from '../components/AlarmCard';
import DeletedAlarmCard from '../components/DeletedAlarmCard';
import UndoToast from '../components/UndoToast';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import SwipeableRow from '../components/SwipeableRow';
import { useAppIcon } from '../hooks/useAppIcon';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlarmList } from '../hooks/useAlarmList';
import { useTutorial } from '../hooks/useTutorial';
import TutorialOverlay from '../components/TutorialOverlay';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

export default function AlarmListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const al = useAlarmList();
  const tutorial = useTutorial('alarmList');

  const alarmIcon = useAppIcon('alarm');
  const flameIcon = useAppIcon('flame');
  const plusIcon = useAppIcon('plus');

  const handleEdit = useCallback((alarm: Alarm) => {
    navigation.navigate('CreateAlarm', { alarm });
  }, [navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    watermark: {
      width: '100%',
      height: '100%',
      opacity: colors.watermarkOpacity,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: insets.top + 10,
    },
    headerHome: {
      position: 'absolute',
      left: 64,
      top: insets.top + 10,
    },
    screenTitle: {
      fontSize: 20,
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: FONTS.extraBold,
    },
    subtitleText: {
      fontSize: 12,
      color: colors.textTertiary,
      paddingHorizontal: 2,
      fontFamily: FONTS.regular,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    streakText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
    },
    bestStreakText: {
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: FONTS.regular,
    },
    quoteText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      opacity: 0.7,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginBottom: 4,
      fontFamily: FONTS.regular,
    },
    sortFilterToggleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 2,
    },
    sortFilterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    sortFilterToggleText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    sortFilterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    sortFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 6,
      flexWrap: 'wrap',
    },
    sortFilterLabel: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 2,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 80 + insets.bottom,
    },
    emptyText: {
      fontSize: 18,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 6,
      fontFamily: FONTS.regular,
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
      width: 56,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [colors, insets.bottom, insets.top]);

  const keyExtractor = useCallback((item: Alarm) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Alarm }) => {
    if (item.deletedAt) {
      return (
        <DeletedAlarmCard
          alarm={item}
          timeFormat={al.timeFormat}
          onRestore={() => al.handleRestore(item.id)}
          onPermanentDelete={() => al.handlePermanentDelete(item.id)}
        />
      );
    }
    return (
      <SwipeableRow onDelete={() => al.handleDelete(item.id)} enabled={!item.deletedAt}>
        <AlarmCard
          alarm={item}
          timeFormat={al.timeFormat}
          isPinned={isAlarmPinned(item.id, al.pinnedAlarmIds)}
          onToggle={al.handleToggle}
          onEdit={handleEdit}
          onTogglePin={al.handleTogglePin}
        />
      </SwipeableRow>
    );
  }, [al.timeFormat, al.handleRestore, al.handlePermanentDelete, al.handleDelete, al.pinnedAlarmIds, al.handleToggle, handleEdit, al.handleTogglePin]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {al.bgUri ? (
          <>
            <Image source={{ uri: al.bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => al.setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${al.bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.webp')}
            style={styles.watermark}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={() => navigation.goBack()} forceDark={!!al.bgUri} />
        </View>
        <View style={styles.headerHome}>
          <HomeButton forceDark={!!al.bgUri} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Image source={alarmIcon} style={{ width: 48, height: 48, marginBottom: 2 }} resizeMode="contain" />
          <Text style={[styles.screenTitle, al.bgUri && { color: colors.overlayText }]}>Alarms</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={[styles.subtitleText, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
          {(() => { const c = al.alarms.filter(a => a.enabled && !a.deletedAt).length; return `${c} alarm${c !== 1 ? 's' : ''}`; })()}
        </Text>

        {al.hasPlayed && al.stats!.streak > 0 && (
          <View style={styles.streakRow}>
            <Image source={flameIcon} style={{ width: 14, height: 14 }} resizeMode="contain" />
            <Text style={[styles.streakText, { color: colors.accent }]}>
              {`${al.stats!.streak} in a row`}
            </Text>
            {al.stats!.bestStreak > 0 && (
              <Text style={[styles.bestStreakText, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Best: {al.stats!.bestStreak}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.sortFilterToggleRow}>
        <TouchableOpacity
          style={styles.sortFilterToggleBtn}
          onPress={() => {
            hapticLight();
            al.setShowSortFilter((prev) => {
              if (prev) { al.setAlarmFilter('all'); }
              return !prev;
            });
          }}
          activeOpacity={0.7}
          accessibilityLabel={`Sort and Filter${al.showSortFilter ? ', expanded' : ''}`}
          accessibilityRole="button"
        >
          {al.hasNonDefaultSortFilter && <View style={styles.sortFilterDot} />}
          <Text style={[styles.sortFilterToggleText, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
            Sort & Filter {al.showSortFilter ? '\u25B4' : '\u25BE'}
          </Text>
        </TouchableOpacity>
      </View>

      {al.showSortFilter && (
        <>
          <Text style={[styles.sortFilterLabel, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Sort</Text>
          <View style={styles.sortFilterRow}>
            {(['time', 'created', 'name'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, al.alarmSort === s && styles.pillActive]}
                onPress={() => { hapticLight(); al.setAlarmSort(s); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: al.alarmSort === s }}
              >
                <Text style={[styles.pillText, al.alarmSort === s && styles.pillTextActive]}>
                  {s === 'time' ? 'Time' : s === 'created' ? 'Created' : 'Name'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sortFilterLabel, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Filter</Text>
          <View style={styles.sortFilterRow}>
            {(['all', 'active', 'one-time', 'recurring', 'deleted'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, al.alarmFilter === f && styles.pillActive]}
                onPress={() => { hapticLight(); al.setAlarmFilter(f); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: al.alarmFilter === f }}
              >
                <Text style={[styles.pillText, al.alarmFilter === f && styles.pillTextActive]}>
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'one-time' ? 'One-time' : f === 'recurring' ? 'Recurring' : 'Deleted'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {al.filteredAlarms.length === 0 ? (
        <View style={styles.empty}>
          {al.nonDeletedAlarmCount === 0 && (
            <Text style={[styles.quoteText, al.bgUri && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
              {al.appQuote}
            </Text>
          )}
          <Text style={[styles.emptyText, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
            {al.nonDeletedAlarmCount === 0 ? 'No alarms yet' : 'No matches'}
          </Text>
          <Text style={[styles.emptySubtext, al.bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
            {al.nonDeletedAlarmCount === 0
              ? 'Tap + to set one and immediately forget why.' : 'Try a different filter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={al.filteredAlarms}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { hapticLight(); navigation.navigate('CreateAlarm'); }}
        activeOpacity={0.8}
        accessibilityLabel="Create new alarm"
        accessibilityRole="button"
      >
        <Image source={plusIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </TouchableOpacity>

      <UndoToast
        key={al.undoKey}
        visible={al.showUndo}
        message="Alarm deleted"
        onUndo={al.handleUndoDelete}
        onDismiss={al.handleUndoDismiss}
      />

      {tutorial.showTutorial && (
        <TutorialOverlay
          tips={tutorial.tips}
          currentIndex={tutorial.currentIndex}
          onNext={tutorial.nextTip}
          onPrev={tutorial.prevTip}
          onDismiss={tutorial.dismiss}
          sectionColor={colors.sectionAlarm}
        />
      )}
    </View>
  );
}
