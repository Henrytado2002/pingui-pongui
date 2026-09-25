import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { fetchPlayers } from '../lib/db';
import { getCurrentUserId, setCurrentUserId } from '../lib/currentUser';

export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState('Player');

  const loadUser = useCallback(async () => {
    try {
      const meId = await getCurrentUserId();
      if (!meId) {
        navigation.replace('Landing');
        return;
      }
      const players = await fetchPlayers();
      const me = players.find((player) => String(player.id) === String(meId));
      setUserName(me?.name ?? 'Player');
    } catch (e) {
      Alert.alert('Could not load profile', e.message);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  async function handleLeave() {
    await setCurrentUserId(null);
    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
  }

  return (
    <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Ready to play</Text>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Your starred player is {userName}.</Text>

      <View style={styles.buttonStack}>
        <TouchableOpacity style={styles.mainButton} onPress={() => navigation.navigate('Play')}>
          <Text style={styles.mainButtonTitle}>Play</Text>
          <Text style={styles.mainButtonSub}>Record a new match</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => navigation.navigate('Matches')}
        >
          <Text style={styles.mainButtonTitle}>Match History</Text>
          <Text style={styles.mainButtonSub}>Review completed games</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => navigation.navigate('Players')}
        >
          <Text style={styles.mainButtonTitle}>Players</Text>
          <Text style={styles.mainButtonSub}>Manage your squads</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  pagePadding: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  leaveButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leaveButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  title: {
    marginTop: spacing.md,
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: 16,
    color: colors.textSecondary,
  },
  buttonStack: {
    gap: spacing.md,
  },
  mainButton: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  mainButtonTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  mainButtonSub: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
  },
  settingsButton: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  settingsButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
