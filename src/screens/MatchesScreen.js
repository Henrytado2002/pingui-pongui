import React, { useCallback, useEffect, useState } from 'react';
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
import { colors, spacing } from '../theme';
import { fetchMatches } from '../lib/db';
import { getCurrentUserId } from '../lib/currentUser';
import { reachedWinCondition, higherScoreSide } from '../lib/pingpong';

const PAGE_SIZE = 50;

function Badge({ label, kind }) {
  const styleMap = {
    win: { backgroundColor: '#34a853', color: '#ffffff' },
    loss: { backgroundColor: '#d94a4a', color: '#ffffff' },
    hold: { backgroundColor: '#f0a75d', color: '#1b1208' },
    tie: { backgroundColor: '#d9b48f', color: '#1f1a16' },
  };
  const s = styleMap[kind];
  return (
    <View style={[styles.badge, { backgroundColor: s.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{label}</Text>
    </View>
  );
}

export default function MatchesScreen({ navigation }) {
  const [scope, setScope] = useState('mine');
  const [matches, setMatches] = useState([]);
  const [meId, setMeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMatches = useCallback(
    async (append = false, currentUserId = meId) => {
      if (scope === 'mine' && !currentUserId) {
        setMatches([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      try {
        const offset = append ? matches.length : 0;
        const list = await fetchMatches({
          userId: scope === 'mine' ? currentUserId : null,
          includeAll: scope === 'all',
          limit: PAGE_SIZE,
          offset,
        });

        const visibleList =
          scope === 'all'
            ? list.filter((match) => {
                const isOnHold = !match.closed && !reachedWinCondition(match.p1_score, match.p2_score);
                return !isOnHold;
              })
            : list.filter(
                (match) =>
                  String(match.p1_id) === String(currentUserId) ||
                  String(match.p2_id) === String(currentUserId)
              );

        setMatches((current) => (append ? [...current, ...visibleList] : visibleList));
        setHasMore(visibleList.length === PAGE_SIZE);
      } catch (e) {
        Alert.alert('Could not load matches', e.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [matches.length, meId, scope]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setMatches([]);
      setHasMore(true);

      if (scope === 'mine') {
        try {
          const currentUserId = await getCurrentUserId();
          if (cancelled) return;
          setMeId(currentUserId);
          if (!currentUserId) {
            setLoading(false);
            return;
          }
          await loadMatches(false, currentUserId);
        } catch (e) {
          Alert.alert('Could not load current user', e.message);
          if (!cancelled) setLoading(false);
        }
        return;
      }

      try {
        await loadMatches(false, meId);
      } catch (e) {
        Alert.alert('Could not load matches', e.message);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [scope, meId]);

  function badgeFor(item) {
    if (scope !== 'mine') return null;

    const isOnHold = !item.closed && !reachedWinCondition(item.p1_score, item.p2_score);
    const isMeP1 = String(item.p1_id) === String(meId);
    const isMeP2 = String(item.p2_id) === String(meId);
    const winnerSide = higherScoreSide(item.p1_score, item.p2_score);
    const mySide = isMeP1 ? 1 : 2;

    if (isOnHold) return <Badge label="On hold" kind="hold" />;
    if (winnerSide === null) return <Badge label="Tied" kind="tie" />;
    if (!isMeP1 && !isMeP2) return null;
    return winnerSide === mySide ? (
      <Badge label="Win" kind="win" />
    ) : (
      <Badge label="Loss" kind="loss" />
    );
  }

  function leftSideFor(item) {
    if (scope === 'mine') {
      const isMeP1 = String(item.p1_id) === String(meId);
      if (isMeP1) {
        return { name: item.p1?.name ?? 'Unknown', score: item.p1_score, opponent: item.p2 };
      }
      return { name: item.p2?.name ?? 'Unknown', score: item.p2_score, opponent: item.p1 };
    }

    const winnerSide = higherScoreSide(item.p1_score, item.p2_score);
    if (winnerSide === 1) {
      return { name: item.p1?.name ?? 'Unknown', score: item.p1_score, opponent: item.p2 };
    }
    if (winnerSide === 2) {
      return { name: item.p2?.name ?? 'Unknown', score: item.p2_score, opponent: item.p1 };
    }
    return { name: item.p1?.name ?? 'Unknown', score: item.p1_score, opponent: item.p2 };
  }

  const matchesToRender = matches.filter((item) => {
    if (scope === 'all') {
      const isOnHold = !item.closed && !reachedWinCondition(item.p1_score, item.p2_score);
      return !isOnHold;
    }
    if (!meId) return false;
    return String(item.p1_id) === String(meId) || String(item.p2_id) === String(meId);
  });

  return (
    <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Match History</Text>
        <TouchableOpacity style={styles.returnButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.returnButtonText}>Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scopeSelector}>
        <TouchableOpacity
          style={[styles.scopeButton, scope === 'mine' && styles.scopeButtonActive]}
          onPress={() => setScope('mine')}
        >
          <Text style={[styles.scopeButtonText, scope === 'mine' && styles.scopeButtonTextActive]}>
            My games
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeButton, scope === 'all' && styles.scopeButtonActive]}
          onPress={() => setScope('all')}
        >
          <Text style={[styles.scopeButtonText, scope === 'all' && styles.scopeButtonTextActive]}>
            Global
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={matchesToRender}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          onEndReached={() => {
            if (!hasMore || loadingMore) return;
            setLoadingMore(true);
            loadMatches(true, meId);
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {scope === 'all' ? 'No finished matches available.' : 'No matches recorded yet.'}
            </Text>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null
          }
          renderItem={({ item }) => {
            const left = leftSideFor(item);
            const opposite =
              scope === 'mine'
                ? String(item.p1_id) === String(meId)
                  ? item.p2
                  : item.p1
                : higherScoreSide(item.p1_score, item.p2_score) === 1
                  ? item.p2
                  : item.p1;
            return (
              <TouchableOpacity style={styles.matchCard} onPress={() => navigation.navigate('Play', { matchId: item.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchLine}>
                    <Text style={styles.playerNameText}>{left.name}</Text>{' '}
                    <Text style={styles.score}>{left.score}</Text>
                    {' - '}
                    <Text style={styles.score}>{scope === 'mine'
                      ? String(item.p1_id) === String(meId)
                        ? item.p2_score
                        : item.p1_score
                      : higherScoreSide(item.p1_score, item.p2_score) === 1
                        ? item.p2_score
                        : item.p1_score}</Text>{' '}
                    <Text style={styles.opponentName}>{opposite?.name ?? 'Unknown'}</Text>
                  </Text>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
                {badgeFor(item)}
              </TouchableOpacity>
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
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.md,
  },
  scopeButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scopeButtonActive: {
    backgroundColor: colors.accent,
  },
  scopeButtonText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  scopeButtonTextActive: {
    color: colors.background,
  },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  matchLine: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  playerNameText: { color: colors.textPrimary, fontWeight: '800' },
  opponentName: { color: colors.textSecondary },
  score: { color: colors.accent, fontWeight: '800' },
  date: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
