import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
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
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

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
      setShowAddPlayer(false);
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

      {!showAddPlayer ? (
        <TouchableOpacity
          style={styles.wideAddButton}
          onPress={() => setShowAddPlayer(true)}
        >
          <Text style={styles.wideAddButtonText}>Add a new player</Text>
        </TouchableOpacity>
      ) : (
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
      )}

      <Text style={styles.sectionLabel}>Starred player</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
        <Text style={styles.dropdownText}>{players.find((player) => String(player.id) === String(selectedId))?.name ?? 'Select your starred player'}</Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.continueButton, !selectedId && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!selectedId}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      <Modal transparent animationType="slide" visible={dropdownVisible} onRequestClose={() => setDropdownVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select starred player</Text>
            <FlatList
              data={players}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, item.id === selectedId && styles.optionRowSelected]}
                  onPress={() => {
                    setSelectedId(item.id);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No players yet — add one above to get started.</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setDropdownVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  wideAddButton: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  wideAddButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  dropdownText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownCaret: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.lg,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  optionRow: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalCloseText: {
    color: colors.accent,
    fontWeight: '700',
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
