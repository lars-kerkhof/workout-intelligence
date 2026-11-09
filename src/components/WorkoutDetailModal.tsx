'use client';

import { useEffect, useState } from 'react';
import type { Workout, StrengthSet, CardioDetail, SprintRep } from '@/types/database';
import { fetchWorkoutWithDetails, deleteWorkout } from '@/lib/api';
import { fmtDateFull, fmtDuration, fmtPace, fmtSprintTime, sprintKmh, rpeColor } from '@/lib/helpers';
import { CloseIcon } from './Icons';

interface Props {
  workoutId: string;
  onClose: () => void;
  onDeleted: () => void;
  onEdit: (workout: Workout, sets: StrengthSet[], cardio: CardioDetail[], sprints: SprintRep[]) => void;
}

export default function WorkoutDetailModal({ workoutId, onClose, onDeleted, onEdit }: Props) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<StrengthSet[]>([]);
  const [cardio, setCardio] = useState<CardioDetail[]>([]);
  const [sprints, setSprints] = useState<SprintRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { workout: w, sets: s, cardio: c, sprints: sp } = await fetchWorkoutWithDetails(workoutId);
      setWorkout(w);
      setSets(s);
      setCardio(c);
      setSprints(sp);
      setLoading(false);
    })();
  }, [workoutId]);

  async function handleDelete() {
    setDeleting(true);
    await deleteWorkout(workoutId);
    onDeleted();
  }

  // Group sets by exercise
  const setsGrouped: Record<string, StrengthSet[]> = {};
  sets.forEach((s) => {
    if (!setsGrouped[s.exercise]) setsGrouped[s.exercise] = [];
    setsGrouped[s.exercise].push(s);
  });

  // Best time per sprint distance
  const bestByDistance: Record<string, number> = {};
  sprints.forEach((r) => {
    if (!r.distance_m || !r.time_sec) return;
    const k = String(r.distance_m);
    if (!(k in bestByDistance) || r.time_sec < bestByDistance[k]) bestByDistance[k] = r.time_sec;
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading...</div>
        ) : !workout ? (
          <div>Workout not found.</div>
        ) : (
          <>
            <div className="modal-head">
              <h2>{workout.title}</h2>
              <button className="btn-icon" onClick={onClose}><CloseIcon /></button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`cat-badge cat-${workout.category}`}>{workout.category}</span>
              <span style={{ color: 'var(--fg-dim)', fontSize: 13 }}>{fmtDateFull(workout.date)}</span>
              {workout.location && (
                <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>📍 {workout.location}</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {workout.duration_minutes && (
                <div>
                  <span className="stat-label">Duration</span>
                  <div style={{ fontWeight: 600 }}>{fmtDuration(workout.duration_minutes)}</div>
                </div>
              )}
              {workout.rpe && (
                <div>
                  <span className="stat-label">RPE</span>
                  <div style={{ fontWeight: 700, color: rpeColor(workout.rpe) }}>{workout.rpe}/10</div>
                </div>
              )}
            </div>

            {Object.keys(setsGrouped).length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>{workout.category === 'plyometrics' ? 'Plyometrics' : 'Exercises'}</h3>
                {Object.entries(setsGrouped).map(([exercise, ss]) => (
                  <div className="exercise-block" style={{ marginBottom: 8 }} key={exercise}>
                    <div style={{ fontWeight: 600 }}>{exercise}</div>
                    {ss.map((s) => (
                      <div className="set-row" key={s.id}>
                        <span className="set-num">{s.set_number}</span>
                        <span>{s.reps || '-'} reps</span>
                        <span>{s.weight_kg || '-'} kg</span>
                        <span style={{ color: 'var(--fg-muted)' }}>{s.rpe ? 'RPE ' + s.rpe : ''}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {sprints.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>Sprints</h3>
                {Object.keys(bestByDistance).length > 0 && (
                  <div className="sprint-best-row" style={{ marginBottom: 8 }}>
                    {Object.entries(bestByDistance)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([d, t]) => (
                        <span className="sprint-best" key={d}>
                          {d}m <strong>{fmtSprintTime(t)}</strong>
                        </span>
                      ))}
                  </div>
                )}
                <div className="exercise-block">
                  {sprints.map((r) => {
                    const isBest = !!r.distance_m && !!r.time_sec && bestByDistance[String(r.distance_m)] === r.time_sec;
                    return (
                      <div className="set-row" style={{ gridTemplateColumns: '28px 1fr 1fr 1fr 1fr' }} key={r.id}>
                        <span className="set-num">{r.rep_number}</span>
                        <span>{r.distance_m ? `${r.distance_m}m` : '-'}</span>
                        <span style={{ fontWeight: isBest ? 700 : 400, color: isBest ? 'var(--cat-plyometrics)' : undefined }}>
                          {fmtSprintTime(r.time_sec)}
                        </span>
                        <span style={{ color: 'var(--fg-dim)' }}>{sprintKmh(r.distance_m, r.time_sec) ?? '-'}</span>
                        <span style={{ color: 'var(--fg-muted)' }}>
                          {r.variant ? SPRINT_VARIANT_LABEL[r.variant] : ''}{r.rest_sec ? ` · ${r.rest_sec}s rust` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {cardio.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 8 }}>{workout.category === 'running' ? 'Running' : 'Cardio'}</h3>
                {cardio.map((c) => (
                  <div className="exercise-block" style={{ marginBottom: 8 }} key={c.id}>
                    <div style={{ fontWeight: 600 }}>{c.activity}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--fg-dim)' }}>
                      {c.distance_km && <span>{c.distance_km} km</span>}
                      {c.duration_minutes && <span>{fmtDuration(c.duration_minutes)}</span>}
                      {c.avg_pace_sec_per_km && <span>{fmtPace(c.avg_pace_sec_per_km)}</span>}
                      {c.avg_heart_rate && <span>♥ {c.avg_heart_rate} bpm</span>}
                      {c.elevation_m && <span>↑ {c.elevation_m}m</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {workout.notes && (
              <div>
                <h3 style={{ marginBottom: 4 }}>Notes</h3>
                <p style={{ color: 'var(--fg-dim)', fontSize: 13, whiteSpace: 'pre-line' }}>{workout.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => workout && onEdit(workout, sets, cardio, sprints)}
              >
                ✏️ Edit
              </button>
              {!confirmDelete ? (
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              ) : (
                <div className="delete-bar">
                  Sure?{' '}
                  <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SPRINT_VARIANT_LABEL: Record<string, string> = {
  acceleration: 'Acceleratie',
  flying: 'Flying',
  hill: 'Heuvel',
  resisted: 'Slee/weerstand',
};
