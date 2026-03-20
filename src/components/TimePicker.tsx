import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, useWindowDimensions, PixelRatio } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
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
  itemHeight = 56,
  visibleItems = 3,
  showSeconds = false,
  seconds = 0,
  onSecondsChange,
  maxSeconds = 60,
  labels,
}: TimePickerProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const availableWidth = screenWidth - 112; // modal overlay padding (32*2) + card padding (24*2)
  const colWidth = showSeconds
    ? Math.min(90, Math.floor(availableWidth / 3.8))
    : Math.min(90, Math.floor(availableWidth / 3.2));
  const pixelRatio = PixelRatio.get();
  const narrowScreen = pixelRatio < 3;
  const effectiveItemHeight = narrowScreen ? (showSeconds ? 80 : 68) : itemHeight;

  const selectedFont = showSeconds && narrowScreen ? 34 : 40;
  const adjacentFont = showSeconds && narrowScreen ? 18 : 24;
  const dist2Font = showSeconds && narrowScreen ? 14 : 17;
  const dist3Font = showSeconds && narrowScreen ? 11 : 14;

  function getItemStyle(dist: number) {
    if (dist === 0) return { fontSize: selectedFont, fontWeight: '700' as const, color: colors.accent, opacity: 1 };
    if (dist === 1) return { fontSize: adjacentFont, fontWeight: '500' as const, color: colors.textSecondary, opacity: 0.7 };
    if (dist === 2) return { fontSize: dist2Font, fontWeight: '400' as const, color: colors.textTertiary, opacity: 0.4 };
    return { fontSize: dist3Font, fontWeight: '400' as const, color: colors.textTertiary, opacity: 0.2 };
  }

  const pickerHeight = effectiveItemHeight * visibleItems;
  const padItems = Math.floor(visibleItems / 2);

  const hoursRange = maxHours - minHours;
  const minuteValues = Math.ceil(maxMinutes / minuteStep);
  const hoursData = useRef(
    Array.from({ length: hoursRange * CYCLES }, (_, i) => (i % hoursRange) + minHours),
  ).current;
  const minutesData = useRef(
    Array.from({ length: minuteValues * CYCLES }, (_, i) => (i % minuteValues) * minuteStep),
  ).current;
  const secondsData = useRef(
    showSeconds
      ? Array.from({ length: maxSeconds * CYCLES }, (_, i) => i % maxSeconds)
      : [],
  ).current;

  const hoursMid = Math.floor(CYCLES / 2) * hoursRange;
  const minutesMid = Math.floor(CYCLES / 2) * minuteValues;
  const secondsMid = Math.floor(CYCLES / 2) * maxSeconds;

  const hoursFLRef = useRef<FlatList<number>>(null);
  const minutesFLRef = useRef<FlatList<number>>(null);
  const secondsFLRef = useRef<FlatList<number>>(null);
  const lastHourRef = useRef(hours);
  const lastMinuteRef = useRef(minutes);
  const lastSecondRef = useRef(seconds);
  const [localHours, setLocalHours] = useState(hours);
  const [localMinutes, setLocalMinutes] = useState(minutes);
  const [localSeconds, setLocalSeconds] = useState(seconds);

  useEffect(() => {
    const t = setTimeout(() => {
      hoursFLRef.current?.scrollToOffset({
        offset: (hoursMid + (hours - minHours)) * effectiveItemHeight,
        animated: false,
      });
      const minIdx = minuteStep > 1 ? Math.round(minutes / minuteStep) : minutes;
      minutesFLRef.current?.scrollToOffset({
        offset: (minutesMid + minIdx) * effectiveItemHeight,
        animated: false,
      });
      if (showSeconds) {
        secondsFLRef.current?.scrollToOffset({
          offset: (secondsMid + seconds) * effectiveItemHeight,
          animated: false,
        });
      }
    }, 50);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hours !== lastHourRef.current) {
      lastHourRef.current = hours;
      setLocalHours(hours);
      hoursFLRef.current?.scrollToOffset({
        offset: (hoursMid + (hours - minHours)) * effectiveItemHeight,
        animated: false,
      });
    }
    if (minutes !== lastMinuteRef.current) {
      lastMinuteRef.current = minutes;
      setLocalMinutes(minutes);
      const minIdx = minuteStep > 1 ? Math.round(minutes / minuteStep) : minutes;
      minutesFLRef.current?.scrollToOffset({
        offset: (minutesMid + minIdx) * effectiveItemHeight,
        animated: false,
      });
    }
    if (showSeconds && seconds !== lastSecondRef.current) {
      lastSecondRef.current = seconds;
      setLocalSeconds(seconds);
      secondsFLRef.current?.scrollToOffset({
        offset: (secondsMid + seconds) * effectiveItemHeight,
        animated: false,
      });
    }
  }, [hours, minutes, seconds, showSeconds, hoursMid, minutesMid, secondsMid, minHours, minuteStep, effectiveItemHeight]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: effectiveItemHeight,
      offset: index * effectiveItemHeight,
      index,
    }),
    [effectiveItemHeight],
  );

  const hourKeyExtractor = useCallback((_: number, i: number) => `h-${i}`, []);
  const minuteKeyExtractor = useCallback((_: number, i: number) => `m-${i}`, []);
  const secondKeyExtractor = useCallback((_: number, i: number) => `s-${i}`, []);

  const handleHoursScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / effectiveItemHeight);
      const value = hoursData[Math.max(0, Math.min(idx, hoursData.length - 1))];
      setLocalHours(value);
    },
    [hoursData, effectiveItemHeight],
  );

  const handleHoursSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / effectiveItemHeight);
      const value = hoursData[Math.max(0, Math.min(idx, hoursData.length - 1))];
      setLocalHours(value);
      onHoursChange(value);
      if (value !== lastHourRef.current) {
        hapticSelection();
        lastHourRef.current = value;
      }
    },
    [hoursData, effectiveItemHeight, onHoursChange],
  );

  const handleMinutesScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / effectiveItemHeight);
      const value = minutesData[Math.max(0, Math.min(idx, minutesData.length - 1))];
      setLocalMinutes(value);
    },
    [minutesData, effectiveItemHeight],
  );

  const handleMinutesSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / effectiveItemHeight);
      const value = minutesData[Math.max(0, Math.min(idx, minutesData.length - 1))];
      setLocalMinutes(value);
      onMinutesChange(value);
      if (value !== lastMinuteRef.current) {
        hapticSelection();
        lastMinuteRef.current = value;
      }
    },
    [minutesData, effectiveItemHeight, onMinutesChange],
  );

  const handleSecondsScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / effectiveItemHeight);
      const value = secondsData[Math.max(0, Math.min(idx, secondsData.length - 1))];
      setLocalSeconds(value);
    },
    [secondsData, effectiveItemHeight],
  );

  const handleSecondsSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / effectiveItemHeight);
      const value = secondsData[Math.max(0, Math.min(idx, secondsData.length - 1))];
      setLocalSeconds(value);
      onSecondsChange?.(value);
      if (value !== lastSecondRef.current) {
        hapticSelection();
        lastSecondRef.current = value;
      }
    },
    [secondsData, effectiveItemHeight, onSecondsChange],
  );

  const renderHour = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localHours);
      const dist = Math.min(d, hoursRange - d);
      const s = getItemStyle(dist);
      return (
        <View style={{ height: effectiveItemHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: s.fontSize, lineHeight: Math.round(s.fontSize * 1.15), fontWeight: s.fontWeight, color: s.color, opacity: s.opacity, textAlignVertical: 'center' }}>
            {padHours ? String(item).padStart(2, '0') : item}
          </Text>
        </View>
      );
    },
    [localHours, hoursRange, effectiveItemHeight, padHours, colors],
  );

  const renderMinute = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localMinutes);
      const dist = Math.min(d, maxMinutes - d);
      const s = getItemStyle(dist);
      return (
        <View style={{ height: effectiveItemHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: s.fontSize, lineHeight: Math.round(s.fontSize * 1.15), fontWeight: s.fontWeight, color: s.color, opacity: s.opacity, textAlignVertical: 'center' }}>
            {padMinutes ? String(item).padStart(2, '0') : item}
          </Text>
        </View>
      );
    },
    [localMinutes, maxMinutes, effectiveItemHeight, padMinutes, colors],
  );

  const renderSecond = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localSeconds);
      const dist = Math.min(d, maxSeconds - d);
      const s = getItemStyle(dist);
      return (
        <View style={{ height: effectiveItemHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: s.fontSize, lineHeight: Math.round(s.fontSize * 1.15), fontWeight: s.fontWeight, color: s.color, opacity: s.opacity, textAlignVertical: 'center' }}>
            {String(item).padStart(2, '0')}
          </Text>
        </View>
      );
    },
    [localSeconds, maxSeconds, effectiveItemHeight, colors],
  );

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
        {/* Top border line */}
        <View
          style={{
            position: 'absolute',
            top: effectiveItemHeight * padItems,
            left: 4,
            right: 4,
            height: 1,
            backgroundColor: colors.border,
            zIndex: 2,
          }}
          pointerEvents="none"
        />
        {/* Bottom border line */}
        <View
          style={{
            position: 'absolute',
            top: effectiveItemHeight * (padItems + 1),
            left: 4,
            right: 4,
            height: 1,
            backgroundColor: colors.border,
            zIndex: 2,
          }}
          pointerEvents="none"
        />
        {/* Selection band fill */}
        <View
          style={{
            position: 'absolute',
            top: effectiveItemHeight * padItems,
            left: 2,
            right: 2,
            height: effectiveItemHeight,
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
          snapToInterval={effectiveItemHeight}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: padItems * effectiveItemHeight }}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onSnap}
          nestedScrollEnabled={true}
          renderItem={renderItem}
        />
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
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
