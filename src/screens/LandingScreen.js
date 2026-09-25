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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { fetchPlayers, createPlayer } from '../lib/db';
import { getCurrentUserId, setCurrentUserId } from '../lib/currentUser';
import { landingStyles as styles } from './styles';

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
      <Text style={styles.title}>Who's playing?</Text>
      <Text style={styles.subtitle}>
        Choose your starred player to start tracking matches from your perspective.
      </Text>

      <Text style={styles.sectionLabel}>Starred player</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
        <Text style={styles.dropdownText}>{players.find((player) => String(player.id) === String(selectedId))?.name ?? 'Select your starred player'}</Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </TouchableOpacity>

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

