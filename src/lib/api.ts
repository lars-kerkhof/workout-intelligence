import { supabase } from './supabase';
import type {
  Workout,
  StrengthSet,
  CardioDetail,
  WeightEntry,
  PersonalRecord,
  Goal,
  Race,
  Route,
  WeeklySummary,
  MonthlySummary,
} from '@/types/database';

// ─── Workouts ───────────────────
export async function fetchWorkouts(limit = 50): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  return error ? [] : (data as Workout[]);
}

export async function fetchWorkoutWithDetails(id: string) {
  const [w, s, c] = await Promise.all([
    supabase.from('workouts').select('*').eq('id', id).single(),
    supabase.from('strength_sets').select('*').eq('workout_id', id).order('exercise').order('set_number'),
    supabase.from('cardio_details').select('*').eq('workout_id', id),
  ]);
  return {
    workout: w.data as Workout | null,
    sets: (s.data || []) as StrengthSet[],
    cardio: (c.data || []) as CardioDetail[],
  };
}

export async function saveWorkout(
  workout: Omit<Workout, 'id' | 'created_at' | 'updated_at'>,
  strengthSets?: Omit<StrengthSet, 'id' | 'workout_id'>[],
  cardioDetail?: Omit<CardioDetail, 'id' | 'workout_id'>
) {
  const { data: w, error } = await supabase.from('workouts').insert(workout).select().single();
  if (error) throw error;
  const saved = w as Workout;

  if (strengthSets && strengthSets.length) {
    const rows = strengthSets.map((s) => ({ ...s, workout_id: saved.id }));
    const { error: e2 } = await supabase.from('strength_sets').insert(rows);
    if (e2) throw e2;
  }
  if (cardioDetail) {
    const { error: e3 } = await supabase.from('cardio_details').insert({ ...cardioDetail, workout_id: saved.id });
    if (e3) throw e3;
  }
  return saved;
}

export async function deleteWorkout(id: string) {
  return supabase.from('workouts').delete().eq('id', id);
}

// ─── Summaries ──────────────────
export async function fetchWeeklySummary(): Promise<WeeklySummary[]> {
  const { data } = await supabase.from('weekly_summary').select('*').limit(20);
  return (data || []) as WeeklySummary[];
}

export async function fetchMonthlySummary(): Promise<MonthlySummary[]> {
  const { data } = await supabase.from('monthly_summary').select('*').limit(12);
  return (data || []) as MonthlySummary[];
}

// ─── Weight ─────────────────────
export async function fetchWeightLog(): Promise<WeightEntry[]> {
  const { data } = await supabase
    .from('weight_log')
    .select('*')
    .order('date', { ascending: false })
    .limit(90);
  return (data || []) as WeightEntry[];
}

export async function saveWeight(entry: { date: string; weight_kg: number }) {
  return supabase.from('weight_log').upsert(entry).select().single();
}

// ─── Personal Records ───────────
export async function fetchPRs(): Promise<PersonalRecord[]> {
  const { data } = await supabase
    .from('personal_records')
    .select('*')
    .order('category')
    .order('exercise');
  return (data || []) as PersonalRecord[];
}

export async function savePR(pr: Omit<PersonalRecord, 'id'>) {
  return supabase.from('personal_records').insert(pr).select().single();
}

// ─── Goals ──────────────────────
export async function fetchGoals(): Promise<Goal[]> {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .order('status')
    .order('deadline');
  return (data || []) as Goal[];
}

export async function saveGoal(goal: Omit<Goal, 'id' | 'created_at' | 'achieved_at' | 'current_value'>) {
  return supabase.from('goals').insert(goal).select().single();
}

export async function updateGoal(id: string, updates: Partial<Goal>) {
  return supabase.from('goals').update(updates).eq('id', id);
}

// ─── Races ──────────────────────
export async function fetchRaces(): Promise<Race[]> {
  const { data } = await supabase
    .from('races')
    .select('*')
    .order('date', { ascending: false });
  return (data || []) as Race[];
}

export async function saveRace(race: Omit<Race, 'id'>) {
  return supabase.from('races').insert(race).select().single();
}

// ─── Routes ─────────────────────
export async function fetchRoutes(): Promise<Route[]> {
  const { data } = await supabase
    .from('routes')
    .select('*')
    .order('name');
  return (data || []) as Route[];
}

export async function saveRoute(route: Omit<Route, 'id'>) {
  return supabase.from('routes').insert(route).select().single();
}

// ─── Distinct values for autocomplete ────
export async function fetchDistinctExercises(): Promise<string[]> {
  const { data } = await supabase.from('strength_sets').select('exercise');
  return [...new Set((data || []).map((d: { exercise: string }) => d.exercise))].sort();
}

export async function fetchDistinctActivities(): Promise<string[]> {
  const { data } = await supabase.from('cardio_details').select('activity');
  return [...new Set((data || []).map((d: { activity: string }) => d.activity))].sort();
}

export async function fetchDistinctLocations(): Promise<string[]> {
  const { data } = await supabase.from('workouts').select('location');
  return [...new Set((data || []).filter((d: { location: string | null }) => d.location).map((d: { location: string | null }) => d.location as string))].sort();
}

// ─── Dashboard extras ──────────
export async function fetchRecentPRs(limit = 3): Promise<PersonalRecord[]> {
  const { data } = await supabase
    .from('personal_records')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  return (data || []) as PersonalRecord[];
}

export async function fetchActiveGoals(): Promise<Goal[]> {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('status', 'active')
    .order('deadline');
  return (data || []) as Goal[];
}

export async function fetchRecentWeightEntries(limit = 14): Promise<WeightEntry[]> {
  const { data } = await supabase
    .from('weight_log')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  return (data || []) as WeightEntry[];
}

// ─── Progression (drill-down) ───
export async function fetchExerciseProgression(exercise: string) {
  const { data } = await supabase
    .from('strength_sets')
    .select('*, workouts!inner(date)')
    .eq('exercise', exercise)
    .order('workouts(date)');
  return data || [];
}

export async function fetchCardioProgression(activity: string) {
  const { data } = await supabase
    .from('cardio_details')
    .select('*, workouts!inner(date)')
    .eq('activity', activity)
    .order('workouts(date)');
  return data || [];
}
