'use client';

import { useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Dashboard from '@/components/Dashboard';
import LogWorkoutModal from '@/components/LogWorkoutModal';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import AnalyzeView from '@/components/AnalyzeView';
import PRsView from '@/components/PRsView';
import GoalsView from '@/components/GoalsView';
import RacesView from '@/components/RacesView';
import WeightView from '@/components/WeightView';
import RoutesView from '@/components/RoutesView';

type View = 'dashboard' | 'analyze' | 'prs' | 'goals' | 'races' | 'weight' | 'routes';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [showLog, setShowLog] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useCallback((target: string) => {
    if (target === 'log') {
      setShowLog(true);
    } else {
      setView(target as View);
    }
  }, []);

  const handleSaved = useCallback(() => {
    setShowLog(false);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDeleted = useCallback(() => {
    setDetailId(null);
    setRefreshKey((k) => k + 1);
  }, []);

  function renderView() {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            key={refreshKey}
            onOpenLog={() => setShowLog(true)}
            onShowDetail={(id) => setDetailId(id)}
          />
        );
      case 'analyze':
        return <AnalyzeView key={refreshKey} />;
      case 'prs':
        return <PRsView key={refreshKey} />;
      case 'goals':
        return <GoalsView key={refreshKey} />;
      case 'races':
        return <RacesView key={refreshKey} />;
      case 'weight':
        return <WeightView key={refreshKey} />;
      case 'routes':
        return <RoutesView key={refreshKey} />;
      default:
        return <Dashboard key={refreshKey} onOpenLog={() => setShowLog(true)} onShowDetail={(id) => setDetailId(id)} />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar currentView={view} onNavigate={navigate} />
      <main className="main-content">
        {renderView()}
      </main>
      <BottomNav currentView={view} onNavigate={navigate} />

      {showLog && (
        <LogWorkoutModal onClose={() => setShowLog(false)} onSaved={handleSaved} />
      )}
      {detailId && (
        <WorkoutDetailModal
          workoutId={detailId}
          onClose={() => setDetailId(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
