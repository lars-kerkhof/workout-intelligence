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

// ── Running / Interval types ──
type RunType = 'easy' | 'tempo' | 'intervals' | 'long' | 'fartlek' | 'recovery';

const RUN_TYPES: { id: RunType; label: string; icon: string }[] = [
  { id: 'easy', label: 'Easy Run', icon: '🏃' },
  { id: 'tempo', label: 'Tempo', icon: '⚡' },
  { id: 'intervals', label: 'Intervals', icon: '🔁' },
  { id: 'long', label: 'Long Run', icon: '📏' },
  { id: 'fartlek', label: 'Fartlek', icon: '🎲' },
  { id: 'recovery', label: 'Recovery', icon: '🧊' },
];

interface IntervalConfig {
  template: string;
  warmup: string;   // minutes
  repeats: string;
  workMin: string;
  workSec: string;
  restMin: string;
  restSec: string;
  cooldown: string;  // minutes
}

const INTERVAL_TEMPLATES: { id: string; name: string; desc: string; config: Omit<IntervalConfig, 'template'> }[] = [
  { id: 'norwegian44', name: 'Norwegian 4×4', desc: '4× 4:00 hard / 3:00 rust', config: { warmup: '10', repeats: '4', workMin: '4', workSec: '0', restMin: '3', restSec: '0', cooldown: '5' } },
  { id: '10x400', name: '10× 400m', desc: '10× 1:30 / 1:30 rust', config: { warmup: '10', repeats: '10', workMin: '1', workSec: '30', restMin: '1', restSec: '30', cooldown: '5' } },
  { id: '8x200', name: '8× 200m', desc: '8× 0:40 / 1:00 rust', config: { warmup: '10', repeats: '8', workMin: '0', workSec: '40', restMin: '1', restSec: '0', cooldown: '5' } },
  { id: '5x1000', name: '5× 1000m', desc: '5× 3:30 / 2:00 rust', config: { warmup: '10', repeats: '5', workMin: '3', workSec: '30', restMin: '2', restSec: '0', cooldown: '5' } },
  { id: 'yasso800', name: 'Yasso 800s', desc: '10× 3:00 / 3:00 rust', config: { warmup: '15', repeats: '10', workMin: '3', workSec: '0', restMin: '3', restSec: '0', cooldown: '10' } },
  { id: '6x800', name: '6× 800m', desc: '6× 2:45 / 2:00 rust', config: { warmup: '10', repeats: '6', workMin: '2', workSec: '45', restMin: '2', restSec: '0', cooldown: '5' } },
];

const DEFAULT_INTERVAL: IntervalConfig = {
  template: '',
  warmup: '10',
  repeats: '4',
  workMin: '4',
  workSec: '0',
  restMin: '3',
  restSec: '0',
  cooldown: '5',
};

export default function LogWorkoutModal({ onClose, onSaved }: Props) {
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState<WorkoutCategory>('strength');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Strength state
  const [exercises, setExercises] = useState<ExerciseBlock[]>([
    { name: '', sets: [{ reps: '', weight: '' }] },
  ]);

  // Cardio state (also used for running aggregate metrics)
  const [cardio, setCardio] = useState<CardioState>({
    activity: '', distance: '', hrAvg: '', elevation: '',
  });

  // Running-specific state
  const [runType, setRunType] = useState<RunType>('easy');
  const [avgPace, setAvgPace] = useState('');
  const [interval, setInterval] = useState<IntervalConfig>(DEFAULT_INTERVAL);

  // Autocomplete options
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [activityOptions, setActivityOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchDistinctLocations().then(setLocationOptions);
    fetchDistinctExercises().then(setExerciseOptions);
    fetchDistinctActivities().then(setActivityOptions);
  }, []);

  // ── Strength helpers ──
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

  // ── Interval helpers ──
  function applyTemplate(tplId: string) {
    const tpl = INTERVAL_TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      setInterval({ template: tplId, ...tpl.config });
    } else {
      setInterval({ ...DEFAULT_INTERVAL, template: 'custom' });
    }
  }

  function updateInterval(field: keyof IntervalConfig, val: string) {
    setInterval((prev) => ({ ...prev, [field]: val, template: 'custom' }));
  }

  function buildIntervalNotes(): string {
    const w = parseInt(interval.warmup) || 0;
    const r = parseInt(interval.repeats) || 0;
    const wMin = parseInt(interval.workMin) || 0;
    const wSec = parseInt(interval.workSec) || 0;
    const rMin = parseInt(interval.restMin) || 0;
    const rSec = parseInt(interval.restSec) || 0;
    const c = parseInt(interval.cooldown) || 0;

    const workStr = `${wMin}:${String(wSec).padStart(2, '0')}`;
    const restStr = `${rMin}:${String(rSec).padStart(2, '0')}`;

    const tpl = INTERVAL_TEMPLATES.find((t) => t.id === interval.template);
    const name = tpl ? tpl.name : 'Aangepast';

    const totalWork = r * (wMin * 60 + wSec);
    const totalRest = r * (rMin * 60 + rSec);
    const totalSec = w * 60 + totalWork + totalRest + c * 60;
    const totalMin = Math.round(totalSec / 60);

    const lines = [
      `🔁 ${name}`,
      `Opwarming: ${w} min · ${r}× ${workStr} werk / ${restStr} rust · Cooldown: ${c} min`,
      `Geschatte duur: ${totalMin} min`,
    ];
    return lines.join('\n');
  }

  function getIntervalBlocks() {
    const w = parseInt(interval.warmup) || 0;
    const r = parseInt(interval.repeats) || 0;
    const wMin = parseInt(interval.workMin) || 0;
    const wSec = parseInt(interval.workSec) || 0;
    const rMin = parseInt(interval.restMin) || 0;
    const rSec = parseInt(interval.restSec) || 0;
    const c = parseInt(interval.cooldown) || 0;

    const workDur = wMin * 60 + wSec;
    const restDur = rMin * 60 + rSec;

    const blocks: { type: 'warmup' | 'work' | 'rest' | 'cooldown'; seconds: number; label: string }[] = [];

    if (w > 0) blocks.push({ type: 'warmup', seconds: w * 60, label: `${w}'` });
    for (let i = 0; i < r; i++) {
      if (workDur > 0) {
        const wLabel = workDur >= 60
          ? `${Math.floor(workDur / 60)}:${String(workDur % 60).padStart(2, '0')}`
          : `${workDur}s`;
        blocks.push({ type: 'work', seconds: workDur, label: wLabel });
      }
      if (restDur > 0 && i < r - 1) {
        const rLabel = restDur >= 60
          ? `${Math.floor(restDur / 60)}:${String(restDur % 60).padStart(2, '0')}`
          : `${restDur}s`;
        blocks.push({ type: 'rest', seconds: restDur, label: rLabel });
      }
    }
    if (c > 0) blocks.push({ type: 'cooldown', seconds: c * 60, label: `${c}'` });

    return blocks;
  }

  // ── Save ──
  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      // Build interval notes for running intervals
      let combinedNotes = notes;
      if (category === 'running' && runType === 'intervals') {
        const intervalText = buildIntervalNotes();
        combinedNotes = notes ? `${intervalText}\n\n${notes}` : intervalText;
      }

      // Auto-generate title if empty
      let autoTitle = title;
      if (!autoTitle) {
        if (category === 'running') {
          const rt = RUN_TYPES.find((t) => t.id === runType);
          if (runType === 'intervals' && interval.template) {
            const tpl = INTERVAL_TEMPLATES.find((t) => t.id === interval.template);
            autoTitle = tpl ? tpl.name : (rt?.label || 'Intervals');
          } else {
            autoTitle = rt?.label || 'Run';
          }
        } else {
          autoTitle = category;
        }
      }

      const workout = {
        date,
        category,
        title: autoTitle,
        location: location || null,
        duration_minutes: parseInt(duration) || null,
        rpe,
        notes: combinedNotes || null,
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
      } else if (['running', 'cardio', 'cycling', 'swimming'].includes(category)) {
        const act = category === 'running'
          ? (RUN_TYPES.find((t) => t.id === runType)?.label || 'Run')
          : cardio.activity;
        if (act) {
          // Parse pace (mm:ss format to seconds per km)
          let paceSecPerKm: number | null = null;
          if (avgPace && category === 'running') {
            const parts = avgPace.split(':');
            if (parts.length === 2) {
              paceSecPerKm = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
            }
          }

          cardioDetail = {
            activity: act,
            distance_km: parseFloat(cardio.distance) || null,
            duration_minutes: parseInt(duration) || null,
            avg_heart_rate: parseInt(cardio.hrAvg) || null,
            max_heart_rate: null,
            avg_pace_sec_per_km: paceSecPerKm,
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
  const isRunning = category === 'running';

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
            placeholder={isRunning
              ? 'e.g. Norwegian 4×4, Morning Run...'
              : 'e.g. Upper Body, Morning Run, Bike Ride...'}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isRunning ? 'e.g. Vondelpark' : 'e.g. Basic-Fit Arena'}
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

        {/* ── Running Section ── */}
        {isRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3>Hardlopen</h3>

            {/* Run type selector */}
            <div className="form-group">
              <label className="form-label">Type Run</label>
              <div className="run-type-row">
                {RUN_TYPES.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    className={`run-type-chip${runType === rt.id ? ' active' : ''}`}
                    onClick={() => setRunType(rt.id)}
                  >
                    <span>{rt.icon}</span>
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval builder */}
            {runType === 'intervals' && (
              <div className="interval-builder">
                <div className="form-group">
                  <label className="form-label">Template</label>
                  <div className="interval-templates">
                    {INTERVAL_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        className={`interval-tpl-chip${interval.template === tpl.id ? ' active' : ''}`}
                        onClick={() => applyTemplate(tpl.id)}
                        title={tpl.desc}
                      >
                        {tpl.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`interval-tpl-chip${interval.template === 'custom' ? ' active' : ''}`}
                      onClick={() => setInterval((prev) => ({ ...prev, template: 'custom' }))}
                    >
                      Aangepast
                    </button>
                  </div>
                </div>

                {/* Config inputs */}
                <div className="interval-config">
                  <div className="form-group">
                    <label className="interval-label">Opwarming (min)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={interval.warmup}
                      onChange={(e) => updateInterval('warmup', e.target.value)}
                      placeholder="10"
                      style={{ padding: '7px 10px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="interval-label">Herhalingen</label>
                    <input
                      type="number"
                      className="form-input"
                      value={interval.repeats}
                      onChange={(e) => updateInterval('repeats', e.target.value)}
                      placeholder="4"
                      min="1"
                      style={{ padding: '7px 10px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="interval-label">Werk (min:sec)</label>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={interval.workMin}
                        onChange={(e) => updateInterval('workMin', e.target.value)}
                        placeholder="4"
                        min="0"
                        style={{ padding: '7px 10px', flex: 1 }}
                      />
                      <span style={{ color: 'var(--fg-muted)', fontWeight: 700 }}>:</span>
                      <input
                        type="number"
                        className="form-input"
                        value={interval.workSec}
                        onChange={(e) => updateInterval('workSec', e.target.value)}
                        placeholder="00"
                        min="0"
                        max="59"
                        style={{ padding: '7px 10px', flex: 1 }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="interval-label">Rust (min:sec)</label>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={interval.restMin}
                        onChange={(e) => updateInterval('restMin', e.target.value)}
                        placeholder="3"
                        min="0"
                        style={{ padding: '7px 10px', flex: 1 }}
                      />
                      <span style={{ color: 'var(--fg-muted)', fontWeight: 700 }}>:</span>
                      <input
                        type="number"
                        className="form-input"
                        value={interval.restSec}
                        onChange={(e) => updateInterval('restSec', e.target.value)}
                        placeholder="00"
                        min="0"
                        max="59"
                        style={{ padding: '7px 10px', flex: 1 }}
                      />
                    </div>
                  </div>
                  <div className="form-group interval-config-full">
                    <label className="interval-label">Cooldown (min)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={interval.cooldown}
                      onChange={(e) => updateInterval('cooldown', e.target.value)}
                      placeholder="5"
                      style={{ padding: '7px 10px', maxWidth: 160 }}
                    />
                  </div>
                </div>

                {/* Visual timeline */}
                <IntervalTimeline blocks={getIntervalBlocks()} />

                {/* Summary */}
                <div className="interval-summary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <span>
                    <strong>{interval.repeats}×</strong>{' '}
                    {interval.workMin}:{String(parseInt(interval.workSec) || 0).padStart(2, '0')} werk{' / '}
                    {interval.restMin}:{String(parseInt(interval.restSec) || 0).padStart(2, '0')} rust
                  </span>
                </div>
              </div>
            )}

            {/* Running metrics */}
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Afstand (km)</label>
                <input
                  type="number"
                  className="form-input"
                  step="0.1"
                  placeholder="10.0"
                  value={cardio.distance}
                  onChange={(e) => setCardio({ ...cardio, distance: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gem. Pace (min/km)</label>
                <input
                  className="form-input"
                  placeholder="5:30"
                  value={avgPace}
                  onChange={(e) => setAvgPace(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gem. HR (bpm)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="155"
                  value={cardio.hrAvg}
                  onChange={(e) => setCardio({ ...cardio, hrAvg: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label">Stijging (m)</label>
              <input
                type="number"
                className="form-input"
                placeholder="50"
                value={cardio.elevation}
                onChange={(e) => setCardio({ ...cardio, elevation: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ── Strength Section ── */}
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

        {/* ── Cardio Section (non-running) ── */}
        {isCardioType && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3>{category === 'cycling' ? 'Ride' : category === 'swimming' ? 'Swim' : 'Cardio'} Details</h3>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <input
                className="form-input"
                value={cardio.activity}
                onChange={(e) => setCardio({ ...cardio, activity: e.target.value })}
                placeholder={category === 'cycling' ? 'Road ride' : category === 'swimming' ? 'Pool session' : 'Rowing, walking, elliptical...'}
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
            placeholder={isRunning && runType === 'intervals'
              ? 'Intervaldetails worden automatisch toegevoegd...'
              : 'How did it go?'}
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

/* ── Interval Timeline Visualization ── */
function IntervalTimeline({ blocks }: { blocks: { type: string; seconds: number; label: string }[] }) {
  if (blocks.length === 0) return null;

  const totalSeconds = blocks.reduce((s, b) => s + b.seconds, 0);
  if (totalSeconds === 0) return null;

  return (
    <div className="interval-timeline">
      {blocks.map((block, i) => (
        <div
          key={i}
          className={`interval-block ${block.type}`}
          style={{ flex: Math.max(block.seconds / totalSeconds, 0.04) }}
          title={`${block.type === 'warmup' ? 'Opwarming' : block.type === 'cooldown' ? 'Cooldown' : block.type === 'work' ? 'Werk' : 'Rust'}: ${block.label}`}
        >
          {/* Show label only if block is wide enough */}
          {(block.seconds / totalSeconds) > 0.06 && (
            <span>{block.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
