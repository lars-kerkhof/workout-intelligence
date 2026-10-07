'use client';

import { useEffect, useState } from 'react';
import type { Race } from '@/types/database';
import { fetchRaces, saveRace } from '@/lib/api';
import { fmtDate, fmtDuration, today } from '@/lib/helpers';

export default function RacesView() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState(today());
  const [activity, setActivity] = useState('running');
  const [distance, setDistance] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [position, setPosition] = useState('');
  const [location, setLocation] = useState('');

  async function load() {
    const data = await fetchRaces();
    setRaces(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!name || !date) return;
    await saveRace({
      name,
      date,
      activity: activity || 'running',
      distance_km: parseFloat(distance) || null,
      finish_time_seconds: (parseInt(finishTime) || 0) * 60 || null,
      position: parseInt(position) || null,
      location: location || null,
      notes: null,
    });
    setShowForm(false);
    setName(''); setDistance(''); setFinishTime(''); setPosition(''); setLocation('');
    load();
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  return (
    <>
      <div className="section-head">
        <h1>Races</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add Race</button>
      </div>

      {races.length === 0 ? (
        <div className="empty-state"><p>No races recorded.</p></div>
      ) : (
        <div className="workout-list">
          {races.map((r) => (
            <div className="workout-row" style={{ cursor: 'default' }} key={r.id}>
              <span className="workout-date">{fmtDate(r.date)}</span>
              <span className="workout-title">{r.name}</span>
              <span className="workout-meta">
                <span>{r.activity}</span>
                {r.distance_km && <span>{r.distance_km} km</span>}
                {r.finish_time_seconds && <span>{fmtDuration(Math.round(r.finish_time_seconds / 60))}</span>}
                {r.position && <span>#{r.position}</span>}
                {r.location && <span>📍 {r.location}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3>Add Race</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bredase Singelloop" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Activity</label>
              <input className="form-input" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="running, cycling..." />
            </div>
            <div className="form-group">
              <label className="form-label">Distance (km)</label>
              <input type="number" className="form-input" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Finish time (min)</label>
              <input type="number" className="form-input" value={finishTime} onChange={(e) => setFinishTime(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Position</label>
              <input type="number" className="form-input" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          </div>
        </div>
      )}
    </>
  );
}
