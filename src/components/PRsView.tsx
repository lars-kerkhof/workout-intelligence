'use client';

import { useEffect, useState, useCallback } from 'react';
import type { PersonalRecord, WorkoutCategory } from '@/types/database';
import { CATEGORIES } from '@/types/database';
import { fetchPRs, savePR, fetchDistinctExercises } from '@/lib/api';
import { fmtDate, fmtTimePR, today } from '@/lib/helpers';

// ── Strength presets ──
const STRENGTH_EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'OHP', 'Barbell Row', 'Pull-ups'];
const RM_TYPES = ['1RM', '3RM', '5RM', 'Max Reps'] as const;
type RMType = typeof RM_TYPES[number];

// ── Running presets ──
const DISTANCE_PRESETS = [
  { id: '1mile', label: '1 Mijl', km: 1.609 },
  { id: '5k', label: '5K', km: 5 },
  { id: '10k', label: '10K', km: 10 },
  { id: '15k', label: '15K', km: 15 },
  { id: 'half', label: 'Halve Marathon', km: 21.097 },
  { id: 'marathon', label: 'Marathon', km: 42.195 },
] as const;

type RunPRType = 'time' | 'distance';
const RUN_PR_TYPES: { id: RunPRType; label: string; icon: string }[] = [
  { id: 'time', label: 'Snelste Tijd', icon: '⏱️' },
  { id: 'distance', label: 'Langste Afstand', icon: '📏' },
];

export default function PRsView() {
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);

  // ── Shared form state ──
  const [prCat, setPrCat] = useState<WorkoutCategory>('strength');
  const [prDate, setPrDate] = useState(today());
  const [prPrev, setPrPrev] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Strength form state ──
  const [sExercise, setSExercise] = useState('');
  const [sRMType, setSRMType] = useState<RMType>('1RM');
  const [sWeight, setSWeight] = useState('');
  const [sReps, setSReps] = useState('');

  // ── Running form state ──
  const [rPRType, setRPRType] = useState<RunPRType>('time');
  const [rDistance, setRDistance] = useState('5k');
  const [rCustomDist, setRCustomDist] = useState('');
  const [rHours, setRHours] = useState('');
  const [rMinutes, setRMinutes] = useState('');
  const [rSeconds, setRSeconds] = useState('');
  const [rLongestKm, setRLongestKm] = useState('');

  // ── Generic form state (other categories) ──
  const [gExercise, setGExercise] = useState('');
  const [gValue, setGValue] = useState('');
  const [gUnit, setGUnit] = useState('');

  const load = useCallback(async () => {
    const data = await fetchPRs();
    setPrs(data);
    if (data.length && !activeCat) {
      setActiveCat([...new Set(data.map((p) => p.category))][0]);
    }
    setLoading(false);
  }, [activeCat]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetchDistinctExercises().then(setExerciseOptions);
  }, []);

  function resetForm() {
    setSExercise(''); setSRMType('1RM'); setSWeight(''); setSReps('');
    setRPRType('time'); setRDistance('5k'); setRCustomDist('');
    setRHours(''); setRMinutes(''); setRSeconds(''); setRLongestKm('');
    setGExercise(''); setGValue(''); setGUnit('');
    setPrPrev(''); setPrDate(today());
  }

  // ── Computed pace for running time PRs ──
  function computedPace(): string | null {
    if (rPRType !== 'time') return null;
    const totalSec = (parseInt(rHours) || 0) * 3600 + (parseInt(rMinutes) || 0) * 60 + (parseInt(rSeconds) || 0);
    if (totalSec <= 0) return null;
    const preset = DISTANCE_PRESETS.find((d) => d.id === rDistance);
    const km = rDistance === 'custom' ? parseFloat(rCustomDist) : preset?.km;
    if (!km || km <= 0) return null;
    const paceSecPerKm = Math.round(totalSec / km);
    const pm = Math.floor(paceSecPerKm / 60);
    const ps = paceSecPerKm % 60;
    return `${pm}:${String(ps).padStart(2, '0')}/km`;
  }

  async function handleSave() {
    setSaving(true);
    try {
      let exercise = '';
      let value = 0;
      let unit = '';
      let prevValue: number | null = null;

      if (prCat === 'strength') {
        if (!sExercise || !sWeight) { setSaving(false); return; }
        if (sRMType === 'Max Reps') {
          exercise = sExercise;
          value = parseInt(sReps) || 0;
          unit = 'reps';
          if (!value) { setSaving(false); return; }
        } else {
          exercise = `${sExercise} (${sRMType})`;
          value = parseFloat(sWeight);
          unit = 'kg';
        }
        prevValue = parseFloat(prPrev) || null;
      } else if (prCat === 'running') {
        if (rPRType === 'time') {
          const preset = DISTANCE_PRESETS.find((d) => d.id === rDistance);
          exercise = rDistance === 'custom'
            ? `${rCustomDist} km`
            : (preset?.label || rDistance);
          const totalSec = (parseInt(rHours) || 0) * 3600 + (parseInt(rMinutes) || 0) * 60 + (parseInt(rSeconds) || 0);
          if (totalSec <= 0) { setSaving(false); return; }
          value = totalSec;
          unit = 'sec';
        } else {
          exercise = 'Langste Run';
          value = parseFloat(rLongestKm) || 0;
          if (value <= 0) { setSaving(false); return; }
          unit = 'km';
        }
        if (prPrev) {
          if (rPRType === 'time') {
            // Previous is also in seconds
            const parts = prPrev.split(':');
            if (parts.length === 3) prevValue = (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
            else if (parts.length === 2) prevValue = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
          } else {
            prevValue = parseFloat(prPrev) || null;
          }
        }
      } else {
        // Generic form
        if (!gExercise || !gValue || !gUnit) { setSaving(false); return; }
        exercise = gExercise;
        value = parseFloat(gValue);
        unit = gUnit;
        prevValue = parseFloat(prPrev) || null;
      }

      await savePR({
        category: prCat,
        exercise,
        value,
        unit,
        date: prDate || null,
        previous_value: prevValue,
      });

      setShowForm(false);
      resetForm();
      load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  // ── Format display value in table ──
  function fmtPRValue(p: PersonalRecord): { main: string; unit: string } {
    if (p.unit === 'sec') {
      return { main: fmtTimePR(p.value), unit: '' };
    }
    return { main: String(p.value), unit: p.unit };
  }

  function fmtPRPrev(p: PersonalRecord): string {
    if (!p.previous_value) return '-';
    if (p.unit === 'sec') return fmtTimePR(p.previous_value);
    return p.previous_value + ' ' + p.unit;
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  const categories = [...new Set(prs.map((p) => p.category))];
  const filtered = prs.filter((p) => p.category === activeCat);

  const isStrength = prCat === 'strength';
  const isRunning = prCat === 'running';

  return (
    <>
      <div className="section-head">
        <h1>Personal Records</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add PR</button>
      </div>

      {prs.length === 0 && !showForm ? (
        <div className="empty-state"><p>No PRs recorded yet. Log workouts or add PRs manually.</p></div>
      ) : prs.length > 0 && (
        <>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {categories.map((c) => (
              <button
                key={c}
                className={`tab-btn${activeCat === c ? ' active' : ''}`}
                onClick={() => setActiveCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="pr-table">
              <thead>
                <tr><th>Exercise</th><th>Record</th><th>Previous</th><th>Date</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const display = fmtPRValue(p);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.exercise}</td>
                      <td>
                        <span className="pr-val">{display.main}</span>
                        {display.unit && <> <span style={{ color: 'var(--fg-dim)' }}>{display.unit}</span></>}
                      </td>
                      <td className="pr-prev">{fmtPRPrev(p)}</td>
                      <td style={{ color: 'var(--fg-dim)' }}>{p.date ? fmtDate(p.date) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Add PR Form ── */}
      {showForm && (
        <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3>Nieuw Persoonlijk Record</h3>

          {/* Category selector */}
          <div className="form-group">
            <label className="form-label">Categorie</label>
            <select
              className="form-select"
              value={prCat}
              onChange={(e) => { setPrCat(e.target.value as WorkoutCategory); resetForm(); setPrCat(e.target.value as WorkoutCategory); }}
            >
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          {/* ── Strength Form ── */}
          {isStrength && (
            <>
              <div className="form-group">
                <label className="form-label">Oefening</label>
                <div className="pr-exercise-chips">
                  {STRENGTH_EXERCISES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className={`pr-chip${sExercise === ex ? ' active strength' : ''}`}
                      onClick={() => setSExercise(sExercise === ex ? '' : ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <input
                  className="form-input"
                  value={sExercise}
                  onChange={(e) => setSExercise(e.target.value)}
                  placeholder="Of typ een andere oefening..."
                  list="ex-pr-list"
                  style={{ marginTop: 8 }}
                />
                <datalist id="ex-pr-list">
                  {exerciseOptions.filter((e) => !STRENGTH_EXERCISES.includes(e)).map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <div className="pr-exercise-chips">
                  {RM_TYPES.map((rm) => (
                    <button
                      key={rm}
                      type="button"
                      className={`pr-chip${sRMType === rm ? ' active strength' : ''}`}
                      onClick={() => setSRMType(rm)}
                    >
                      {rm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gewicht (kg)</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.5"
                    value={sWeight}
                    onChange={(e) => setSWeight(e.target.value)}
                    placeholder={sRMType === 'Max Reps' ? 'Bij welk gewicht' : '105'}
                  />
                </div>
                {sRMType === 'Max Reps' && (
                  <div className="form-group">
                    <label className="form-label">Reps</label>
                    <input
                      type="number"
                      className="form-input"
                      value={sReps}
                      onChange={(e) => setSReps(e.target.value)}
                      placeholder="25"
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input type="date" className="form-input" value={prDate} onChange={(e) => setPrDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vorig record ({sRMType === 'Max Reps' ? 'reps' : 'kg'})</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.5"
                    value={prPrev}
                    onChange={(e) => setPrPrev(e.target.value)}
                    placeholder={sRMType === 'Max Reps' ? '20' : '100'}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Running Form ── */}
          {isRunning && (
            <>
              <div className="form-group">
                <label className="form-label">Type PR</label>
                <div className="pr-exercise-chips">
                  {RUN_PR_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`pr-chip${rPRType === t.id ? ' active running' : ''}`}
                      onClick={() => setRPRType(t.id)}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {rPRType === 'time' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Afstand</label>
                    <div className="pr-exercise-chips">
                      {DISTANCE_PRESETS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`pr-chip${rDistance === d.id ? ' active running' : ''}`}
                          onClick={() => setRDistance(d.id)}
                        >
                          {d.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`pr-chip${rDistance === 'custom' ? ' active running' : ''}`}
                        onClick={() => setRDistance('custom')}
                      >
                        Anders
                      </button>
                    </div>
                    {rDistance === 'custom' && (
                      <input
                        type="number"
                        className="form-input"
                        step="0.1"
                        value={rCustomDist}
                        onChange={(e) => setRCustomDist(e.target.value)}
                        placeholder="Afstand in km"
                        style={{ marginTop: 8, maxWidth: 200 }}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tijd</label>
                    <div className="pr-time-input">
                      <div className="pr-time-field">
                        <input
                          type="number"
                          className="form-input"
                          value={rHours}
                          onChange={(e) => setRHours(e.target.value)}
                          placeholder="0"
                          min="0"
                        />
                        <span className="pr-time-label">uur</span>
                      </div>
                      <span className="pr-time-sep">:</span>
                      <div className="pr-time-field">
                        <input
                          type="number"
                          className="form-input"
                          value={rMinutes}
                          onChange={(e) => setRMinutes(e.target.value)}
                          placeholder="22"
                          min="0"
                          max="59"
                        />
                        <span className="pr-time-label">min</span>
                      </div>
                      <span className="pr-time-sep">:</span>
                      <div className="pr-time-field">
                        <input
                          type="number"
                          className="form-input"
                          value={rSeconds}
                          onChange={(e) => setRSeconds(e.target.value)}
                          placeholder="30"
                          min="0"
                          max="59"
                        />
                        <span className="pr-time-label">sec</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated pace */}
                  {computedPace() && (
                    <div className="pr-pace-display">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span>Gem. pace: <strong>{computedPace()}</strong></span>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Datum</label>
                      <input type="date" className="form-input" value={prDate} onChange={(e) => setPrDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vorige tijd (mm:ss of h:mm:ss)</label>
                      <input
                        className="form-input"
                        value={prPrev}
                        onChange={(e) => setPrPrev(e.target.value)}
                        placeholder="23:45"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Afstand (km)</label>
                      <input
                        type="number"
                        className="form-input"
                        step="0.1"
                        value={rLongestKm}
                        onChange={(e) => setRLongestKm(e.target.value)}
                        placeholder="42.2"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Datum</label>
                      <input type="date" className="form-input" value={prDate} onChange={(e) => setPrDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ maxWidth: 200 }}>
                    <label className="form-label">Vorig record (km)</label>
                    <input
                      type="number"
                      className="form-input"
                      step="0.1"
                      value={prPrev}
                      onChange={(e) => setPrPrev(e.target.value)}
                      placeholder="21.1"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Generic Form (other categories) ── */}
          {!isStrength && !isRunning && (
            <>
              <div className="form-group">
                <label className="form-label">Activiteit / Oefening</label>
                <input
                  className="form-input"
                  value={gExercise}
                  onChange={(e) => setGExercise(e.target.value)}
                  placeholder={prCat === 'cycling' ? '40K TT, Langste Rit...' : prCat === 'swimming' ? '100m Vrije Slag, 1500m...' : 'Activiteit...'}
                />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Waarde</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.1"
                    value={gValue}
                    onChange={(e) => setGValue(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Eenheid</label>
                  <input
                    className="form-input"
                    value={gUnit}
                    onChange={(e) => setGUnit(e.target.value)}
                    placeholder={prCat === 'cycling' ? 'km, min, km/u...' : prCat === 'swimming' ? 'sec, min...' : 'kg, min, km...'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input type="date" className="form-input" value={prDate} onChange={(e) => setPrDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Vorig record (optioneel)</label>
                <input
                  type="number"
                  className="form-input"
                  step="0.1"
                  value={prPrev}
                  onChange={(e) => setPrPrev(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); resetForm(); }}>Annuleren</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Opslaan...' : 'PR Opslaan'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
