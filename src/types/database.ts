export type WorkoutCategory =
  | 'strength'
  | 'cardio'
  | 'cycling'
  | 'swimming'
  | 'flexibility'
  | 'sport'
  | 'other';

export interface Workout {
  id: string;
  date: string;
  category: WorkoutCategory;
  title: string;
  duration_minutes: number | null;
  rpe: number | null;
  notes: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrengthSet {
  id: string;
  workout_id: string;
  exercise: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
}

export interface CardioDetail {
  id: string;
  workout_id: string;
  activity: string;
  distance_km: number | null;
  duration_minutes: number | null;
  avg_pace_sec_per_km: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  elevation_m: number | null;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  notes: string | null;
}

export interface PersonalRecord {
  id: string;
  category: WorkoutCategory;
  exercise: string;
  value: number;
  unit: string;
  date: string | null;
  previous_value: number | null;
}

export interface Goal {
  id: string;
  title: string;
  category: WorkoutCategory | null;
  metric: string;
  target_value: number;
  target_unit: string;
  current_value: number | null;
  deadline: string | null;
  status: 'active' | 'achieved';
  achieved_at: string | null;
  created_at: string;
}

export interface Race {
  id: string;
  name: string;
  date: string;
  activity: string;
  distance_km: number | null;
  finish_time_seconds: number | null;
  position: number | null;
  location: string | null;
  notes: string | null;
}

export interface Route {
  id: string;
  name: string;
  activity: string;
  distance_km: number | null;
  elevation_m: number | null;
  location: string | null;
  description: string | null;
}

export interface WeeklySummary {
  week_start: string;
  category: WorkoutCategory;
  workout_count: number;
  total_minutes: number;
  avg_rpe: number | null;
}

export interface MonthlySummary {
  month_start: string;
  category: WorkoutCategory;
  workout_count: number;
  total_minutes: number;
  avg_rpe: number | null;
}

export const CATEGORIES: { id: WorkoutCategory; label: string; icon: string }[] = [
  { id: 'strength', label: 'Strength', icon: '💪' },
  { id: 'cardio', label: 'Cardio', icon: '🏃' },
  { id: 'cycling', label: 'Cycling', icon: '🚴' },
  { id: 'swimming', label: 'Swimming', icon: '🏊' },
  { id: 'flexibility', label: 'Flexibility', icon: '🧘' },
  { id: 'sport', label: 'Sport', icon: '⚽' },
  { id: 'other', label: 'Other', icon: '🎯' },
];
