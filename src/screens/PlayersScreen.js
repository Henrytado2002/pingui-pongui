import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { fetchPlayers, createPlayer } from '../lib/db';
import { getCurrentUserId, setCurrentUserId } from '../lib/currentUser';

export default function PlayersScreen() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [meId, setMeId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, me] = await Promise.all([fetchPlayers(), getCurrentUserId()]);
      setPlayers(list);
      setMeId(me);
    } catch (e) {
      Alert.alert('Could not load players', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAddPlayer() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createPlayer(newName);
      setNewName('');
      await load();
    } catch (e) {
      Alert.alert('Could not add player', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetMe(id) {
    const next = meId === id ? null : id;
    setMeId(next);
    await setCurrentUserId(next);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Players</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New player name"
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

      <Text style={styles.hint}>
        Tap a player's star to mark them as you — match results are shown from
        that player's perspective.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No players yet — add one above.</Text>
          }
          renderItem={({ item }) => {
            const total = (item.wins ?? 0) + (item.losses ?? 0);
            const rate = total > 0 ? Math.round((item.wins / total) * 100) : null;
            const isMe = item.id === meId;
            return (
              <View style={styles.playerCard}>
                <TouchableOpacity onPress={() => handleSetMe(item.id)} hitSlop={10}>
                  <Text style={[styles.star, isMe && styles.starActive]}>
                    {isMe ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>{item.name}</Text>
                  <Text style={styles.playerStats}>
                    {item.wins ?? 0}W - {item.losses ?? 0}L
                    {rate !== null ? `  ·  ${rate}% win rate` : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: colors.background, fontWeight: '700' },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  star: { fontSize: 22, color: colors.textSecondary, width: 28 },
  starActive: { color: colors.accent },
  playerName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  playerStats: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
});
