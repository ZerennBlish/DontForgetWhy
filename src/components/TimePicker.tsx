import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { hapticSelection } from '../utils/haptics';

export interface TimePickerProps {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
  maxHours?: number;
  maxMinutes?: number;
  minuteStep?: number;
  padHours?: boolean;
  padMinutes?: boolean;
  itemHeight?: number;
  visibleItems?: number;
}

const CYCLES = 100;

export default function TimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  maxHours = 100,
  maxMinutes = 60,
  minuteStep = 1,
  padHours = false,
  padMinutes = true,
  itemHeight = 44,
  visibleItems = 5,
}: TimePickerProps) {
  const { colors } = useTheme();
  const pickerHeight = itemHeight * visibleItems;
  const padItems = Math.floor(visibleItems / 2);

  const minuteValues = Math.ceil(maxMinutes / minuteStep);
  const hoursData = useRef(
    Array.from({ length: maxHours * CYCLES }, (_, i) => i % maxHours),
  ).current;
  const minutesData = useRef(
    Array.from({ length: minuteValues * CYCLES }, (_, i) => (i % minuteValues) * minuteStep),
  ).current;

  const hoursMid = Math.floor(CYCLES / 2) * maxHours;
  const minutesMid = Math.floor(CYCLES / 2) * minuteValues;

  const hoursFLRef = useRef<FlatList<number>>(null);
  const minutesFLRef = useRef<FlatList<number>>(null);
  const lastHourRef = useRef(hours);
  const lastMinuteRef = useRef(minutes);
  const [localHours, setLocalHours] = useState(hours);
  const [localMinutes, setLocalMinutes] = useState(minutes);

  // Scroll to initial positions on mount
  useEffect(() => {
    const t = setTimeout(() => {
      hoursFLRef.current?.scrollToOffset({
        offset: (hoursMid + hours) * itemHeight,
        animated: false,
      });
      const minIdx = minuteStep > 1 ? Math.round(minutes / minuteStep) : minutes;
      minutesFLRef.current?.scrollToOffset({
        offset: (minutesMid + minIdx) * itemHeight,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: itemHeight,
      offset: padItems * itemHeight + index * itemHeight,
      index,
    }),
    [itemHeight, padItems],
  );

  const keyExtractor = useCallback((_: number, i: number) => String(i), []);

  const handleHoursSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
      const value = hoursData[Math.max(0, Math.min(idx, hoursData.length - 1))];
      setLocalHours(value);
      onHoursChange(value);
      if (value !== lastHourRef.current) {
        hapticSelection();
        lastHourRef.current = value;
      }
    },
    [hoursData, itemHeight, onHoursChange],
  );

  const handleMinutesSnap = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
      const value = minutesData[Math.max(0, Math.min(idx, minutesData.length - 1))];
      setLocalMinutes(value);
      onMinutesChange(value);
      if (value !== lastMinuteRef.current) {
        hapticSelection();
        lastMinuteRef.current = value;
      }
    },
    [minutesData, itemHeight, onMinutesChange],
  );

  const renderHour = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localHours);
      const dist = Math.min(d, maxHours - d);
      return (
        <View style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: dist === 0 ? 24 : dist === 1 ? 18 : 14,
              fontWeight: dist === 0 ? '700' : dist === 1 ? '500' : '400',
              color:
                dist === 0
                  ? colors.accent
                  : dist === 1
                    ? colors.textSecondary
                    : colors.textTertiary,
            }}
          >
            {padHours ? String(item).padStart(2, '0') : item}
          </Text>
        </View>
      );
    },
    [localHours, maxHours, itemHeight, padHours, colors],
  );

  const renderMinute = useCallback(
    ({ item }: { item: number }) => {
      const d = Math.abs(item - localMinutes);
      const dist = Math.min(d, maxMinutes - d);
      return (
        <View style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: dist === 0 ? 24 : dist === 1 ? 18 : 14,
              fontWeight: dist === 0 ? '700' : dist === 1 ? '500' : '400',
              color:
                dist === 0
                  ? colors.accent
                  : dist === 1
                    ? colors.textSecondary
                    : colors.textTertiary,
            }}
          >
            {padMinutes ? String(item).padStart(2, '0') : item}
          </Text>
        </View>
      );
    },
    [localMinutes, maxMinutes, itemHeight, padMinutes, colors],
  );

  const highlightBand = {
    position: 'absolute' as const,
    top: itemHeight * padItems,
    left: 2,
    right: 2,
    height: itemHeight,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    zIndex: 1,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      {/* Hours column */}
      <View style={{ width: 72, height: pickerHeight, overflow: 'hidden', position: 'relative' }}>
        <View style={highlightBand} pointerEvents="none" />
        <FlatList
          ref={hoursFLRef}
          data={hoursData}
          keyExtractor={keyExtractor}
          extraData={localHours}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: padItems * itemHeight }}
          onMomentumScrollEnd={handleHoursSnap}
          renderItem={renderHour}
        />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textSecondary,
          marginLeft: 6,
          marginRight: 16,
        }}
      >
        hr
      </Text>

      {/* Minutes column */}
      <View style={{ width: 72, height: pickerHeight, overflow: 'hidden', position: 'relative' }}>
        <View style={highlightBand} pointerEvents="none" />
        <FlatList
          ref={minutesFLRef}
          data={minutesData}
          keyExtractor={keyExtractor}
          extraData={localMinutes}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: padItems * itemHeight }}
          onMomentumScrollEnd={handleMinutesSnap}
          renderItem={renderMinute}
        />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textSecondary,
          marginLeft: 6,
        }}
      >
        min
      </Text>
    </View>
  );
}
