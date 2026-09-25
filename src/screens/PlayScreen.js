import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { getCurrentUserId } from '../lib/currentUser';
import { reachedWinCondition, higherScoreSide } from '../lib/pingpong';

function PlayerScore({ name, score, onAdd, onUndo, disabled }) {
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.playerName}>{name}</Text>
      <Text style={styles.scoreValue}>{score}</Text>
      <View style={styles.scoreButtons}>
        <TouchableOpacity
          style={[styles.scoreButton, disabled && styles.disabledButton]}
          onPress={onAdd}
          disabled={disabled}
        >
          <Text style={styles.scoreButtonText}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scoreButton, styles.scoreUndo, disabled && styles.disabledButton]}
          onPress={onUndo}
          disabled={disabled}
        >
          <Text style={styles.scoreButtonText}>-1</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PlayScreen({ route, navigation }) {
  const [players, setPlayers] = useState([]);
  const [onHoldMatches, setOnHoldMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState(null);
  const [opponentId, setOpponentId] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [match, setMatch] = useState(null);
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [busy, setBusy] = useState(false);

  const me = useMemo(
    () => players.find((player) => String(player.id) === String(meId)) ?? null,
    [players, meId]
  );
  const opponent = useMemo(
    () => players.find((player) => String(player.id) === String(opponentId)) ?? null,
    [players, opponentId]
  );

  const loadLists = useCallback(async () => {
    try {
      const [playerList, matchList, currentId] = await Promise.all([
        fetchPlayers(),
        fetchMatches(),
        getCurrentUserId(),
      ]);

      if (!currentId) {
        navigation.replace('Landing');
        return;
      }

      setPlayers(playerList);
      setMeId(currentId);
      setOnHoldMatches(matchList.filter((m) => !reachedWinCondition(m.p1_score, m.p2_score)));

      const eligibleOpponents = playerList.filter((player) => String(player.id) !== String(currentId));
      if (!eligibleOpponents.length) {
        setOpponentId(null);
        return;
      }

      setOpponentId((previous) => {
        if (previous && eligibleOpponents.some((player) => String(player.id) === String(previous))) {
          return previous;
        }
        return eligibleOpponents[0].id;
      });
    } catch (e) {
      Alert.alert('Could not load data', e.message);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists])
  );

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
  }, [route.params?.matchId, navigation]);

  function openMatch(row) {
    setMatch(row);
    setS1(row.p1_score);
    setS2(row.p2_score);
  }

  function backToSelection() {
    setMatch(null);
    setS1(0);
    setS2(0);
  }

  async function persistScore(nextS1, nextS2) {
    try {
      await updateMatchScore(match.id, nextS1, nextS2);
    } catch (e) {
      Alert.alert('Could not save score', e.message);
    }
  }

  function addPoint(side) {
    if (!match || reachedWinCondition(s1, s2)) return;
    const nextS1 = side === 1 ? s1 + 1 : s1;
    const nextS2 = side === 2 ? s2 + 1 : s2;
    const nextLocked = reachedWinCondition(nextS1, nextS2);
    setS1(nextS1);
    setS2(nextS2);
    persistScore(nextS1, nextS2);
    if (nextLocked) {
      Alert.alert('Match locked', 'This game is complete and can no longer be edited.');
    }
  }

  function undoPoint(side) {
    if (!match || reachedWinCondition(s1, s2)) return;
    const nextS1 = side === 1 ? Math.max(0, s1 - 1) : s1;
    const nextS2 = side === 2 ? Math.max(0, s2 - 1) : s2;
    setS1(nextS1);
    setS2(nextS2);
    persistScore(nextS1, nextS2);
  }

  async function handleStartMatch() {
    if (!meId || !opponentId || meId === opponentId) return;
    setBusy(true);
    try {
      const row = await createMatch(meId, opponentId);
      openMatch(row);
    } catch (e) {
      Alert.alert('Could not start match', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    if (!match) return;
    if (reachedWinCondition(s1, s2)) {
      Alert.alert('Match locked', 'This match has already been locked and cannot be edited.');
      return;
    }

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

  if (match) {
    const isLocked = reachedWinCondition(s1, s2);
    return (
      <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Live match</Text>
          <TouchableOpacity style={styles.returnButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.returnButtonText}>Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoreRow}>
          <PlayerScore
            name={match.p1?.name ?? 'Player 1'}
            score={s1}
            onAdd={() => addPoint(1)}
            onUndo={() => undoPoint(1)}
            disabled={isLocked}
          />
          <View style={styles.divider} />
          <PlayerScore
            name={match.p2?.name ?? 'Player 2'}
            score={s2}
            onAdd={() => addPoint(2)}
            onUndo={() => undoPoint(2)}
            disabled={isLocked}
          />
        </View>

        {isLocked ? (
          <Text style={styles.lockedText}>Locked — this match can no longer be edited.</Text>
        ) : (
          <Text style={styles.autosaveHint}>Scores save automatically while the match is active.</Text>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.holdButton]}
            onPress={backToSelection}
            disabled={busy}
          >
            <Text style={styles.actionButtonText}>Hold & Exit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.finishButton, isLocked && styles.disabledButton]}
            onPress={handleFinish}
            disabled={busy || isLocked}
          >
            <Text style={[styles.actionButtonText, styles.finishButtonText]}>
              {busy ? 'Saving…' : isLocked ? 'Locked' : 'Finish Match'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const opponentOptions = players.filter((player) => String(player.id) !== String(meId));
  const canStart = !!meId && !!opponentId && meId !== opponentId;

  return (
    <SafeAreaView style={[styles.safeArea, styles.pagePadding]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>New Match</Text>
        <TouchableOpacity style={styles.returnButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.returnButtonText}>Home</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your player</Text>
      <View style={styles.playerChipRow}>
        <Text style={styles.playerChip}>{me?.name ?? 'Choose your starred player'}</Text>
      </View>

      <Text style={styles.sectionLabel}>Opponent</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
        <Text style={styles.dropdownText}>{opponent ? opponent.name : 'Select opponent'}</Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </TouchableOpacity>

      {opponentOptions.length === 0 ? (
        <Text style={styles.emptyText}>Add another player in the Players screen before recording a match.</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.startButton, (!canStart || busy) && styles.addButtonDisabled]}
        onPress={handleStartMatch}
        disabled={!canStart || busy}
      >
        <Text style={styles.startButtonText}>{busy ? 'Starting…' : 'Start Match'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>On hold</Text>
      <FlatList
        data={onHoldMatches}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        ListEmptyComponent={<Text style={styles.emptyText}>No matches on hold.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.holdCard} onPress={() => openMatch(item)}>
            <Text style={styles.holdText}>
              {item.p1?.name} {item.p1_score} - {item.p2_score} {item.p2?.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal transparent animationType="slide" visible={dropdownVisible} onRequestClose={() => setDropdownVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select opponent</Text>
            <FlatList
              data={opponentOptions}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setOpponentId(item.id);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
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
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  playerChipRow: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  playerChip: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownCaret: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    marginTop: spacing.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.55 },
  startButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  holdCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holdText: { color: colors.textPrimary, fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  scoreValue: {
    color: colors.accent,
    fontSize: 54,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 50,
  },
  scoreUndo: { backgroundColor: colors.surfaceAlt },
  scoreButtonText: {
    color: colors.background,
    fontWeight: '800',
  },
  disabledButton: { opacity: 0.45 },
  autosaveHint: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  lockedText: {
    marginTop: spacing.md,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  holdButton: { backgroundColor: colors.surfaceAlt },
  finishButton: { backgroundColor: colors.accent },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  finishButtonText: { color: colors.background },
  divider: { width: 1, backgroundColor: colors.border },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: spacing.lg,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 18,
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
  optionText: {
    color: colors.textPrimary,
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
});
