'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { WeightEntry } from '@/types/database';
import { fetchWeightLog, saveWeight } from '@/lib/api';
import { fmtDate, today } from '@/lib/helpers';
import { chartDefaults, getChartColors } from '@/lib/charts';

export default function WeightView() {
  const [log, setLog] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());
  const [kg, setKg] = useState('');

  async function load() {
    const data = await fetchWeightLog();
    setLog(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    const weight = parseFloat(kg);
    if (!date || !weight) return;
    await saveWeight({ date, weight_kg: weight });
    setKg('');
    load();
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;

  const latest = log[0] || null;
  const weekAgo = log.find((w) => w.date <= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
  const diff = latest && weekAgo ? (latest.weight_kg - weekAgo.weight_kg).toFixed(1) : null;

  const chart = buildWeightChart(log);

  return (
    <>
      <div className="section-head"><h1>Weight</h1></div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Current</div>
          <div className="stat-value">{latest ? latest.weight_kg : '-'}</div>
          <div className="stat-sub">kg</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">7-day change</div>
          <div className={`stat-value${diff !== null && parseFloat(diff) < 0 ? ' stat-down' : ''}`}>
            {diff !== null ? (parseFloat(diff) > 0 ? '+' : '') + diff : '-'}
          </div>
          <div className="stat-sub">kg</div>
        </div>
      </div>

      <div className="weight-entry-row" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Weight (kg)</label>
          <input
            type="number"
            className="form-input"
            step="0.1"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder={latest ? String(latest.weight_kg) : '80.0'}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSave} style={{ height: 38, marginBottom: 1 }}>Log</button>
      </div>

      {chart && (
        <div className="card">
          <div className="chart-wrap" style={{ height: 260 }}>
            <Line data={chart.data} options={chart.options} />
          </div>
        </div>
      )}
    </>
  );
}

function buildWeightChart(log: WeightEntry[]) {
  if (log.length < 2) return null;
  const sorted = [...log].reverse();
  const labels = sorted.map((w) => fmtDate(w.date));
  const values = sorted.map((w) => w.weight_kg);
  const col = getChartColors();
  const opts = {
    ...chartDefaults(),
    scales: {
      x: { grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
      y: { grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border }, title: { display: true, text: 'kg', color: col.muted, font: { size: 11 } } },
    },
  };
  return {
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: col.accent,
        backgroundColor: col.accent + '18',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: col.accent,
        borderWidth: 2,
      }],
    },
    options: opts,
  };
}
