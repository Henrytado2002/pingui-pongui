import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { fetchPlayers } from '../lib/db';

const METRIC_OPTIONS = {
  wins: 'Wins',
  winRate: 'Win rate',
};

export default function PlayersScreen({ navigation }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('wins');

  const load = useCallback(async () => {
    try {
      const list = await fetchPlayers();
      setPlayers(list);
    } catch (e) {
      Alert.alert('Could not load leaderboard', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const leaderboard = useMemo(() => {
    return [...players]
      .map((player) => {
        const wins = Number(player.wins ?? 0);
        const losses = Number(player.losses ?? 0);
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        return { ...player, wins, losses, total, winRate };
      })
      .sort((a, b) => {
        if (metric === 'wins') {
          return b.wins - a.wins || b.winRate - a.winRate || a.name.localeCompare(b.name);
        }
        return b.winRate - a.winRate || b.wins - a.wins || a.name.localeCompare(b.name);
      });
  }, [metric, players]);

  function getCrown(index) {
    if (index === 0) return { icon: '👑', color: '#f4c542' };
    if (index === 1) return { icon: '👑', color: '#c9d0d8' };
    if (index === 2) return { icon: '👑', color: '#d8925a' };
    return null;
  }

  return (
    <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Leaderboard</Text>
        <TouchableOpacity style={styles.returnButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.returnButtonText}>Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricSelector}>
        {Object.entries(METRIC_OPTIONS).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.metricButton, metric === value && styles.metricButtonActive]}
            onPress={() => setMetric(value)}
          >
            <Text style={[styles.metricButtonText, metric === value && styles.metricButtonTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          ListEmptyComponent={<Text style={styles.emptyText}>No players available yet.</Text>}
          renderItem={({ item, index }) => {
            const crown = getCrown(index);
            return (
              <View
                style={[
                  styles.playerCard,
                  index === 0 && styles.cardGold,
                  index === 1 && styles.cardSilver,
                  index === 2 && styles.cardBronze,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.nameWrap}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                    <Text style={styles.playerName}>{item.name}</Text>
                  </View>
                  {crown ? (
                    <Text style={[styles.crown, { color: crown.color }]}>{crown.icon}</Text>
                  ) : null}
                </View>
                <Text style={styles.playerStats}>
                  {metric === 'wins'
                    ? `${item.wins} wins · ${item.losses} losses`
                    : `${item.winRate.toFixed(1)}% win rate`}
                </Text>
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
  pagePadding: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  returnButton: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  returnButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  metricSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.md,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricButtonActive: {
    backgroundColor: colors.accent,
  },
  metricButtonText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  metricButtonTextActive: {
    color: colors.background,
  },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardGold: { borderColor: '#f4c542' },
  cardSilver: { borderColor: '#c9d0d8' },
  cardBronze: { borderColor: '#d8925a' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  crown: {
    fontSize: 24,
  },
  rankText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  playerStats: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
});
