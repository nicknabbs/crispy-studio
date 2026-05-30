-- "Numbers Go Up" leaderboard.
--
-- Net-new, additive: does not touch the existing `leaderboard` table, so
-- existing players and existing leaderboards are unaffected. The score is a
-- big-number stored as mantissa (1 ≤ m < 10) + exponent, so ranking is a
-- plain ORDER BY exponent DESC, mantissa DESC.
--
-- RLS: public read; writes go ONLY through submit_ngu_score(), a
-- security-definer RPC that compares the incoming value against the existing
-- row and writes only when it's strictly higher (so a player's best can't go
-- down, and one player can't overwrite another's row).

create table if not exists public.ngu_leaderboard (
  player_id   text primary key,
  player_name text not null,
  mantissa    double precision not null,
  exponent    integer not null,
  updated_at  timestamptz not null default now()
);

create index if not exists ngu_leaderboard_rank_idx
  on public.ngu_leaderboard (exponent desc, mantissa desc);

alter table public.ngu_leaderboard enable row level security;

-- Anyone can read the board.
drop policy if exists ngu_leaderboard_read on public.ngu_leaderboard;
create policy ngu_leaderboard_read
  on public.ngu_leaderboard
  for select
  using (true);

-- No direct insert/update/delete from clients — writes happen via the RPC
-- below (security definer). Intentionally no INSERT/UPDATE/DELETE policies.

-- Upsert-if-higher. SECURITY DEFINER so the anon client can call it while the
-- "only write if strictly greater" rule is enforced server-side.
create or replace function public.submit_ngu_score(
  p_player_id   text,
  p_player_name text,
  p_mantissa    double precision,
  p_exponent    integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(coalesce(p_player_name, ''), 20);
begin
  if p_player_id is null or length(trim(v_name)) = 0 then
    return;
  end if;
  -- Reject non-finite / malformed mantissa.
  if p_mantissa is null or p_exponent is null or p_mantissa <> p_mantissa then
    return;
  end if;

  insert into public.ngu_leaderboard (player_id, player_name, mantissa, exponent, updated_at)
  values (p_player_id, v_name, p_mantissa, p_exponent, now())
  on conflict (player_id) do update
    set player_name = excluded.player_name,
        mantissa    = excluded.mantissa,
        exponent    = excluded.exponent,
        updated_at  = now()
  where
    -- only when the new value is strictly higher (exponent first, then mantissa)
    (excluded.exponent > public.ngu_leaderboard.exponent)
    or (excluded.exponent = public.ngu_leaderboard.exponent
        and excluded.mantissa > public.ngu_leaderboard.mantissa);
end;
$$;

grant execute on function public.submit_ngu_score(text, text, double precision, integer) to anon, authenticated;
