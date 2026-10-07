import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';

// Register Chart.js modules once
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

export function getChartColors(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { fg: '#e4e6ee', dim: '#8a8a8a', muted: '#555555', border: '#2a2a2a', accent: '#ff6a00', grid: '#1e1e1e' };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    fg: s.getPropertyValue('--fg').trim(),
    dim: s.getPropertyValue('--fg-dim').trim(),
    muted: s.getPropertyValue('--fg-muted').trim(),
    border: s.getPropertyValue('--border').trim(),
    accent: s.getPropertyValue('--accent').trim(),
    grid: s.getPropertyValue('--border-subtle').trim(),
  };
}

export function catColor(c: string): string {
  if (typeof window === 'undefined') return '#888';
  return getComputedStyle(document.documentElement).getPropertyValue('--cat-' + c).trim() || '#888';
}

export function chartDefaults(): ChartOptions<'bar' | 'line'> {
  const c = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,.8)',
        titleColor: '#fff',
        bodyColor: '#ddd',
        padding: 10,
        cornerRadius: 6,
        titleFont: { family: "'Outfit',sans-serif", weight: 'bold' as const },
      },
    },
    scales: {
      x: {
        grid: { color: c.grid },
        ticks: { color: c.muted, font: { size: 11 } },
        border: { color: c.border },
      },
      y: {
        grid: { color: c.grid },
        ticks: { color: c.muted, font: { size: 11 } },
        border: { color: c.border },
      },
    },
  };
}
