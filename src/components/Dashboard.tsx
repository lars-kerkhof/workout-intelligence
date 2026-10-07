'use client';

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { Workout, WeeklySummary } from '@/types/database';
import { fetchWorkouts, fetchWeeklySummary } from '@/lib/api';
import { fmtDate, fmtDuration, weekStart, today, weekLabel } from '@/lib/helpers';
import { rpeColor, rpeBg } from '@/lib/helpers';
import { chartDefaults, catColor, getChartColors } from '@/lib/charts';

interface DashboardProps {
  onOpenLog: () => void;
  onShowDetail: (id: string) => void;
}

export default function Dashboard({ onOpenLog, onShowDetail }: DashboardProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, ws] = await Promise.all([fetchWorkouts(20), fetchWeeklySummary()]);
      setWorkouts(w);
      setWeekly(ws);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading...</div>;
  }

  const thisWeek = weekStart(today());
  const lastWeekDate = new Date(thisWeek + 'T00:00:00');
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = lastWeekDate.toISOString().slice(0, 10);

  const tw = workouts.filter((w) => w.date >= thisWeek);
  const lw = workouts.filter((w) => w.date >= lastWeek && w.date < thisWeek);

  const twMin = tw.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const lwMin = lw.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const twRpe = tw.length ? (tw.reduce((s, w) => s + (w.rpe || 0), 0) / tw.length).toFixed(1) : '-';
  const lwRpe = lw.length ? (lw.reduce((s, w) => s + (w.rpe || 0), 0) / lw.length).toFixed(1) : '-';

  const minDiff = twMin - lwMin;
  const minDir = minDiff > 0 ? 'stat-up' : minDiff < 0 ? 'stat-down' : '';

  // Build weekly chart data
  const chartData = buildWeeklyChart(weekly);

  return (
    <>
      <div className="section-head">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={onOpenLog}>+ Log Workout</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">This week</div>
          <div className="stat-value">{tw.length}</div>
          <div className="stat-sub">workouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Duration</div>
          <div className="stat-value">{twMin}</div>
          <div className={`stat-sub ${minDir}`}>
            {minDiff > 0 ? '+' : ''}{minDiff} min vs last week
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg RPE</div>
          <div className="stat-value">{twRpe}</div>
          <div className="stat-sub">this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last week</div>
          <div className="stat-value">{lw.length}</div>
          <div className="stat-sub">{lwMin} min &middot; RPE {lwRpe}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <div>
          <h2 style={{ marginBottom: 12 }}>Recent Workouts</h2>
          <div className="workout-list">
            {workouts.length === 0 ? (
              <div className="empty-state">
                <p>No workouts logged yet.</p>
                <button className="btn btn-primary" onClick={onOpenLog}>Log your first workout</button>
              </div>
            ) : (
              workouts.slice(0, 10).map((w) => (
                <WorkoutRow key={w.id} workout={w} onClick={() => onShowDetail(w.id)} />
              ))
            )}
          </div>
        </div>
        <div>
          <h2 style={{ marginBottom: 12 }}>Weekly Volume</h2>
          <div className="card" style={{ height: 260 }}>
            <div className="chart-wrap" style={{ height: '100%' }}>
              {chartData && (
                <Bar data={chartData.data} options={chartData.options} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function WorkoutRow({ workout: w, onClick }: { workout: Workout; onClick: () => void }) {
  return (
    <div className="workout-row" onClick={onClick}>
      <span className="workout-date">{fmtDate(w.date)}</span>
      <span className={`cat-badge cat-${w.category}`}>{w.category}</span>
      <span className="workout-title">{w.title}</span>
      <span className="workout-meta">
        {w.location && <span>{w.location}</span>}
        {w.duration_minutes && <span>{fmtDuration(w.duration_minutes)}</span>}
      </span>
      {w.rpe && (
        <span
          className="workout-rpe"
          style={{ background: rpeBg(w.rpe), color: rpeColor(w.rpe) }}
        >
          {w.rpe}
        </span>
      )}
    </div>
  );
}

function buildWeeklyChart(weekly: WeeklySummary[]) {
  if (!weekly.length) return null;

  const weeks: Record<string, Record<string, number>> = {};
  weekly.forEach((r) => {
    if (!weeks[r.week_start]) weeks[r.week_start] = {};
    weeks[r.week_start][r.category] = r.total_minutes || 0;
  });

  const weekKeys = Object.keys(weeks).sort().slice(-8);
  const labels = weekKeys.map((d) => weekLabel(d));
  const cats = ['strength', 'cardio', 'cycling', 'swimming', 'flexibility', 'sport', 'other'];

  const datasets = cats
    .filter((c) => weekKeys.some((w) => weeks[w][c]))
    .map((c) => ({
      label: c.charAt(0).toUpperCase() + c.slice(1),
      data: weekKeys.map((w) => weeks[w][c] || 0),
      backgroundColor: catColor(c) + 'cc',
      borderRadius: 3,
      borderSkipped: false as const,
    }));

  const c = getChartColors();
  const opts = {
    ...chartDefaults(),
    scales: {
      x: { stacked: true, grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 11 } }, border: { color: c.border } },
      y: {
        stacked: true,
        grid: { color: c.grid },
        ticks: { color: c.muted, font: { size: 11 } },
        border: { color: c.border },
        title: { display: true, text: 'min', color: c.muted, font: { size: 11 } },
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, padding: 12, color: c.dim, font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(0,0,0,.8)', titleColor: '#fff', bodyColor: '#ddd', padding: 10, cornerRadius: 6, titleFont: { family: "'Outfit',sans-serif", weight: 'bold' as const } },
    },
  };

  return { data: { labels, datasets }, options: opts };
}

export { WorkoutRow };
