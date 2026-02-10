import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadSettings, saveSettings } from '../services/settings';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const [guessWhyEnabled, setGuessWhyEnabled] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => setGuessWhyEnabled(s.guessWhyEnabled));
  }, []);

  const handleToggle = async (value: boolean) => {
    setGuessWhyEnabled(value);
    await saveSettings({ guessWhyEnabled: value });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Guess Why Mini-Game</Text>
          <Switch
            value={guessWhyEnabled}
            onValueChange={handleToggle}
            trackColor={{ false: '#2A2A3E', true: '#4A90D9' }}
            thumbColor={guessWhyEnabled ? '#EAEAFF' : '#7A7A9E'}
          />
        </View>
        <Text style={styles.description}>
          When enabled, you'll have to guess why you set each alarm before seeing the answer. 3
          attempts. No cheating.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: {
    fontSize: 16,
    color: '#4A90D9',
    fontWeight: '600',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#EAEAFF',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EAEAFF',
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    color: '#7A7A9E',
    marginTop: 12,
    lineHeight: 20,
  },
});
