import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPlayers, createPlayer } from '../lib/db';
import { getCurrentUserId, setCurrentUserId } from '../lib/currentUser';
import CreatePlayerModal from '../components/CreatePlayerModal';
import { landingStyles as styles } from './styles';

export default function LandingScreen({ navigation }) {
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
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

  async function handleAddPlayer(first, last) {
    const sanitizedFirst = first.trim();
    const sanitizedLast = last.trim();
    if (!sanitizedFirst || !sanitizedLast) {
      Alert.alert('Add both names', 'Please enter a first name and a last name for the new player.');
      return;
    }

    const player = await createPlayer(sanitizedFirst, sanitizedLast);
    setSelectedId(player.id);
    setDropdownVisible(false);
    await load();
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

      <TouchableOpacity
        style={[styles.continueButton, !selectedId && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!selectedId}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      <CreatePlayerModal
        visible={dropdownVisible}
        title="Select starred player"
        items={players}
        selectedId={selectedId}
        onSelectItem={(item) => {
          setSelectedId(item.id);
          setDropdownVisible(false);
        }}
        onClose={() => setDropdownVisible(false)}
        onCreatePlayer={handleAddPlayer}
        emptyText="No players yet — add one to get started."
        variant="landing"
      />
    </SafeAreaView>
  );
}

