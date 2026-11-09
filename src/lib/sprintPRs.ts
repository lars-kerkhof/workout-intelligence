import type { SupabaseClient } from '@supabase/supabase-js';
import type { SprintVariant } from '@/types/database';

/** Sprint distances that count as an official attempt / PR. */
export const SPRINT_PR_DISTANCES = [60, 100, 200, 400, 800];

export function sprintPRName(distanceM: number): string {
  return `${distanceM}m Sprint`;
}

/** Only standing-start sprints count: flying is too fast, hill/sled too slow. */
export function variantCountsForPR(variant: SprintVariant | null | undefined): boolean {
  return !variant || variant === 'acceleration';
}

/** Current best time (sec) per PR distance, from personal_records. */
export async function fetchSprintBests(db: SupabaseClient): Promise<Record<number, number>> {
  const { data } = await db
    .from('personal_records')
    .select('exercise, value')
    .eq('category', 'plyometrics')
    .in('exercise', SPRINT_PR_DISTANCES.map(sprintPRName));
  const best: Record<number, number> = {};
  (data || []).forEach((r: { exercise: string; value: number }) => {
    const d = parseInt(r.exercise);
    if (!(d in best) || r.value < best[d]) best[d] = r.value;
  });
  return best;
}

/**
 * For each PR distance, take the fastest rep and save it as a new PR when it
 * beats the current best (or when there is no record yet). Every rep itself is
 * already kept as an attempt in sprint_reps. Returns the new PRs.
 */
export async function recordSprintPRs(
  db: SupabaseClient,
  reps: { distance_m: number | null; time_sec: number | null; variant?: SprintVariant | null }[],
  date: string
): Promise<{ distance: number; time: number; previous: number | null }[]> {
  const fastest: Record<number, number> = {};
  reps.forEach((r) => {
    if (!r.distance_m || !r.time_sec || !variantCountsForPR(r.variant)) return;
    if (!SPRINT_PR_DISTANCES.includes(r.distance_m)) return;
    if (!(r.distance_m in fastest) || r.time_sec < fastest[r.distance_m]) fastest[r.distance_m] = r.time_sec;
  });
  if (!Object.keys(fastest).length) return [];

  const bests = await fetchSprintBests(db);
  const newPRs = Object.entries(fastest)
    .map(([d, t]) => ({ distance: Number(d), time: t, previous: bests[Number(d)] ?? null }))
    .filter((p) => p.previous === null || p.time < p.previous);
  if (!newPRs.length) return [];

  const { error } = await db.from('personal_records').insert(
    newPRs.map((p) => ({
      category: 'plyometrics',
      exercise: sprintPRName(p.distance),
      value: p.time,
      unit: 'sec',
      date,
      previous_value: p.previous,
    }))
  );
  if (error) throw error;
  return newPRs;
}

export interface SprintAttempt {
  id: string;
  distance_m: number;
  time_sec: number;
  variant: SprintVariant | null;
  date: string;
}

/** All attempts at the PR distances, newest first. */
export async function fetchSprintAttempts(db: SupabaseClient): Promise<SprintAttempt[]> {
  const { data } = await db
    .from('sprint_reps')
    .select('id, distance_m, time_sec, variant, workouts!inner(date)')
    .in('distance_m', SPRINT_PR_DISTANCES)
    .not('time_sec', 'is', null);
  return ((data || []) as unknown as (Omit<SprintAttempt, 'date'> & { workouts: { date: string } })[])
    .filter((r) => variantCountsForPR(r.variant))
    .map((r) => ({ id: r.id, distance_m: Number(r.distance_m), time_sec: Number(r.time_sec), variant: r.variant, date: r.workouts.date }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
