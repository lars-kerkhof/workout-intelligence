'use client';

import { useEffect, useState } from 'react';
import type { PersonalRecord, WorkoutCategory } from '@/types/database';
import { CATEGORIES } from '@/types/database';
import { fetchPRs, savePR } from '@/lib/api';
import { fmtDate, today } from '@/lib/helpers';

export default function PRsView() {
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Form state
  const [prCat, setPrCat] = useState<WorkoutCategory>('strength');
  const [prExercise, setPrExercise] = useState('');
  const [prValue, setPrValue] = useState('');
  const [prUnit, setPrUnit] = useState('');
  const [prDate, setPrDate] = useState(today());
  const [prPrev, setPrPrev] = useState('');

  async function load() {
    const data = await fetchPRs();
    setPrs(data);
    if (data.length && !activeCat) {
      setActiveCat([...new Set(data.map((p) => p.category))][0]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!prExercise || !prValue || !prUnit) return;
    await savePR({
      category: prCat,
      exercise: prExercise,
      value: parseFloat(prValue),
      unit: prUnit,
      date: prDate || null,
      previous_value: parseFloat(prPrev) || null,
    });
    setShowForm(false);
    setPrExercise(''); setPrValue(''); setPrUnit(''); setPrPrev('');
    load();
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  const categories = [...new Set(prs.map((p) => p.category))];
  const filtered = prs.filter((p) => p.category === activeCat);

  return (
    <>
      <div className="section-head">
        <h1>Personal Records</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add PR</button>
      </div>

      {prs.length === 0 ? (
        <div className="empty-state"><p>No PRs recorded yet. Log workouts or add PRs manually.</p></div>
      ) : (
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
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.exercise}</td>
                    <td>
                      <span className="pr-val">{p.value}</span>{' '}
                      <span style={{ color: 'var(--fg-dim)' }}>{p.unit}</span>
                    </td>
                    <td className="pr-prev">{p.previous_value ? p.previous_value + ' ' + p.unit : '-'}</td>
                    <td style={{ color: 'var(--fg-dim)' }}>{p.date ? fmtDate(p.date) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3>New Personal Record</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={prCat} onChange={(e) => setPrCat(e.target.value as WorkoutCategory)}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Exercise / Activity</label>
              <input className="form-input" value={prExercise} onChange={(e) => setPrExercise(e.target.value)} placeholder="Bench Press, 5K Run..." />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Value</label>
              <input type="number" className="form-input" step="0.1" value={prValue} onChange={(e) => setPrValue(e.target.value)} placeholder="100" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={prUnit} onChange={(e) => setPrUnit(e.target.value)} placeholder="kg, min, km..." />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={prDate} onChange={(e) => setPrDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Previous record (optional)</label>
            <input type="number" className="form-input" step="0.1" value={prPrev} onChange={(e) => setPrPrev(e.target.value)} placeholder="95" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save PR</button>
          </div>
        </div>
      )}
    </>
  );
}
