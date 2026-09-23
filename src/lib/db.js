import { supabase } from './supabase';

const MATCH_SELECT =
  '*, p1:players!scores_p1_id_fkey(id,name), p2:players!scores_p2_id_fkey(id,name)';

export async function fetchPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPlayer(name) {
  const { data, error } = await supabase
    .from('players')
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMatches() {
  const { data, error } = await supabase
    .from('scores')
    .select(MATCH_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMatchById(id) {
  const { data, error } = await supabase
    .from('scores')
    .select(MATCH_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createMatch(p1Id, p2Id) {
  const { data, error } = await supabase
    .from('scores')
    .insert({ p1_id: p1Id, p2_id: p2Id, p1_score: 0, p2_score: 0 })
    .select(MATCH_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMatchScore(id, p1Score, p2Score) {
  const { data, error } = await supabase
    .from('scores')
    .update({ p1_score: p1Score, p2_score: p2Score })
    .eq('id', id)
    .select(MATCH_SELECT)
    .single();
  if (error) throw error;
  return data;
}

// Increments a single stats column ('wins' or 'losses') for a player by 1.
export async function bumpPlayerRecord(playerId, field) {
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select(field)
    .eq('id', playerId)
    .single();
  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from('players')
    .update({ [field]: (player[field] ?? 0) + 1 })
    .eq('id', playerId);
  if (updateError) throw updateError;
}
