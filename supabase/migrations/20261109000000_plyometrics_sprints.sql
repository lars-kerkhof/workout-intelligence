-- Plyo / Sprints category + per-rep sprint tracking.
-- Run once in the Supabase SQL editor (or via `supabase db push`).

-- 1. Allow the new 'plyometrics' category on workouts.category.
--    Works whether the column is an enum type or text with a CHECK constraint.
do $$
declare
  col_type oid;
  con record;
begin
  select a.atttypid into col_type
  from pg_attribute a
  where a.attrelid = 'public.workouts'::regclass and a.attname = 'category';

  if exists (select 1 from pg_type t where t.oid = col_type and t.typtype = 'e') then
    execute format('alter type %s add value if not exists %L', col_type::regtype, 'plyometrics');
  else
    for con in
      select conname from pg_constraint
      where conrelid = 'public.workouts'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%category%'
    loop
      execute format('alter table public.workouts drop constraint %I', con.conname);
    end loop;
    alter table public.workouts add constraint workouts_category_check check (category in (
      'strength', 'running', 'plyometrics', 'cardio', 'cycling', 'swimming', 'flexibility', 'sport', 'other'
    ));
  end if;
end $$;

-- 2. Individual sprint reps (distance + time), linked to a workout.
create table if not exists public.sprint_reps (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  rep_number integer not null,
  variant text check (variant in ('acceleration', 'flying', 'hill', 'resisted')),
  distance_m numeric,
  time_sec numeric,
  rest_sec integer,
  created_at timestamptz not null default now()
);

create index if not exists sprint_reps_workout_id_idx on public.sprint_reps (workout_id);

-- 3. Same access model as the other detail tables (anon key from the app).
alter table public.sprint_reps enable row level security;
drop policy if exists "sprint_reps all access" on public.sprint_reps;
create policy "sprint_reps all access" on public.sprint_reps for all using (true) with check (true);
