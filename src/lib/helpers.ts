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

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekStart(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  return dt.toISOString().slice(0, 10);
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

// ─── Category color map ─────────
export const CAT_COLORS: Record<string, string> = {
  strength: 'var(--cat-strength)',
  cardio: 'var(--cat-cardio)',
  cycling: 'var(--cat-cycling)',
  swimming: 'var(--cat-swimming)',
  flexibility: 'var(--cat-flexibility)',
  sport: 'var(--cat-sport)',
  other: 'var(--cat-other)',
};

export const CAT_COLORS_HEX: Record<string, { dark: string; light: string }> = {
  strength: { dark: '#ff6a00', light: '#e05500' },
  cardio: { dark: '#2dd4a0', light: '#059669' },
  cycling: { dark: '#38bdf8', light: '#0284c7' },
  swimming: { dark: '#818cf8', light: '#6366f1' },
  flexibility: { dark: '#c084fc', light: '#9333ea' },
  sport: { dark: '#f5b731', light: '#d97706' },
  other: { dark: '#8a90a8', light: '#6b7094' },
};
