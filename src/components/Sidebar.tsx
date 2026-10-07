'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DashboardIcon, PlusIcon, IntelligenceIcon, TrophyIcon,
  GoalIcon, FlagIcon, WeightIcon, MapIcon,
} from './Icons';

type View = 'dashboard' | 'log' | 'analyze' | 'prs' | 'goals' | 'races' | 'weight' | 'routes';

const NAV_ITEMS: { id: View; label: string; icon: React.ComponentType<{ className?: string }>; dividerBefore?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'log', label: 'Log Workout', icon: PlusIcon },
  { id: 'analyze', label: 'Intelligence', icon: IntelligenceIcon },
  { id: 'prs', label: 'Personal Records', icon: TrophyIcon },
  { id: 'goals', label: 'Goals', icon: GoalIcon, dividerBefore: true },
  { id: 'races', label: 'Races', icon: FlagIcon },
  { id: 'weight', label: 'Weight', icon: WeightIcon },
  { id: 'routes', label: 'Routes', icon: MapIcon },
];

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.from('workouts').select('*', { count: 'exact', head: true });
        setConnected(!error);
      } catch {
        setConnected(false);
      }
    })();
  }, []);

  return (
    <aside className="sidebar">
      <div className="logo">
        <span>W</span>orkout Intel
      </div>
      <nav className="nav-items">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            {item.dividerBefore && <div className="nav-divider" />}
            <button
              className={`nav-item${currentView === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className={`conn-status ${connected === null ? '' : connected ? 'conn-ok' : 'conn-err'}`}>
        <span className="conn-dot" />
        {connected === null ? 'Checking...' : connected ? 'Connected' : 'Offline'}
      </div>
    </aside>
  );
}
