import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticSelection } from '../utils/haptics';

export interface TimePickerProps {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
  maxHours?: number;
  maxMinutes?: number;
  minHours?: number;
  minuteStep?: number;
  padHours?: boolean;
  padMinutes?: boolean;
  itemHeight?: number;
  visibleItems?: number;
  showSeconds?: boolean;
  seconds?: number;
  onSecondsChange?: (s: number) => void;
  maxSeconds?: number;
  labels?: { hours?: string; minutes?: string; seconds?: string };
}

const CYCLES = 100;

export default function TimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  maxHours = 100,
  maxMinutes = 60,
  minHours = 0,
  minuteStep = 1,
  padHours = false,
  padMinutes = true,
  itemHeight = 96,
  visibleItems = 3,
  showSeconds = false,
  seconds = 0,
  onSecondsChange,
  maxSeconds = 60,
  labels,
}: TimePickerProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // --- Responsive sizing ---
  const colWidth = showSeconds
    ? Math.min(80, Math.floor((screenWidth - 96) / 4.5))
    : Math.min(90, Math.floor((screenWidth - 96) / 3.2));
  const rowHeight = itemHeight;
  const fontScale = colWidth / 90;

  const pickerHeight = rowHeight * visibleItems;
  const padItems = Math.floor(visibleItems / 2);

  // --- Font styles by distance from selected ---
  function getItemStyle(dist: number) {
    if (dist === 0) return { fontSize: Math.round(32 * fontScale), fontFamily: FONTS.bold, color: colors.accent, opacity: 1 };
    if (dist === 1) return { fontSize: Math.round(18 * fontScale), fontFamily: FONTS.semiBold, color: colors.textSecondary, opacity: 0.7 };
    if (dist === 2) return { fontSize: Math.round(14 * fontScale), fontFamily: FONTS.regular, color: colors.textTertiary, opacity: 0.4 };
    return { fontSize: Math.round(12 * fontScale), fontFamily: FONTS.regular, color: colors.textTertiary, opacity: 0.2 };
  }

  // --- Infinite-scroll data arrays ---
  const hoursRange = maxHours - minHours;
  const minuteValues = Math.ceil(maxMinutes / minuteStep);

  const hoursData = useRef(
    Array.from({ length: hoursRange * CYCLES }, (_, i) => (i % hoursRange) + minHours),
  ).current;
  const minutesData = useRef(
    Array.from({ length: minuteValues * CYCLES }, (_, i) => (i % minuteValues) * minuteStep),
  ).current;
  const secondsData = useRef(
    showSeconds ? Array.from({ length: maxSeconds * CYCLES }, (_, i) => i % maxSeconds) : [],
  ).current;

  const hoursMid = Math.floor(CYCLES / 2) * hoursRange;
  const minutesMid = Math.floor(CYCLES / 2) * minuteValues;
  const secondsMid = Math.floor(CYCLES / 2) * maxSeconds;

  // --- Refs and local state ---
  const hoursFLRef = useRef<FlatList<number>>(null);
  const minutesFLRef = useRef<FlatList<number>>(null);
  const secondsFLRef = useRef<FlatList<number>>(null);
  const lastHourRef = useRef(hours);
  const lastMinuteRef = useRef(minutes);
  const lastSecondRef = useRef(seconds);
  const [localHours, setLocalHours] = useState(hours);
  const [localMinutes, setLocalMinutes] = useState(minutes);
  const [localSeconds, setLocalSeconds] = useState(seconds);

  // --- Initial scroll to current values ---
  useEffect(() => {
    const t = setTimeout(() => {
      hoursFLRef.current?.scrollToOffset({
        offset: (hoursMid + (hours - minHours)) * rowHeight,
        animated: false,
      });
      const minIdx = minuteStep > 1 ? Math.round(minutes / minuteStep) : minutes;
      minutesFLRef.current?.scrollToOffset({
        offset: (minutesMid + minIdx) * rowHeight,
        animated: false,
      });
      if (showSeconds) {
        secondsFLRef.current?.scrollToOffset({
          offset: (secondsMid + seconds) * rowHeight,
          animated: false,
        });
      }
    }, 50);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sync when parent changes values externally ---
  useEffect(() => {
    if (hours !== lastHourRef.current) {
      lastHourRef.current = hours;
      setLocalHours(hours);
      hoursFLRef.current?.scrollToOffset({
        offset: (hoursMid + (hours - minHours)) * rowHeight,
        animated: false,
      });
    }
    if (minutes !== lastMinuteRef.current) {
      lastMinuteRef.current = minutes;
      setLocalMinutes(minutes);
      const minIdx = minuteStep > 1 ? Math.round(minutes / minuteStep) : minutes;
      minutesFLRef.current?.scrollToOffset({
        offset: (minutesMid + minIdx) * rowHeight,
        animated: false,
      });
    }
    if (showSeconds && seconds !== lastSecondRef.current) {
      lastSecondRef.current = seconds;
      setLocalSeconds(seconds);
      secondsFLRef.current?.scrollToOffset({
        offset: (secondsMid + seconds) * rowHeight,
        animated: false,
      });
    }
  }, [hours, minutes, seconds, showSeconds, hoursMid, minutesMid, secondsMid, minHours, minuteStep, rowHeight]);

  // --- Layout helper ---
  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: rowHeight, offset: index * rowHeight, index }),
    [rowHeight],
  );

  // --- Key extractors ---
  const hourKeyExtractor = useCallback((_: number, i: number) => `h-${i}`, []);
  const minuteKeyExtractor = useCallback((_: number, i: number) => `m-${i}`, []);
  const secondKeyExtractor = useCallback((_: number, i: number) => `s-${i}`, []);

  // --- Scroll handlers ---
  const handleHoursScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / rowHeight);
      const value = hoursData[Math.max(0, Math.min(idx, hoursData.length - 1))];
      setLocalHours(value);
    },
    [hoursData, rowHeight],
  );

  const handleHoursSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / rowHeight);
      const value = hoursData[Math.max(0, Math.min(idx, hoursData.length - 1))];
      setLocalHours(value);
      onHoursChange(value);
      if (value !== lastHourRef.current) {
        hapticSelection();
        lastHourRef.current = value;
      }
    },
    [hoursData, rowHeight, onHoursChange],
  );

  const handleMinutesScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / rowHeight);
      const value = minutesData[Math.max(0, Math.min(idx, minutesData.length - 1))];
      setLocalMinutes(value);
    },
    [minutesData, rowHeight],
  );

  const handleMinutesSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / rowHeight);
      const value = minutesData[Math.max(0, Math.min(idx, minutesData.length - 1))];
      setLocalMinutes(value);
      onMinutesChange(value);
      if (value !== lastMinuteRef.current) {
        hapticSelection();
        lastMinuteRef.current = value;
      }
    },
    [minutesData, rowHeight, onMinutesChange],
  );

  const handleSecondsScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / rowHeight);
      const value = secondsData[Math.max(0, Math.min(idx, secondsData.length - 1))];
      setLocalSeconds(value);
    },
    [secondsData, rowHeight],
  );

  const handleSecondsSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / rowHeight);
      const value = secondsData[Math.max(0, Math.min(idx, secondsData.length - 1))];
      setLocalSeconds(value);
      onSecondsChange?.(value);
      if (value !== lastSecondRef.current) {
        hapticSelection();
        lastSecondRef.current = value;
      }
    },
    [secondsData, rowHeight, onSecondsChange],
  );

  // --- Render items ---
  const renderHour = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localHours);
      const dist = Math.min(d, hoursRange - d);
      const s = getItemStyle(dist);
      return (
        <View style={{ height: rowHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: s.fontSize, fontFamily: s.fontFamily, color: s.color, opacity: s.opacity, textAlignVertical: 'center' }}>
            {padHours ? String(item).padStart(2, '0') : item}
          </Text>
        </View>
      );
    },
    [localHours, hoursRange, rowHeight, padHours, colors],
  );

  const renderMinute = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localMinutes);
      const dist = Math.min(d, maxMinutes - d);
      const s = getItemStyle(dist);
      return (
        <View style={{ height: rowHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: s.fontSize, fontFamily: s.fontFamily, color: s.color, opacity: s.opacity, textAlignVertical: 'center' }}>
            {padMinutes ? String(item).padStart(2, '0') : item}
          </Text>
        </View>
      );
    },
    [localMinutes, maxMinutes, rowHeight, padMinutes, colors],
  );

  const renderSecond = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localSeconds);
      const dist = Math.min(d, maxSeconds - d);
      const s = getItemStyle(dist);
      return (
        <View style={{ height: rowHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: s.fontSize, fontFamily: s.fontFamily, color: s.color, opacity: s.opacity, textAlignVertical: 'center' }}>
            {String(item).padStart(2, '0')}
          </Text>
        </View>
      );
    },
    [localSeconds, maxSeconds, rowHeight, colors],
  );

  // --- Column renderer ---
  const renderColumn = (
    columnId: string,
    ref: React.RefObject<FlatList<number> | null>,
    data: number[],
    localValue: number,
    onScroll: (e: any) => void,
    onSnap: (e: any) => void,
    renderItem: any,
    label: string,
    isLast: boolean,
    keyExtractorFn: (_: number, i: number) => string,
  ) => (
    <React.Fragment key={columnId}>
      <View style={{ width: colWidth, height: pickerHeight, overflow: 'hidden', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            top: rowHeight * padItems,
            left: 4,
            right: 4,
            height: 1,
            backgroundColor: colors.border,
            zIndex: 2,
          }}
          pointerEvents="none"
        />
        <View
          style={{
            position: 'absolute',
            top: rowHeight * (padItems + 1),
            left: 4,
            right: 4,
            height: 1,
            backgroundColor: colors.border,
            zIndex: 2,
          }}
          pointerEvents="none"
        />
        <View
          style={{
            position: 'absolute',
            top: rowHeight * padItems,
            left: 2,
            right: 2,
            height: rowHeight,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 6,
            zIndex: 1,
          }}
          pointerEvents="none"
        />
        <FlatList
          ref={ref as any}
          data={data}
          keyExtractor={keyExtractorFn}
          extraData={localValue}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={rowHeight}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: padItems * rowHeight }}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onSnap}
          nestedScrollEnabled={true}
          renderItem={renderItem}
        />
      </View>
      <Text
        style={{
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          color: colors.textTertiary,
          marginLeft: 4,
          ...(isLast ? {} : { marginRight: 12 }),
        }}
      >
        {label}
      </Text>
    </React.Fragment>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      {renderColumn('hours', hoursFLRef, hoursData, localHours, handleHoursScroll, handleHoursSnap, renderHour, labels?.hours ?? 'hr', !showSeconds && true, hourKeyExtractor)}
      {renderColumn('minutes', minutesFLRef, minutesData, localMinutes, handleMinutesScroll, handleMinutesSnap, renderMinute, labels?.minutes ?? 'min', !showSeconds, minuteKeyExtractor)}
      {showSeconds && renderColumn('seconds', secondsFLRef, secondsData, localSeconds, handleSecondsScroll, handleSecondsSnap, renderSecond, labels?.seconds ?? 'sec', true, secondKeyExtractor)}
    </View>
  );
}
