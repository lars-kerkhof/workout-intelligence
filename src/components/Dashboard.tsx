'use client';

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { Workout, WeeklySummary, PersonalRecord, Goal, WeightEntry } from '@/types/database';
import {
  fetchWorkouts,
  fetchWeeklySummary,
  fetchRecentPRs,
  fetchActiveGoals,
  fetchRecentWeightEntries,
} from '@/lib/api';
import {
  fmtDate,
  fmtDuration,
  weekStart,
  today,
  weekLabel,
  getISOWeek,
  getGreeting,
  fmtDateLong,
} from '@/lib/helpers';
import { rpeColor, rpeBg, CAT_COLORS } from '@/lib/helpers';
import { chartDefaults, catColor, getChartColors } from '@/lib/charts';

interface DashboardProps {
  onOpenLog: () => void;
  onShowDetail: (id: string) => void;
}

const CAT_LABELS: Record<string, string> = {
  strength: 'Kracht',
  running: 'Hardlopen',
  cardio: 'Cardio',
  cycling: 'Fietsen',
  swimming: 'Zwemmen',
  flexibility: 'Flexibiliteit',
  sport: 'Sport',
  other: 'Overig',
};

export default function Dashboard({ onOpenLog, onShowDetail }: DashboardProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary[]>([]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, ws, prs, goals, weights] = await Promise.all([
        fetchWorkouts(50),
        fetchWeeklySummary(),
        fetchRecentPRs(3),
        fetchActiveGoals(),
        fetchRecentWeightEntries(14),
      ]);
      setWorkouts(w);
      setWeekly(ws);
      setRecentPRs(prs);
      setActiveGoals(goals);
      setWeightEntries(weights);
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
  const twRpe = tw.length ? tw.reduce((s, w) => s + (w.rpe || 0), 0) / tw.length : 0;
  const twRpeStr = tw.length ? twRpe.toFixed(1) : '-';

  const minDiff = twMin - lwMin;
  const countDiff = tw.length - lw.length;

  // Duration in hours:minutes
  const twHours = Math.floor(twMin / 60);
  const twMins = twMin % 60;
  const twDurationStr = twMin > 0 ? `${twHours}:${String(twMins).padStart(2, '0')}` : '0:00';

  // Streak calculation (consecutive weeks with workouts)
  const streak = calcStreak(workouts);

  // Weight data
  const latestWeight = weightEntries.length > 0 ? weightEntries[0] : null;
  const oneWeekAgoWeight = weightEntries.find((w) => {
    const d = new Date(w.date + 'T00:00:00');
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 >= 6;
  });
  const weightDiff = latestWeight && oneWeekAgoWeight
    ? latestWeight.weight_kg - oneWeekAgoWeight.weight_kg
    : null;

  // Build chart data
  const chartData = buildWeeklyChart(weekly);
  const currentWeekNum = getISOWeek(new Date());

  // Heatmap data (12 weeks)
  const heatmapData = buildHeatmap(workouts);

  return (
    <>
      {/* Greeting header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-greeting">{getGreeting()}</h1>
          <p className="dash-date">{fmtDateLong()} — Week {currentWeekNum}</p>
        </div>
        <button className="btn btn-primary btn-log" onClick={onOpenLog}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Log Workout
        </button>
      </div>

      {/* 5 stat cards */}
      <div className="dash-stats">
        {/* This week */}
        <div className="dash-stat-card">
          <div className="dash-stat-label">Deze week</div>
          <div className="dash-stat-row">
            <span className="dash-stat-value">{tw.length}</span>
            <span className="dash-stat-unit">workouts</span>
          </div>
          <div className={`dash-stat-change ${countDiff > 0 ? 'up' : countDiff < 0 ? 'down' : ''}`}>
            {countDiff !== 0 && (countDiff > 0 ? `+${countDiff}` : countDiff)} {countDiff !== 0 ? 'vs vorige week' : 'gelijk aan vorige week'}
          </div>
        </div>

        {/* Duration */}
        <div className="dash-stat-card">
          <div className="dash-stat-label">Duur</div>
          <div className="dash-stat-row">
            <span className="dash-stat-value">{twDurationStr}</span>
            <span className="dash-stat-unit">uur</span>
          </div>
          <div className={`dash-stat-change ${minDiff > 0 ? 'up' : minDiff < 0 ? 'down' : ''}`}>
            {minDiff !== 0 && (minDiff > 0 ? `+${minDiff}` : minDiff)} {minDiff !== 0 ? 'min vs vorige week' : 'gelijk aan vorige week'}
          </div>
        </div>

        {/* Avg RPE */}
        <div className="dash-stat-card">
          <div className="dash-stat-label">Gem. RPE</div>
          <div className="dash-stat-row">
            <span className="dash-stat-value" style={{ color: tw.length ? rpeColor(Math.round(twRpe)) : undefined }}>{twRpeStr}</span>
            <span className="dash-stat-unit">/ 10</span>
          </div>
          {tw.length > 0 && (
            <div className="dash-rpe-bar">
              <div className="dash-rpe-fill" style={{ width: `${twRpe * 10}%`, background: rpeColor(Math.round(twRpe)) }} />
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="dash-stat-card">
          <div className="dash-stat-label">Streak</div>
          <div className="dash-stat-row">
            <span className="dash-stat-value" style={{ color: 'var(--accent)' }}>{streak.current}</span>
            <span className="dash-stat-unit">weken</span>
          </div>
          <div className="dash-stat-change">Langste: {streak.longest} weken</div>
        </div>

        {/* Weight */}
        <div className="dash-stat-card">
          <div className="dash-stat-label">Gewicht</div>
          <div className="dash-stat-row">
            <span className="dash-stat-value">{latestWeight ? latestWeight.weight_kg.toFixed(1) : '-'}</span>
            <span className="dash-stat-unit">kg</span>
          </div>
          {weightDiff !== null && (
            <div className={`dash-stat-change ${weightDiff < 0 ? 'up' : weightDiff > 0 ? 'down' : ''}`}>
              {weightDiff < 0 ? '' : '+'}{weightDiff.toFixed(1)} kg deze week
            </div>
          )}
        </div>
      </div>

      {/* Heatmap + Weekly Volume */}
      <div className="dash-two-col">
        {/* Activity Heatmap */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Activiteit</h2>
            <span className="dash-card-sub">Laatste 12 weken</span>
          </div>
          <ActivityHeatmap data={heatmapData} />
        </div>

        {/* Weekly Volume Chart */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Weekvolume</h2>
          </div>
          <div className="chart-wrap" style={{ height: 220 }}>
            {chartData && (
              <Bar data={chartData.data} options={chartData.options} />
            )}
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      <div className="dash-card" style={{ marginBottom: 28 }}>
        <div className="dash-card-head">
          <h2>Recente Workouts</h2>
        </div>
        {workouts.length === 0 ? (
          <div className="empty-state">
            <p>Nog geen workouts gelogd.</p>
            <button className="btn btn-primary" onClick={onOpenLog}>Log je eerste workout</button>
          </div>
        ) : (
          <div className="dash-workout-list">
            {workouts.slice(0, 5).map((w) => (
              <DashWorkoutRow key={w.id} workout={w} onClick={() => onShowDetail(w.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom row: Goals, PRs, Weight */}
      <div className="dash-three-col">
        {/* Active Goals */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Actieve Doelen</h2>
            <span className="dash-card-sub">{activeGoals.length} actief</span>
          </div>
          {activeGoals.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Geen actieve doelen</p>
          ) : (
            <div className="dash-goals">
              {activeGoals.slice(0, 3).map((g) => (
                <GoalProgress key={g.id} goal={g} />
              ))}
            </div>
          )}
        </div>

        {/* Recent PRs */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Recente PRs</h2>
          </div>
          {recentPRs.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Nog geen PRs gelogd</p>
          ) : (
            <div className="dash-prs">
              {recentPRs.map((pr) => (
                <PRCard key={pr.id} pr={pr} />
              ))}
            </div>
          )}
        </div>

        {/* Weight Trend */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h2>Gewicht</h2>
          </div>
          {latestWeight ? (
            <>
              <div className="dash-stat-row" style={{ marginBottom: 4 }}>
                <span className="dash-weight-big">{latestWeight.weight_kg.toFixed(1)}</span>
                <span className="dash-stat-unit" style={{ fontSize: 16 }}>kg</span>
              </div>
              {weightDiff !== null && (
                <div className={`dash-stat-change ${weightDiff < 0 ? 'up' : weightDiff > 0 ? 'down' : ''}`} style={{ marginBottom: 16 }}>
                  {weightDiff < 0 ? '' : '+'}{weightDiff.toFixed(1)} kg deze week
                </div>
              )}
              <WeightSparkline entries={weightEntries} />
            </>
          ) : (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Nog geen gewicht gelogd</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Workout Row (redesigned) ── */
function DashWorkoutRow({ workout: w, onClick }: { workout: Workout; onClick: () => void }) {
  const dt = new Date(w.date + 'T00:00:00');
  const day = dt.getDate();
  const month = dt.toLocaleDateString('nl-NL', { month: 'short' });

  return (
    <div className="dash-workout-row" onClick={onClick}>
      <div className="dash-workout-cat-bar" style={{ background: CAT_COLORS[w.category] || 'var(--fg-muted)' }} />
      <div className="dash-workout-date">
        <span className="dash-workout-day">{day}</span>
        <span className="dash-workout-month">{month}</span>
      </div>
      <div className="dash-workout-content">
        <div className="dash-workout-top">
          <span className="dash-workout-title">{w.title}</span>
          <span className="dash-workout-cat-tag" style={{
            background: `color-mix(in srgb, ${CAT_COLORS[w.category] || 'var(--fg-muted)'} 12%, transparent)`,
            color: CAT_COLORS[w.category] || 'var(--fg-muted)',
          }}>{CAT_LABELS[w.category] || w.category}</span>
        </div>
        {w.notes && <div className="dash-workout-notes">{w.notes}</div>}
      </div>
      <div className="dash-workout-meta">
        {w.duration_minutes && (
          <div className="dash-workout-dur">
            <span className="dash-workout-dur-val">{w.duration_minutes}</span>
            <span className="dash-workout-dur-unit">min</span>
          </div>
        )}
        {w.rpe && (
          <div className="dash-workout-rpe-badge" style={{
            background: rpeBg(w.rpe),
            borderColor: rpeColor(w.rpe),
            color: rpeColor(w.rpe),
          }}>
            {w.rpe}
          </div>
        )}
        <svg className="dash-workout-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  );
}

/* ── Activity Heatmap ── */
function ActivityHeatmap({ data }: { data: { date: string; count: number }[][] }) {
  const dayLabels = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
  const maxCount = Math.max(1, ...data.flat().map((d) => d.count));

  function cellBg(count: number, isFuture: boolean): string {
    if (isFuture) return 'var(--bg-input)';
    if (count === 0) return 'var(--border-subtle)';
    const intensity = Math.min(count / maxCount, 1);
    const alpha = 0.2 + intensity * 0.7;
    return `rgba(255, 106, 0, ${alpha.toFixed(2)})`;
  }

  const todayStr = today();

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-labels">
        {dayLabels.map((l) => <div key={l} className="heatmap-label">{l}</div>)}
      </div>
      <div className="heatmap-grid">
        {data.map((week, wi) => (
          <div key={wi} className="heatmap-col">
            {week.map((day) => (
              <div
                key={day.date}
                className={`heatmap-cell ${day.date > todayStr ? 'future' : ''}`}
                style={{ background: cellBg(day.count, day.date > todayStr) }}
                title={`${day.date}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Minder</span>
        <div className="heatmap-legend-cell" style={{ background: 'var(--border-subtle)' }} />
        <div className="heatmap-legend-cell" style={{ background: 'rgba(255,106,0,0.25)' }} />
        <div className="heatmap-legend-cell" style={{ background: 'rgba(255,106,0,0.5)' }} />
        <div className="heatmap-legend-cell" style={{ background: 'rgba(255,106,0,0.7)' }} />
        <div className="heatmap-legend-cell" style={{ background: 'rgba(255,106,0,0.9)' }} />
        <span>Meer</span>
      </div>
    </div>
  );
}

/* ── Goal Progress ── */
function GoalProgress({ goal }: { goal: Goal }) {
  const progress = goal.current_value && goal.target_value
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0;
  const catCol = goal.category ? CAT_COLORS[goal.category] : 'var(--accent)';

  return (
    <div className="dash-goal">
      <div className="dash-goal-top">
        <span className="dash-goal-title">{goal.title}</span>
        <span className="dash-goal-pct" style={{ color: catCol }}>{progress}%</span>
      </div>
      <div className="dash-goal-bar">
        <div className="dash-goal-fill" style={{ width: `${progress}%`, background: catCol }} />
      </div>
      <div className="dash-goal-meta">
        {goal.current_value !== null && <span>{goal.current_value} {goal.target_unit} huidig</span>}
        {goal.deadline && <span> — deadline {fmtDate(goal.deadline)}</span>}
      </div>
    </div>
  );
}

/* ── PR Card ── */
function PRCard({ pr }: { pr: PersonalRecord }) {
  const catCol = CAT_COLORS[pr.category] || 'var(--accent)';
  const diff = pr.previous_value !== null ? pr.value - pr.previous_value : null;

  return (
    <div className="dash-pr-card">
      <div className="dash-pr-icon" style={{ background: `color-mix(in srgb, ${catCol} 12%, transparent)` }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={catCol} strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6-6 6 6"/><path d="M12 3v12"/><path d="M5 21h14"/>
        </svg>
      </div>
      <div className="dash-pr-info">
        <div className="dash-pr-name">{pr.exercise}</div>
        <div className="dash-pr-date">{pr.date ? fmtDate(pr.date) : ''}</div>
      </div>
      <div className="dash-pr-value-col">
        <div className="dash-pr-val" style={{ color: catCol }}>{pr.value} {pr.unit}</div>
        {diff !== null && diff !== 0 && (
          <div className="dash-pr-diff" style={{ color: 'var(--success)' }}>
            {diff > 0 ? '+' : ''}{diff} {pr.unit}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Weight Sparkline ── */
function WeightSparkline({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;

  const sorted = [...entries].reverse(); // oldest first
  const weights = sorted.map((e) => e.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const w = 320;
  const h = 100;
  const padX = 8;
  const padY = 8;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;

  const points = weights.map((v, i) => ({
    x: padX + (i / (weights.length - 1)) * plotW,
    y: padY + (1 - (v - min) / range) * plotH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x.toFixed(1)},${h} L${points[0].x.toFixed(1)},${h} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dash-weight-spark">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3.5" fill="var(--accent)" />
      <circle cx={last.x} cy={last.y} r="6" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

/* ── Helpers ── */
function calcStreak(workouts: Workout[]): { current: number; longest: number } {
  if (!workouts.length) return { current: 0, longest: 0 };

  // Group workouts by week-start
  const weekSet = new Set<string>();
  workouts.forEach((w) => weekSet.add(weekStart(w.date)));

  // Sort week-starts descending
  const weeks = [...weekSet].sort().reverse();
  if (!weeks.length) return { current: 0, longest: 0 };

  // Check if this week or last week has a workout (current streak)
  const thisW = weekStart(today());
  let current = 0;
  let checkWeek = thisW;

  // If no workout this week, check if last week had one (streak may still count)
  if (!weekSet.has(thisW)) {
    const lwDate = new Date(thisW + 'T00:00:00');
    lwDate.setDate(lwDate.getDate() - 7);
    checkWeek = lwDate.toISOString().slice(0, 10);
    if (!weekSet.has(checkWeek)) {
      // No workout this or last week — streak is 0
      // But still calculate longest
      current = 0;
    }
  }

  if (weekSet.has(checkWeek) || weekSet.has(thisW)) {
    let w = weekSet.has(thisW) ? thisW : checkWeek;
    while (weekSet.has(w)) {
      current++;
      const d = new Date(w + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      w = d.toISOString().slice(0, 10);
    }
  }

  // Calculate longest streak
  let longest = 0;
  let streak = 0;
  const allWeeks = [...weekSet].sort();
  for (let i = 0; i < allWeeks.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(allWeeks[i - 1] + 'T00:00:00');
      const curr = new Date(allWeeks[i] + 'T00:00:00');
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 7) {
        streak++;
      } else {
        streak = 1;
      }
    }
    longest = Math.max(longest, streak);
  }

  return { current, longest };
}

function buildHeatmap(workouts: Workout[]): { date: string; count: number }[][] {
  // Build 12 weeks of data, columns = weeks, rows = days (Mon-Sun)
  const todayDate = new Date();
  const todayStr = today();

  // Find the Monday of the current week
  const currentMonday = new Date(weekStart(todayStr) + 'T00:00:00');

  // Go back 11 weeks for 12 total weeks
  const startMonday = new Date(currentMonday);
  startMonday.setDate(startMonday.getDate() - 11 * 7);

  // Count workouts per date
  const counts: Record<string, number> = {};
  workouts.forEach((w) => {
    counts[w.date] = (counts[w.date] || 0) + 1;
  });

  const weeks: { date: string; count: number }[][] = [];
  for (let w = 0; w < 12; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + w * 7 + d);
      const dateStr = date.toISOString().slice(0, 10);
      week.push({ date: dateStr, count: counts[dateStr] || 0 });
    }
    weeks.push(week);
  }

  return weeks;
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
  const cats = ['strength', 'running', 'cardio', 'cycling', 'swimming', 'flexibility', 'sport', 'other'];
  const currentWeekLabel = 'W' + getISOWeek(new Date());

  const datasets = cats
    .filter((c) => weekKeys.some((w) => weeks[w][c]))
    .map((c) => ({
      label: CAT_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1),
      data: weekKeys.map((w) => weeks[w][c] || 0),
      backgroundColor: catColor(c) + 'cc',
      borderRadius: 3,
      borderSkipped: false as const,
    }));

  const ch = getChartColors();
  const opts = {
    ...chartDefaults(),
    scales: {
      x: {
        stacked: true,
        grid: { color: ch.grid },
        ticks: {
          color: (ctx: { tick: { label?: string | string[] } }) => {
            const lbl = Array.isArray(ctx.tick.label) ? ctx.tick.label[0] : ctx.tick.label;
            return lbl === currentWeekLabel ? ch.accent : ch.muted;
          },
          font: { size: 11, weight: 'normal' as const },
        },
        border: { color: ch.border },
      },
      y: {
        stacked: true,
        grid: { color: ch.grid },
        ticks: { color: ch.muted, font: { size: 11 } },
        border: { color: ch.border },
        title: { display: true, text: 'min', color: ch.muted, font: { size: 11 } },
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, padding: 12, color: ch.dim, font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(0,0,0,.8)', titleColor: '#fff', bodyColor: '#ddd', padding: 10, cornerRadius: 6, titleFont: { family: "'Outfit',sans-serif", weight: 'bold' as const } },
    },
  };

  return { data: { labels, datasets }, options: opts };
}

// Keep backward compat for WorkoutRow export used elsewhere
export function WorkoutRow({ workout: w, onClick }: { workout: Workout; onClick: () => void }) {
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
