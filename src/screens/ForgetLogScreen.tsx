import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadForgetLog, clearForgetLog, ForgetEntry } from '../services/forgetLog';
import { useTheme } from '../theme/ThemeContext';
import BackButton from '../components/BackButton';
import { hapticLight } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgetLog'>;

const categoryEmoji: Record<string, string> = {
  meds: '\u{1F48A}',
  appointment: '\u{1F4C5}',
  event: '\u{1F389}',
  task: '\u2705',
  'self-care': '\u{1F9D8}',
  general: '\u{1F514}',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Unknown date';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const mins = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year} at ${hours}:${mins} ${ampm}`;
}

export default function ForgetLogScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState<ForgetEntry[]>([]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 2,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: insets.top + 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 4,
      paddingHorizontal: 20,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: 80 + insets.bottom,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 22,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    cardEmoji: {
      fontSize: 24,
      marginRight: 12,
      marginTop: 2,
    },
    cardMiddle: {
      flex: 1,
      marginRight: 10,
    },
    cardNote: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 21,
    },
    cardNickname: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },
    cardBadge: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    badgeLoss: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.red,
    },
    badgeSkip: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.orange,
    },
    cardTimestamp: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 8,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 40 + insets.bottom,
    },
    clearBtn: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    clearBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.red,
    },
  }), [colors, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      loadForgetLog().then(setLog);
    }, [])
  );

  const handleClear = () => {
    hapticLight();
    Alert.alert('Clear Log', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearForgetLog();
          setLog([]);
        },
      },
    ]);
  };

  const displayEmoji = (entry: ForgetEntry): string => {
    return entry.alarmIcon || categoryEmoji[entry.alarmCategory] || '\u{1F514}';
  };

  const renderEntry = ({ item }: { item: ForgetEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardEmoji}>{displayEmoji(item)}</Text>
        <View style={styles.cardMiddle}>
          <Text style={styles.cardNote} numberOfLines={2}>
            {item.alarmNote || 'No note'}
          </Text>
          {item.alarmNickname ? (
            <Text style={styles.cardNickname} numberOfLines={1}>
              {item.alarmNickname}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardBadge}>
          {item.result === 'loss' ? (
            <Text style={styles.badgeLoss}>{'\u274C'} Forgot</Text>
          ) : (
            <Text style={styles.badgeSkip}>{'\u23ED\uFE0F'} Skipped</Text>
          )}
        </View>
      </View>
      <Text style={styles.cardTimestamp}>{formatTimestamp(item.timestamp)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <Text style={styles.title}>What Did I Forget?</Text>
      </View>
      <Text style={styles.subtitle}>Every time you couldn't remember why.</Text>

      {log.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Nothing here yet. Either you have a great memory or you haven't played
            Guess Why.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={log}
            keyExtractor={(item) => item.id}
            renderItem={renderEntry}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>Clear Log</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
