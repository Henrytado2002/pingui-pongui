import React, { useCallback, useState } from 'react';
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
import { fetchMatches } from '../lib/db';
import { getCurrentUserId } from '../lib/currentUser';
import { reachedWinCondition, higherScoreSide } from '../lib/pingpong';

function Badge({ label, kind }) {
  const styleMap = {
    win: { backgroundColor: colors.win, color: colors.background },
    loss: { backgroundColor: colors.loss, color: colors.textPrimary },
    tie: { backgroundColor: colors.tie, color: colors.background },
    hold: { backgroundColor: colors.surfaceAlt, color: colors.textSecondary },
  };
  const s = styleMap[kind];
  return (
    <View style={[styles.badge, { backgroundColor: s.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{label}</Text>
    </View>
  );
}

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [meId, setMeId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, me] = await Promise.all([fetchMatches(), getCurrentUserId()]);
      setMatches(list);
      setMeId(me);
    } catch (e) {
      Alert.alert('Could not load matches', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function badgeFor(item) {
    const isOnHold = !reachedWinCondition(item.p1_score, item.p2_score);
    const isMeP1 = meId && item.p1_id === meId;
    const isMeP2 = meId && item.p2_id === meId;

    if (!isMeP1 && !isMeP2) {
      return isOnHold ? <Badge label="On hold" kind="hold" /> : null;
    }

    const winnerSide = higherScoreSide(item.p1_score, item.p2_score);
    const mySide = isMeP1 ? 1 : 2;

    if (isOnHold && item.p1_score === 0 && item.p2_score === 0) {
      return <Badge label="On hold" kind="hold" />;
    }
    if (winnerSide === null) return <Badge label="Tied" kind="tie" />;
    return winnerSide === mySide ? (
      <Badge label="Win" kind="win" />
    ) : (
      <Badge label="Lost" kind="loss" />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Matches</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No matches recorded yet.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.matchCard}
              onPress={() => navigation.navigate('Play', { matchId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.matchLine}>
                  {item.p1?.name ?? 'Unknown'}{' '}
                  <Text style={styles.score}>{item.p1_score}</Text>
                  {'  -  '}
                  <Text style={styles.score}>{item.p2_score}</Text>{' '}
                  {item.p2?.name ?? 'Unknown'}
                </Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              {badgeFor(item)}
            </TouchableOpacity>
          )}
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
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  matchLine: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  score: { color: colors.accent, fontWeight: '800' },
  date: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
