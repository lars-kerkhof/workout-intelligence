'use client';

import { useEffect, useState } from 'react';
import type { Route } from '@/types/database';
import { fetchRoutes, saveRoute } from '@/lib/api';

export default function RoutesView() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('cycling');
  const [distance, setDistance] = useState('');
  const [elevation, setElevation] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    const data = await fetchRoutes();
    setRoutes(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!name) return;
    await saveRoute({
      name,
      activity,
      distance_km: parseFloat(distance) || null,
      elevation_m: parseInt(elevation) || null,
      location: location || null,
      description: description || null,
    });
    setShowForm(false);
    setName(''); setDistance(''); setElevation(''); setLocation(''); setDescription('');
    load();
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  return (
    <>
      <div className="section-head">
        <h1>Routes</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add Route</button>
      </div>

      {routes.length === 0 ? (
        <div className="empty-state"><p>No routes saved. Save your favourite cycling or running routes.</p></div>
      ) : (
        <div className="workout-list">
          {routes.map((r) => (
            <div className="workout-row" style={{ cursor: 'default' }} key={r.id}>
              <span className={`cat-badge cat-${r.activity === 'cycling' ? 'cycling' : 'cardio'}`}>{r.activity}</span>
              <span className="workout-title">{r.name}</span>
              <span className="workout-meta">
                {r.distance_km && <span>{r.distance_km} km</span>}
                {r.elevation_m && <span>&uarr; {r.elevation_m}m</span>}
                {r.location && <span>📍 {r.location}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3>Add Route</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bossche Broek rondje" />
            </div>
            <div className="form-group">
              <label className="form-label">Activity</label>
              <select className="form-select" value={activity} onChange={(e) => setActivity(e.target.value)}>
                <option value="cycling">Cycling</option>
                <option value="running">Running</option>
                <option value="walking">Walking</option>
              </select>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Distance (km)</label>
              <input type="number" className="form-input" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Elevation (m)</label>
              <input type="number" className="form-input" value={elevation} onChange={(e) => setElevation(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Den Bosch" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Route details, highlights..." />
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
