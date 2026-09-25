import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPlayers } from '../lib/db';
import { getCurrentUserId, setCurrentUserId } from '../lib/currentUser';
import { homeStyles as styles } from './styles';

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
          <Text style={styles.mainButtonTitle}>Leaderboard</Text>
          <Text style={styles.mainButtonSub}>See wins and win rate</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

