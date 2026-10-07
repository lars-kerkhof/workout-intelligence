'use client';

import { useEffect, useState } from 'react';
import type { Goal, WorkoutCategory } from '@/types/database';
import { CATEGORIES } from '@/types/database';
import { fetchGoals, saveGoal, updateGoal } from '@/lib/api';
import { fmtDate, today } from '@/lib/helpers';

export default function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('');
  const [metric, setMetric] = useState('');

  async function load() {
    const data = await fetchGoals();
    setGoals(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!title || !targetValue || !targetUnit) return;
    await saveGoal({
      title,
      target_value: parseFloat(targetValue),
      target_unit: targetUnit,
      deadline: deadline || null,
      category: (category || null) as WorkoutCategory | null,
      metric: metric || 'custom',
      status: 'active',
    });
    setShowForm(false);
    setTitle(''); setTargetValue(''); setTargetUnit(''); setDeadline(''); setCategory(''); setMetric('');
    load();
  }

  async function handleAchieve(id: string) {
    await updateGoal(id, { status: 'achieved', achieved_at: new Date().toISOString() });
    load();
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  const active = goals.filter((g) => g.status === 'active');
  const achieved = goals.filter((g) => g.status === 'achieved');

  return (
    <>
      <div className="section-head">
        <h1>Goals</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ New Goal</button>
      </div>

      {active.length === 0 && achieved.length === 0 && (
        <div className="empty-state"><p>Set a fitness goal to track your progress.</p></div>
      )}

      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onAchieve={() => handleAchieve(g.id)} />
          ))}
        </div>
      )}

      {achieved.length > 0 && (
        <>
          <h2 style={{ marginBottom: 12, color: 'var(--fg-dim)' }}>Achieved</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {achieved.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3>New Goal</h3>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a sub-25 minute 5K" />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Target Value</label>
              <input type="number" className="form-input" step="0.1" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} placeholder="min, kg, km..." />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input type="date" className="form-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Any</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Metric</label>
              <input className="form-input" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="5K time, bench press 1RM..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save Goal</button>
          </div>
        </div>
      )}
    </>
  );
}

function GoalCard({ goal: g, onAchieve }: { goal: Goal; onAchieve?: () => void }) {
  const done = g.status === 'achieved';
  return (
    <div className="goal-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 600, ...(done ? { textDecoration: 'line-through', color: 'var(--fg-dim)' } : {}) }}>
          {g.title}
        </div>
        {g.category && <span className={`cat-badge cat-${g.category}`}>{g.category}</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--fg-dim)' }}>
        <span>Target: <strong style={{ color: 'var(--fg)' }}>{g.target_value} {g.target_unit}</strong></span>
        {g.deadline && <span>Deadline: {fmtDate(g.deadline)}</span>}
      </div>
      {!done && onAchieve && (
        <button className="btn btn-sm btn-secondary" onClick={onAchieve} style={{ alignSelf: 'flex-start' }}>
          ✓ Mark achieved
        </button>
      )}
    </div>
  );
}
