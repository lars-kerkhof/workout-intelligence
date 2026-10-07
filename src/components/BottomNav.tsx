'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DashboardIcon, IntelligenceIcon, PlusIcon, TrophyIcon,
  FlagIcon, GoalIcon, WeightIcon, MapIcon, MoreIcon,
} from './Icons';

const MAIN_ITEMS: readonly { id: string; label: string; icon: React.ComponentType<{ className?: string }>; isLog?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'analyze', label: 'Intel', icon: IntelligenceIcon },
  { id: 'log', label: '+', icon: PlusIcon, isLog: true },
  { id: 'prs', label: 'PRs', icon: TrophyIcon },
  { id: 'races', label: 'Races', icon: FlagIcon },
];

const MORE_ITEMS = [
  { id: 'goals', label: 'Goals', icon: GoalIcon },
  { id: 'weight', label: 'Weight', icon: WeightIcon },
  { id: 'routes', label: 'Routes', icon: MapIcon },
] as const;

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMore) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    }
    setTimeout(() => document.addEventListener('click', handleClick), 10);
    return () => document.removeEventListener('click', handleClick);
  }, [showMore]);

  const moreActive = MORE_ITEMS.some((i) => i.id === currentView);

  return (
    <nav className="bottom-nav">
      {MAIN_ITEMS.map((item) =>
        item.isLog ? (
          <button
            key={item.id}
            className="bnav-item log-btn"
            onClick={() => onNavigate('log')}
          >
            <item.icon />
            <span>+</span>
          </button>
        ) : (
          <button
            key={item.id}
            className={`bnav-item${currentView === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon />
            <span>{item.label}</span>
          </button>
        )
      )}
      <div style={{ position: 'relative' }} ref={moreRef}>
        <button
          className={`bnav-item${moreActive ? ' active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <MoreIcon />
          <span>More</span>
        </button>
        {showMore && (
          <div
            style={{
              position: 'absolute',
              bottom: '52px',
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '6px',
              zIndex: 150,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '160px',
              boxShadow: '0 8px 30px rgba(0,0,0,.3)',
            }}
          >
            {MORE_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item${currentView === item.id ? ' active' : ''}`}
                onClick={() => {
                  setShowMore(false);
                  onNavigate(item.id);
                }}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
