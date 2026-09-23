# Ping Pong Tracker

An Expo (React Native) app for tracking ping pong matches and player stats,
backed by Supabase. Charcoal + pastel red theme.

## Features
- **Players tab** — add players, see wins/losses/win rate, mark one player as
  "you" (★) so match results can be shown from your perspective.
- **Play tab** — pick two players and start a match, or resume one left "on
  hold". Tap either score circle to add a point; every point is saved to
  Supabase immediately, so you can close the app mid-game and pick up later.
  "Finish Match" locks in the result and updates both players' win/loss
  counts (a tie updates neither).
- **Matches tab** — full match history with a Win / Lost / Tied / On hold
  badge, computed relative to whichever player you starred as "you". Tap a
  match to reopen and adjust its score.

## Database (Supabase)

Uses the schema you provided, unchanged:

```sql
create table public.players (
  id uuid not null default gen_random_uuid(),
  name text,
  wins bigint not null default 0,
  losses bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint players_pkey primary key (id)
);

create table public.scores (
  id bigint generated always as identity not null,
  p1_id uuid references public.players(id),
  p2_id uuid references public.players(id),
  p1_score integer default 0,
  p2_score integer default 0,
  created_at timestamptz not null default now(),
  constraint scores_pkey primary key (id)
);
```

Run that in the Supabase SQL editor for a fresh project (or confirm your
existing tables match it — the foreign key constraint names
`scores_p1_id_fkey` / `scores_p2_id_fkey` are referenced directly in
`src/lib/db.js`).

If Row Level Security is enabled on these tables, add permissive policies for
the anon role (or your preferred auth setup) for `select`, `insert`, and
`update` — otherwise every request from the app will be rejected.

## Setup

1. Install dependencies:
   ```bash
   cd pingpong-tracker
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and
   anon key (Project Settings → API in the Supabase dashboard):
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with **Expo Go** (iOS/Android), or press `i` / `a` for a
   simulator, or `w` for web.

> Expo reads `EXPO_PUBLIC_*` env vars automatically (SDK 49+) — no extra
> config needed, just restart `expo start` after editing `.env`.

## Project structure
```
App.js                      # bottom tab navigation (Play / Matches / Players)
src/theme.js                 # charcoal + pastel red color palette
src/lib/supabase.js          # Supabase client
src/lib/db.js                # players/scores queries
src/lib/pingpong.js          # win-condition helpers (11 pts, win by 2)
src/lib/currentUser.js       # remembers which player is "you" (AsyncStorage)
src/screens/PlayScreen.js
src/screens/MatchesScreen.js
src/screens/PlayersScreen.js
```

## Notes & possible next steps
- "Tied" / "Win" / "Lost" badges compare the raw stored scores, not just
  matches that reached 11 points — so an unfinished match with equal scores
  will briefly read as on hold rather than tied.
- Stats (wins/losses) are only updated when you tap **Finish Match**; editing
  a match's score afterwards won't retroactively adjust them.
- Consider adding Supabase Auth if multiple people will use this against the
  same project, so "current user" is a real login rather than a local
  ★ marker.
