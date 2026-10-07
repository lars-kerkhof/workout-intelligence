'use client';

import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import type { WeeklySummary, MonthlySummary } from '@/types/database';
import { fetchWeeklySummary, fetchMonthlySummary, fetchDistinctExercises, fetchDistinctActivities, fetchExerciseProgression, fetchCardioProgression } from '@/lib/api';
import { fmtDate, weekLabel } from '@/lib/helpers';
import { chartDefaults, catColor, getChartColors } from '@/lib/charts';

type Tab = 'weekly' | 'monthly' | 'drilldown';

export default function AnalyzeView() {
  const [tab, setTab] = useState<Tab>('weekly');
  const [weekly, setWeekly] = useState<WeeklySummary[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strengthData, setStrengthData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cardioData, setCardioData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [w, m, ex, act] = await Promise.all([
        fetchWeeklySummary(), fetchMonthlySummary(), fetchDistinctExercises(), fetchDistinctActivities(),
      ]);
      setWeekly(w);
      setMonthly(m);
      setExercises(ex);
      setActivities(act);
      setLoading(false);
    })();
  }, []);

  async function loadStrengthDrill(exercise: string) {
    setSelectedExercise(exercise);
    const data = await fetchExerciseProgression(exercise);
    setStrengthData(data);
  }

  async function loadCardioDrill(activity: string) {
    setSelectedActivity(activity);
    const data = await fetchCardioProgression(activity);
    setCardioData(data);
  }

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading...</div>;
  }

  const weeklyChart = buildWeeklyVolumeChart(weekly);
  const rpeChart = buildRpeChart(weekly);
  const monthlyChart = buildMonthlyChart(monthly);
  const strengthChart = strengthData ? buildStrengthDrillChart(strengthData) : null;
  const cardioDrillChart = cardioData ? buildCardioDrillChart(cardioData) : null;

  return (
    <>
      <div className="section-head"><h1>Intelligence</h1></div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {(['weekly', 'monthly', 'drilldown'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'weekly' ? 'Weekly' : t === 'monthly' ? 'Monthly' : 'Drill-Down'}
          </button>
        ))}
      </div>

      {tab === 'weekly' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Weekly Volume by Category</h3>
            <div className="chart-wrap" style={{ height: 280 }}>
              {weeklyChart && <Bar data={weeklyChart.data} options={weeklyChart.options} />}
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Weekly RPE Trend</h3>
            <div className="chart-wrap" style={{ height: 200 }}>
              {rpeChart && <Line data={rpeChart.data} options={rpeChart.options} />}
            </div>
          </div>
        </>
      )}

      {tab === 'monthly' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Monthly Volume</h3>
          <div className="chart-wrap" style={{ height: 300 }}>
            {monthlyChart && <Bar data={monthlyChart.data} options={monthlyChart.options} />}
          </div>
        </div>
      )}

      {tab === 'drilldown' && (
        <>
          {exercises.length === 0 && activities.length === 0 ? (
            <div className="empty-state"><p>Log some workouts to see drill-down analytics.</p></div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 12 }}>Exercise Progression</h3>
                {exercises.length ? (
                  <div className="drill-select" style={{ marginBottom: 16 }}>
                    {exercises.map((e) => (
                      <button
                        key={e}
                        className={`drill-chip${selectedExercise === e ? ' active' : ''}`}
                        onClick={() => loadStrengthDrill(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--fg-muted)' }}>No strength exercises logged yet.</p>
                )}
                <div className="chart-wrap" style={{ height: 260 }}>
                  {strengthChart && <Line data={strengthChart.data} options={strengthChart.options} />}
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 12 }}>Cardio Progression</h3>
                {activities.length ? (
                  <div className="drill-select" style={{ marginBottom: 16 }}>
                    {activities.map((a) => (
                      <button
                        key={a}
                        className={`drill-chip${selectedActivity === a ? ' active' : ''}`}
                        onClick={() => loadCardioDrill(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--fg-muted)' }}>No cardio activities logged yet.</p>
                )}
                <div className="chart-wrap" style={{ height: 260 }}>
                  {cardioDrillChart && <Line data={cardioDrillChart.data} options={cardioDrillChart.options} />}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

// ─── Chart builders ────────────────────

function buildWeeklyVolumeChart(weekly: WeeklySummary[]) {
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
  const col = getChartColors();
  const opts = {
    ...chartDefaults(),
    scales: {
      x: { stacked: true, grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
      y: { stacked: true, grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border }, title: { display: true, text: 'min', color: col.muted, font: { size: 11 } } },
    },
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, padding: 12, color: col.dim, font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(0,0,0,.8)', titleColor: '#fff', bodyColor: '#ddd', padding: 10, cornerRadius: 6, titleFont: { family: "'Outfit',sans-serif", weight: 'bold' as const } },
    },
  };
  return { data: { labels, datasets }, options: opts };
}

function buildRpeChart(weekly: WeeklySummary[]) {
  if (!weekly.length) return null;
  const weeks: Record<string, { rpes: number[]; count: number }> = {};
  weekly.forEach((r) => {
    if (!weeks[r.week_start]) weeks[r.week_start] = { rpes: [], count: 0 };
    if (r.avg_rpe) {
      weeks[r.week_start].rpes.push(r.avg_rpe * r.workout_count);
      weeks[r.week_start].count += r.workout_count;
    }
  });
  const sorted = Object.keys(weeks).sort().slice(-8);
  const labels = sorted.map((d) => weekLabel(d));
  const values = sorted.map((d) =>
    weeks[d].count ? parseFloat((weeks[d].rpes.reduce((a, b) => a + b, 0) / weeks[d].count).toFixed(1)) : null
  );
  const col = getChartColors();
  const opts = {
    ...chartDefaults(),
    scales: {
      x: { grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
      y: { min: 1, max: 10, grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
    },
  };
  return {
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: col.accent,
        backgroundColor: col.accent + '22',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: col.accent,
        borderWidth: 2,
      }],
    },
    options: opts,
  };
}

function buildMonthlyChart(monthly: MonthlySummary[]) {
  if (!monthly.length) return null;
  const months: Record<string, Record<string, number>> = {};
  monthly.forEach((r) => {
    if (!months[r.month_start]) months[r.month_start] = {};
    months[r.month_start][r.category] = r.total_minutes || 0;
  });
  const sorted = Object.keys(months).sort().slice(-6);
  const labels = sorted.map((d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' });
  });
  const cats = ['strength', 'cardio', 'cycling', 'swimming', 'flexibility', 'sport', 'other'];
  const datasets = cats
    .filter((c) => sorted.some((m) => months[m][c]))
    .map((c) => ({
      label: c.charAt(0).toUpperCase() + c.slice(1),
      data: sorted.map((m) => months[m][c] || 0),
      backgroundColor: catColor(c) + 'cc',
      borderRadius: 3,
      borderSkipped: false as const,
    }));
  const col = getChartColors();
  const opts = {
    ...chartDefaults(),
    scales: {
      x: { stacked: true, grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
      y: { stacked: true, grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
    },
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, padding: 12, color: col.dim, font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(0,0,0,.8)', titleColor: '#fff', bodyColor: '#ddd', padding: 10, cornerRadius: 6, titleFont: { family: "'Outfit',sans-serif", weight: 'bold' as const } },
    },
  };
  return { data: { labels, datasets }, options: opts };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildStrengthDrillChart(data: any[]) {
  if (!data.length) return null;
  const byDate: Record<string, { weight_kg: number; reps: number }> = {};
  data.forEach((s) => {
    const d = s.workouts?.date || '';
    if (!d) return;
    if (!byDate[d] || (s.weight_kg || 0) > (byDate[d].weight_kg || 0)) {
      byDate[d] = { weight_kg: s.weight_kg, reps: s.reps };
    }
  });
  const dates = Object.keys(byDate).sort();
  const labels = dates.map((d) => fmtDate(d));
  const weights = dates.map((d) => byDate[d].weight_kg);
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
        data: weights,
        borderColor: col.accent,
        backgroundColor: col.accent + '22',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: col.accent,
        borderWidth: 2,
      }],
    },
    options: opts,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCardioDrillChart(data: any[]) {
  if (!data.length) return null;
  const entries = data.filter((d) => d.workouts?.date);
  const labels = entries.map((d) => fmtDate(d.workouts.date));
  const distances = entries.map((d) => d.distance_km);
  const col = getChartColors();
  const cc = catColor('cardio');
  const opts = {
    ...chartDefaults(),
    scales: {
      x: { grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border } },
      y: { grid: { color: col.grid }, ticks: { color: col.muted, font: { size: 11 } }, border: { color: col.border }, title: { display: true, text: 'km', color: col.muted, font: { size: 11 } } },
    },
  };
  return {
    data: {
      labels,
      datasets: [{
        data: distances,
        borderColor: cc,
        backgroundColor: cc + '22',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: cc,
        borderWidth: 2,
      }],
    },
    options: opts,
  };
}
