import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { WorkoutCategory } from '@/types/database';

const CATEGORIES: WorkoutCategory[] = [
  'strength', 'running', 'plyometrics', 'cardio', 'cycling', 'swimming', 'flexibility', 'sport', 'other',
];

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Prefer a service-role key when present; fall back to the anon key the app
  // already uses for inserts.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function authed(req: Request): boolean {
  const token = process.env.WORKOUT_API_TOKEN;
  if (!token) return false; // not configured → closed
  const header = req.headers.get('authorization') || '';
  return header === `Bearer ${token}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** POST — log a workout (+ optional strength sets / cardio detail / sprint reps). */
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  const category = String(body.category || '').toLowerCase() as WorkoutCategory;
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'invalid-category', allowed: CATEGORIES }, { status: 400 });
  }
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'title-required' }, { status: 400 });

  const workout = {
    date: typeof body.date === 'string' && body.date ? body.date : todayStr(),
    category,
    title,
    duration_minutes: num(body.duration_minutes),
    rpe: num(body.rpe),
    notes: body.notes ? String(body.notes) : null,
    location: body.location ? String(body.location) : null,
  };

  const supabase = db();
  const { data: saved, error } = await supabase.from('workouts').insert(workout).select().single();
  if (error) return NextResponse.json({ error: 'insert-failed', detail: error.message }, { status: 500 });

  const workoutId = (saved as { id: string }).id;

  // Strength sets
  const rawSets = Array.isArray(body.strength_sets) ? body.strength_sets : [];
  if (rawSets.length) {
    const rows = rawSets.map((s: Record<string, unknown>, i: number) => ({
      workout_id: workoutId,
      exercise: String(s.exercise || '').trim() || 'Onbekend',
      set_number: num(s.set_number) ?? i + 1,
      reps: num(s.reps),
      weight_kg: num(s.weight_kg),
      rpe: num(s.rpe),
    }));
    const { error: e2 } = await supabase.from('strength_sets').insert(rows);
    if (e2) return NextResponse.json({ error: 'sets-failed', detail: e2.message, workout: saved }, { status: 500 });
  }

  // Cardio detail
  const c = body.cardio as Record<string, unknown> | undefined;
  if (c && typeof c === 'object') {
    const row = {
      workout_id: workoutId,
      activity: String(c.activity || title).trim() || 'Cardio',
      distance_km: num(c.distance_km),
      duration_minutes: num(c.duration_minutes) ?? workout.duration_minutes,
      avg_pace_sec_per_km: num(c.avg_pace_sec_per_km),
      avg_heart_rate: num(c.avg_heart_rate),
      max_heart_rate: num(c.max_heart_rate),
      elevation_m: num(c.elevation_m),
    };
    const { error: e3 } = await supabase.from('cardio_details').insert(row);
    if (e3) return NextResponse.json({ error: 'cardio-failed', detail: e3.message, workout: saved }, { status: 500 });
  }

  // Sprint reps (plyometrics)
  const rawSprints = Array.isArray(body.sprints) ? body.sprints : [];
  if (rawSprints.length) {
    const variants = ['acceleration', 'flying', 'hill', 'resisted'];
    const rows = rawSprints.map((r: Record<string, unknown>, i: number) => {
      const rest = num(r.rest_sec);
      return {
        workout_id: workoutId,
        rep_number: num(r.rep_number) ?? i + 1,
        variant: variants.includes(String(r.variant)) ? String(r.variant) : null,
        distance_m: num(r.distance_m),
        time_sec: num(r.time_sec),
        rest_sec: rest === null ? null : Math.round(rest),
      };
    });
    const { error: e4 } = await supabase.from('sprint_reps').insert(rows);
    if (e4) return NextResponse.json({ error: 'sprints-failed', detail: e4.message, workout: saved }, { status: 500 });
  }

  return NextResponse.json({ ok: true, workout: saved }, { status: 201 });
}

/** GET — small summary for an external dashboard tile. */
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = db();

  // Monday-start week bound.
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

  const [{ data: recent }, { count: thisWeek }, { count: total }] = await Promise.all([
    supabase.from('workouts').select('id,date,category,title,duration_minutes').order('date', { ascending: false }).limit(5),
    supabase.from('workouts').select('*', { count: 'exact', head: true }).gte('date', mondayStr),
    supabase.from('workouts').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    thisWeek: thisWeek ?? 0,
    total: total ?? 0,
    latest: (recent && recent[0]) || null,
    recent: recent || [],
  });
}
