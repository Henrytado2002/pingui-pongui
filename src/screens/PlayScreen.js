import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import {
  fetchPlayers,
  fetchMatches,
  fetchMatchById,
  createMatch,
  updateMatchScore,
  bumpPlayerRecord,
} from '../lib/db';
import { reachedWinCondition, higherScoreSide } from '../lib/pingpong';

export default function PlayScreen({ route, navigation }) {
  const [players, setPlayers] = useState([]);
  const [onHoldMatches, setOnHoldMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [p1, setP1] = useState(null); // selected player object for the picker
  const [p2, setP2] = useState(null);

  const [match, setMatch] = useState(null); // active match row from supabase
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      const [playerList, matchList] = await Promise.all([fetchPlayers(), fetchMatches()]);
      setPlayers(playerList);
      setOnHoldMatches(
        matchList.filter((m) => !reachedWinCondition(m.p1_score, m.p2_score))
      );
    } catch (e) {
      Alert.alert('Could not load data', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists])
  );

  // Resume a specific match when navigated to with { matchId }, e.g. from the
  // Matches tab.
  useEffect(() => {
    const matchId = route.params?.matchId;
    if (!matchId) return;
    (async () => {
      try {
        const row = await fetchMatchById(matchId);
        openMatch(row);
      } catch (e) {
        Alert.alert('Could not load match', e.message);
      } finally {
        navigation.setParams({ matchId: undefined });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.matchId]);

  function openMatch(row) {
    setMatch(row);
    setS1(row.p1_score);
    setS2(row.p2_score);
  }

  async function handleStartMatch() {
    if (!p1 || !p2 || p1.id === p2.id) return;
    setBusy(true);
    try {
      const row = await createMatch(p1.id, p2.id);
      openMatch(row);
    } catch (e) {
      Alert.alert('Could not start match', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function persistScore(nextS1, nextS2) {
    try {
      await updateMatchScore(match.id, nextS1, nextS2);
    } catch (e) {
      Alert.alert('Could not save score', e.message);
    }
  }

  function addPoint(side) {
    if (!match) return;
    const nextS1 = side === 1 ? s1 + 1 : s1;
    const nextS2 = side === 2 ? s2 + 1 : s2;
    setS1(nextS1);
    setS2(nextS2);
    persistScore(nextS1, nextS2);
  }

  function undoPoint(side) {
    if (!match) return;
    const nextS1 = side === 1 ? Math.max(0, s1 - 1) : s1;
    const nextS2 = side === 2 ? Math.max(0, s2 - 1) : s2;
    setS1(nextS1);
    setS2(nextS2);
    persistScore(nextS1, nextS2);
  }

  function backToSelection() {
    setMatch(null);
    setP1(null);
    setP2(null);
    loadLists();
  }

  async function handleFinish() {
    if (!match) return;
    setBusy(true);
    try {
      await updateMatchScore(match.id, s1, s2);
      const winnerSide = higherScoreSide(s1, s2);
      if (winnerSide === 1) {
        await bumpPlayerRecord(match.p1_id, 'wins');
        await bumpPlayerRecord(match.p2_id, 'losses');
      } else if (winnerSide === 2) {
        await bumpPlayerRecord(match.p2_id, 'wins');
        await bumpPlayerRecord(match.p1_id, 'losses');
      }
      // winnerSide === null -> tie, stats left untouched
      Alert.alert(
        'Match saved',
        winnerSide === null
          ? "It's a tie — no wins or losses recorded."
          : `${winnerSide === 1 ? match.p1.name : match.p2.name} wins!`
      );
      backToSelection();
    } catch (e) {
      Alert.alert('Could not finish match', e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  // ----- Active match: scoreboard -----
  if (match) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>🏓 Live match</Text>
        <View style={styles.scoreRow}>
          <PlayerScore
            name={match.p1?.name}
            score={s1}
            onAdd={() => addPoint(1)}
            onUndo={() => undoPoint(1)}
          />
          <View style={styles.divider} />
          <PlayerScore
            name={match.p2?.name}
            score={s2}
            onAdd={() => addPoint(2)}
            onUndo={() => undoPoint(2)}
          />
        </View>
        <Text style={styles.autosaveHint}>
          Scores save automatically — safe to close the app and resume later
          from the Matches tab.
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.holdButton]}
            onPress={backToSelection}
            disabled={busy}
          >
            <Text style={styles.actionButtonText}>Hold & Exit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.finishButton]}
            onPress={handleFinish}
            disabled={busy}
          >
            <Text style={[styles.actionButtonText, styles.finishButtonText]}>
              {busy ? 'Saving…' : 'Finish Match'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ----- Selection screen -----
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>🏓 New Match</Text>

      {players.length < 2 ? (
        <Text style={styles.emptyText}>
          Add at least two players in the Players tab to start a match.
        </Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Player 1</Text>
          <ChipRow
            players={players}
            excludeId={p2?.id}
            selectedId={p1?.id}
            onSelect={setP1}
          />
          <Text style={styles.sectionLabel}>Player 2</Text>
          <ChipRow
            players={players}
            excludeId={p1?.id}
            selectedId={p2?.id}
            onSelect={setP2}
          />
          <TouchableOpacity
            style={[
              styles.startButton,
              (!p1 || !p2 || busy) && styles.addButtonDisabled,
            ]}
            onPress={handleStartMatch}
            disabled={!p1 || !p2 || busy}
          >
            <Text style={styles.startButtonText}>
              {busy ? 'Starting…' : 'Start Match'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.sectionLabel}>On hold</Text>
      <FlatList
        data={onHoldMatches}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No matches on hold.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.holdCard} onPress={() => openMatch(item)}>
            <Text style={styles.holdText}>
              {item.p1?.name} {item.p1_score} - {item.p2_score} {item.p2?.name}
            </Text>
            <Text style={styles.resumeLabel}>Resume →</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function ChipRow({ players, excludeId, selectedId, onSelect }) {
  return (
    <View style={styles.chipRow}>
      {players
        .filter((p) => p.id !== excludeId)
        .map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, selectedId === p.id && styles.chipSelected]}
            onPress={() => onSelect(p)}
          >
            <Text
              style={[
                styles.chipText,
                selectedId === p.id && styles.chipTextSelected,
              ]}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );
}

function PlayerScore({ name, score, onAdd, onUndo }) {
  return (
    <View style={styles.playerColumn}>
      <Text style={styles.playerName}>{name}</Text>
      <TouchableOpacity style={styles.scoreCircle} onPress={onAdd} activeOpacity={0.7}>
        <Text style={styles.scoreText}>{score}</Text>
      </TouchableOpacity>
      <Text style={styles.tapHint}>Tap to add point</Text>
      <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
        <Text style={styles.undoText}>Undo</Text>
      </TouchableOpacity>
    </View>
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
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontWeight: '600' },
  chipTextSelected: { color: colors.background },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.5 },
  startButtonText: { color: colors.background, fontWeight: '800', fontSize: 16 },
  holdCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holdText: { color: colors.textPrimary, fontWeight: '600', flex: 1 },
  resumeLabel: { color: colors.accent, fontWeight: '700' },

  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  divider: { width: 1, backgroundColor: colors.border },
  playerColumn: { alignItems: 'center', flex: 1 },
  playerName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  scoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: { fontSize: 44, fontWeight: '800', color: colors.accent },
  tapHint: { color: colors.textSecondary, fontSize: 11, marginTop: spacing.sm },
  undoButton: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 4 },
  undoText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  autosaveHint: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  holdButton: { backgroundColor: colors.surfaceAlt },
  finishButton: { backgroundColor: colors.accent },
  finishButtonText: { color: colors.background },
  actionButtonText: { color: colors.textPrimary, fontWeight: '700' },
});
