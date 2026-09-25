import React, { useCallback, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPlayers } from '../lib/db';
import { getCurrentUserId } from '../lib/currentUser';
import { settingsStyles as styles } from './styles';

export default function SettingsScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState('Player');

  const loadUser = useCallback(async () => {
    try {
      const meId = await getCurrentUserId();
      if (!meId) {
        navigation.replace('Landing');
        return;
      }
      const players = await fetchPlayers();
      const me = players.find((player) => String(player.id) === String(meId));
      setCurrentUser(me?.name ?? 'Player');
    } catch (e) {
      Alert.alert('Could not load settings', e.message);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  return (
    <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.returnButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.returnButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Starred player</Text>
        <Text style={styles.value}>{currentUser}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Match rules</Text>
        <Text style={styles.value}>Only games involving your starred player are recorded.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Locking</Text>
        <Text style={styles.value}>A match is locked once a standard win condition is reached and cannot be edited.</Text>
      </View>
    </SafeAreaView>
  );
}

