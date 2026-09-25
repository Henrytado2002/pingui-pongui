import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
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
  createPlayer,
  updateMatchScore,
  bumpPlayerRecord,
  closeMatch,
} from '../lib/db';
import { getCurrentUserId } from '../lib/currentUser';
import { reachedWinCondition, higherScoreSide } from '../lib/pingpong';
import CreatePlayerModal from '../components/CreatePlayerModal';
import { playStyles as styles } from './styles';

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

  async function addPoint(side) {
    if (!match || match.closed || reachedWinCondition(s1, s2)) return;
    const nextS1 = side === 1 ? s1 + 1 : s1;
    const nextS2 = side === 2 ? s2 + 1 : s2;
    const nextLocked = reachedWinCondition(nextS1, nextS2);
    setS1(nextS1);
    setS2(nextS2);
    await persistScore(nextS1, nextS2);
    if (nextLocked) {
      try {
        await closeMatch(match.id);
        setMatch((current) => ({ ...current, closed: true, p1_score: nextS1, p2_score: nextS2 }));
      } catch (e) {
        Alert.alert('Could not lock match', e.message);
      }
      Alert.alert('Match locked', 'This game is complete and can no longer be edited.');
    }
  }

  function undoPoint(side) {
    if (!match || match.closed || reachedWinCondition(s1, s2)) return;
    const nextS1 = side === 1 ? Math.max(0, s1 - 1) : s1;
    const nextS2 = side === 2 ? Math.max(0, s2 - 1) : s2;
    setS1(nextS1);
    setS2(nextS2);
    persistScore(nextS1, nextS2);
  }

  async function handleAddOpponent(first, last) {
    const sanitizedFirst = first.trim();
    const sanitizedLast = last.trim();
    if (!sanitizedFirst || !sanitizedLast) {
      Alert.alert('Add both names', 'Please enter both a first name and a last name.');
      return;
    }

    const player = await createPlayer(sanitizedFirst, sanitizedLast);
    await loadLists();
    setOpponentId(player.id);
    setDropdownVisible(false);
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
    if (!match || match.closed) return;
    if (reachedWinCondition(s1, s2)) {
      Alert.alert('Match locked', 'This match has already been locked and cannot be edited.');
      return;
    }

    setBusy(true);
    try {
      await updateMatchScore(match.id, s1, s2);
      await closeMatch(match.id);
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
      setMatch({ ...match, closed: true, p1_score: s1, p2_score: s2 });
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
        <Text style={styles.emptyText}>Add another player before recording a match.</Text>
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

      <CreatePlayerModal
        visible={dropdownVisible}
        title="Select opponent"
        items={opponentOptions}
        selectedId={opponentId}
        onSelectItem={(item) => {
          setOpponentId(item.id);
          setDropdownVisible(false);
        }}
        onClose={() => setDropdownVisible(false)}
        onCreatePlayer={handleAddOpponent}
        emptyText="Add another player before recording a match."
        variant="match"
      />
    </SafeAreaView>
  );
}

