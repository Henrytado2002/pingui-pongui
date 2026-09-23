export const WIN_SCORE = 11;
export const WIN_BY = 2;

// Whether a game has reached a standard table-tennis finish (11 pts, win by 2).
// Used only to surface "on hold" matches for resuming — win/loss/tied badges
// in the match list compare the raw scores directly, whatever they are.
export function reachedWinCondition(s1, s2) {
  if (s1 >= WIN_SCORE && s1 - s2 >= WIN_BY) return true;
  if (s2 >= WIN_SCORE && s2 - s1 >= WIN_BY) return true;
  return false;
}

// 1, 2, or null (tie) based on raw score comparison.
export function higherScoreSide(s1, s2) {
  if (s1 === s2) return null;
  return s1 > s2 ? 1 : 2;
}
