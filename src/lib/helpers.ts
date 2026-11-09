// ─── Date helpers ───────────────
export function fmtDate(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export function fmtDateFull(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format a Date as YYYY-MM-DD in local time (not UTC). */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function today(): string {
  return toLocalDateStr(new Date());
}

export function weekStart(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  return toLocalDateStr(dt);
}

export function getISOWeek(d: Date): number {
  const t = new Date(d.valueOf());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const y = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round((t.getTime() - y.getTime()) / 864e5 / 7);
}

export function weekLabel(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return `W${getISOWeek(dt)}`;
}

// ─── Formatting ─────────────────
export function fmtDuration(m: number | null): string {
  if (!m) return '-';
  if (m < 60) return m + 'min';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'min';
}

export function fmtPace(s: number | null): string {
  if (!s) return '-';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ':' + String(sec).padStart(2, '0') + '/km';
}

// ─── Sprint formatting ──────────
export function fmtSprintTime(sec: number | null): string {
  if (!sec) return '-';
  if (sec < 60) return sec.toFixed(2) + 's';
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(2).padStart(5, '0')}`;
}

/** Average speed in km/h for a sprint rep, e.g. "25.7 km/u". */
export function sprintKmh(distanceM: number | null, timeSec: number | null): string | null {
  if (!distanceM || !timeSec) return null;
  return ((distanceM / timeSec) * 3.6).toFixed(1) + ' km/u';
}

// ─── Time formatting (PRs) ──────
export function fmtTimePR(totalSec: number): string {
  // Sprint times carry hundredths (e.g. 7.84s)
  if (!Number.isInteger(totalSec)) return fmtSprintTime(totalSec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── RPE colors ─────────────────
export function rpeColor(v: number): string {
  if (v <= 4) return 'var(--success)';
  if (v <= 7) return 'var(--warning)';
  return 'var(--danger)';
}

export function rpeBg(v: number): string {
  if (v <= 4) return 'var(--success-dim)';
  if (v <= 7) return 'var(--warning-dim)';
  return 'var(--danger-dim)';
}

// ─── Greeting helper ───────────
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export function fmtDateLong(): string {
  const d = new Date();
  const day = d.toLocaleDateString('nl-NL', { weekday: 'long' });
  const rest = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  return day.charAt(0).toUpperCase() + day.slice(1) + ' ' + rest;
}

// ─── Category color map ─────────
export const CAT_COLORS: Record<string, string> = {
  strength: 'var(--cat-strength)',
  running: 'var(--cat-running)',
  plyometrics: 'var(--cat-plyometrics)',
  cardio: 'var(--cat-cardio)',
  cycling: 'var(--cat-cycling)',
  swimming: 'var(--cat-swimming)',
  flexibility: 'var(--cat-flexibility)',
  sport: 'var(--cat-sport)',
  other: 'var(--cat-other)',
};

export const CAT_COLORS_HEX: Record<string, { dark: string; light: string }> = {
  strength: { dark: '#ff6a00', light: '#e05500' },
  running: { dark: '#ec4899', light: '#db2777' },
  plyometrics: { dark: '#a3e635', light: '#65a30d' },
  cardio: { dark: '#2dd4a0', light: '#059669' },
  cycling: { dark: '#38bdf8', light: '#0284c7' },
  swimming: { dark: '#818cf8', light: '#6366f1' },
  flexibility: { dark: '#c084fc', light: '#9333ea' },
  sport: { dark: '#f5b731', light: '#d97706' },
  other: { dark: '#8a90a8', light: '#6b7094' },
};
