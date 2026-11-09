'use client';

import type { SprintVariant } from '@/types/database';
import { estimateSprintBests, fmtSprintTime } from '@/lib/helpers';

interface Props {
  variant: SprintVariant | null;
  reps: { distance_m: number | null; time_sec: number | null }[];
}

/** "Beste" times at 60/100/200/400/800m, measured or estimated from the reps. */
export default function SprintEstimates({ variant, reps }: Props) {
  // Flying starts are artificially fast, hill/sled reps artificially slow.
  if (variant && variant !== 'acceleration') {
    return (
      <p className="sprint-est-note">
        Schatting voor 60–800m alleen bij acceleratie-sprints (staande start).
      </p>
    );
  }

  const est = estimateSprintBests(reps);
  if (!est.length) return null;

  return (
    <div className="sprint-est">
      <span className="interval-label">Beste (geschat)</span>
      <div className="sprint-est-grid">
        {est.map((e) => (
          <div className={`sprint-est-cell${e.measured ? ' measured' : ''}`} key={e.distance}
               title={e.measured ? 'Gemeten' : `Geschat op basis van je ${e.fromDistance}m`}>
            <span className="sprint-est-dist">{e.distance}m</span>
            <strong>{e.measured ? '' : '≈'}{fmtSprintTime(Math.round(e.time * 100) / 100)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
