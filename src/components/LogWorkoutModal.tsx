'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorkoutCategory } from '@/types/database';
import { CATEGORIES } from '@/types/database';
import { saveWorkout, fetchDistinctExercises, fetchDistinctActivities, fetchDistinctLocations } from '@/lib/api';
import { today } from '@/lib/helpers';
import { CloseIcon, MinusIcon } from './Icons';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface ExerciseBlock {
  name: string;
  sets: { reps: string; weight: string }[];
}

interface CardioState {
  activity: string;
  distance: string;
  hrAvg: string;
  elevation: string;
}

export default function LogWorkoutModal({ onClose, onSaved }: Props) {
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState<WorkoutCategory>('strength');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [exercises, setExercises] = useState<ExerciseBlock[]>([
    { name: '', sets: [{ reps: '', weight: '' }] },
  ]);
  const [cardio, setCardio] = useState<CardioState>({
    activity: '', distance: '', hrAvg: '', elevation: '',
  });

  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [activityOptions, setActivityOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchDistinctLocations().then(setLocationOptions);
    fetchDistinctExercises().then(setExerciseOptions);
    fetchDistinctActivities().then(setActivityOptions);
  }, []);

  const updateExerciseName = useCallback((i: number, name: string) => {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, name } : ex)));
  }, []);

  const updateSet = useCallback((ei: number, si: number, field: 'reps' | 'weight', val: string) => {
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === ei
          ? { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === si ? { ...s, [field]: val } : s)) }
          : ex
      )
    );
  }, []);

  const addSet = useCallback((ei: number) => {
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === ei ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }] } : ex))
    );
  }, []);

  const removeSet = useCallback((ei: number, si: number) => {
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex))
    );
  }, []);

  const addExercise = useCallback(() => {
    setExercises((prev) => [...prev, { name: '', sets: [{ reps: '', weight: '' }] }]);
  }, []);

  const removeExercise = useCallback((i: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      const workout = {
        date,
        category,
        title: title || category,
        location: location || null,
        duration_minutes: parseInt(duration) || null,
        rpe,
        notes: notes || null,
      };

      let strengthSets: { exercise: string; set_number: number; reps: number | null; weight_kg: number | null; rpe: number | null }[] | undefined;
      let cardioDetail: { activity: string; distance_km: number | null; duration_minutes: number | null; avg_heart_rate: number | null; max_heart_rate: number | null; avg_pace_sec_per_km: number | null; elevation_m: number | null } | undefined;

      if (category === 'strength') {
        strengthSets = [];
        exercises.forEach((ex) => {
          if (!ex.name) return;
          ex.sets.forEach((s, j) => {
            strengthSets!.push({
              exercise: ex.name,
              set_number: j + 1,
              reps: parseInt(s.reps) || null,
              weight_kg: parseFloat(s.weight) || null,
              rpe: null,
            });
          });
        });
      } else if (['cardio', 'cycling', 'swimming'].includes(category)) {
        if (cardio.activity) {
          cardioDetail = {
            activity: cardio.activity,
            distance_km: parseFloat(cardio.distance) || null,
            duration_minutes: parseInt(duration) || null,
            avg_heart_rate: parseInt(cardio.hrAvg) || null,
            max_heart_rate: null,
            avg_pace_sec_per_km: null,
            elevation_m: parseInt(cardio.elevation) || null,
          };
        }
      }

      await saveWorkout(workout, strengthSets, cardioDetail);
      onSaved();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  const isCardioType = ['cardio', 'cycling', 'swimming'].includes(category);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 620 }}>
        <div className="modal-head">
          <h2>Log Workout</h2>
          <button className="btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkoutCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Upper Body, Morning Run, Bike Ride..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Basic-Fit Arena"
              list="loc-list"
            />
            <datalist id="loc-list">
              {locationOptions.map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Duration (min)</label>
            <input
              type="number"
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">RPE (Rate of Perceived Exertion)</label>
          <div className="rpe-row">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <button
                key={v}
                type="button"
                className={`rpe-btn${v >= 8 ? ' rpe-hard' : v >= 5 ? ' rpe-medium' : ''}${rpe === v ? ' active' : ''}`}
                onClick={() => setRpe(rpe === v ? null : v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic section based on category */}
        {category === 'strength' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3>Exercises</h3>
            {exercises.map((ex, i) => (
              <div className="exercise-block" key={i}>
                <div className="exercise-header">
                  <input
                    className="form-input"
                    placeholder="Exercise name"
                    value={ex.name}
                    onChange={(e) => updateExerciseName(i, e.target.value)}
                    list="ex-list"
                  />
                  {exercises.length > 1 && (
                    <button type="button" className="btn-icon" onClick={() => removeExercise(i)}>
                      <CloseIcon size={16} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 6, fontSize: 11, color: 'var(--fg-muted)', padding: '0 2px' }}>
                  <span>Set</span><span>Reps</span><span>Weight (kg)</span>
                </div>
                {ex.sets.map((s, j) => (
                  <div className="set-row" style={{ gridTemplateColumns: '40px 1fr 1fr auto' }} key={j}>
                    <span className="set-num">{j + 1}</span>
                    <input
                      type="number"
                      className="form-input"
                      value={s.reps}
                      placeholder="8"
                      onChange={(e) => updateSet(i, j, 'reps', e.target.value)}
                      style={{ padding: '6px 8px' }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      value={s.weight}
                      placeholder="80"
                      step="0.5"
                      onChange={(e) => updateSet(i, j, 'weight', e.target.value)}
                      style={{ padding: '6px 8px' }}
                    />
                    {ex.sets.length > 1 ? (
                      <button type="button" className="btn-icon" onClick={() => removeSet(i, j)} style={{ padding: 4 }}>
                        <MinusIcon />
                      </button>
                    ) : <span />}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addSet(i)}>+ Set</button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addExercise}>+ Add Exercise</button>
            <datalist id="ex-list">
              {exerciseOptions.map((e) => <option key={e} value={e} />)}
            </datalist>
          </div>
        )}

        {isCardioType && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3>{category === 'cycling' ? 'Ride' : category === 'swimming' ? 'Swim' : 'Cardio'} Details</h3>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <input
                className="form-input"
                value={cardio.activity}
                onChange={(e) => setCardio({ ...cardio, activity: e.target.value })}
                placeholder={category === 'cycling' ? 'Road ride' : category === 'swimming' ? 'Pool session' : 'Running, walking, rowing...'}
                list="act-list"
              />
              <datalist id="act-list">
                {activityOptions.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Distance (km)</label>
                <input
                  type="number"
                  className="form-input"
                  step="0.1"
                  placeholder="5.0"
                  value={cardio.distance}
                  onChange={(e) => setCardio({ ...cardio, distance: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Avg HR (bpm)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="145"
                  value={cardio.hrAvg}
                  onChange={(e) => setCardio({ ...cardio, hrAvg: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Elevation (m)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="120"
                  value={cardio.elevation}
                  onChange={(e) => setCardio({ ...cardio, elevation: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go?"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Workout'}
          </button>
        </div>
      </div>
    </div>
  );
}
