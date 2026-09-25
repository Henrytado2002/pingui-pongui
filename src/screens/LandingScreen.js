import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { fetchPlayers, createPlayer } from '../lib/db';
import { getCurrentUserId, setCurrentUserId } from '../lib/currentUser';

export default function LandingScreen({ navigation }) {
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchPlayers();
      setPlayers(list);
      const currentId = await getCurrentUserId();
      setSelectedId(currentId);
    } catch (e) {
      Alert.alert('Could not load players', e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAddPlayer() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const player = await createPlayer(name);
      setNewName('');
      setSelectedId(player.id);
      await load();
    } catch (e) {
      Alert.alert('Could not add player', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (!selectedId) {
      Alert.alert('Choose your starred player', 'Select the player you want to track for all new matches.');
      return;
    }

    await setCurrentUserId(selectedId);
    navigation.replace('Home');
  }

  return (
    <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
      <Text style={styles.eyebrow}>Pingui Pongui</Text>
      <Text style={styles.title}>Welcome back.</Text>
      <Text style={styles.subtitle}>
        Choose your starred player to start tracking matches from your perspective.
      </Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a player"
          placeholderTextColor={colors.textSecondary}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAddPlayer}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={handleAddPlayer}
          disabled={saving}
        >
          <Text style={styles.addButtonText}>{saving ? '...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Starred player</Text>
      <FlatList
        data={players}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No players yet — add one above to get started.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.playerCard, item.id === selectedId && styles.playerCardActive]}
            onPress={() => setSelectedId(item.id)}
          >
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerCheck}>{item.id === selectedId ? '✓' : '○'}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[styles.continueButton, !selectedId && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!selectedId}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
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
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: {
    color: colors.background,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  playerCheck: {
    fontSize: 24,
    color: colors.accent,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  continueButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.55 },
  continueButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
});
