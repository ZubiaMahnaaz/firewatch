import React, { useState, useEffect } from 'react';
import type { Observation, DashboardOverview, ScoringWeights } from './types';
import {
  fetchDashboardOverview,
  fetchObservations,
  fetchScoringWeights
} from './api';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import type { TabKey } from './components/Navigation';
import { OverviewScreen } from './components/OverviewScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { CaveatsScreen } from './components/CaveatsScreen';
import { QueueScreen } from './components/QueueScreen';
import { ValidationScreen } from './components/ValidationScreen';
import { ObservationModal } from './components/ObservationModal';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview-triage');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [totalObservations, setTotalObservations] = useState<number>(0);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [modalObservation, setModalObservation] = useState<Observation | null>(null);
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>({
    w_frp: 0.35,
    w_recency: 0.25,
    w_confidence: 0.20,
    w_persistence: 0.20,
    half_life_hours: 6.0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<any>({ limit: 100 });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (filters: any = activeFilters) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [ovData, obsData, weightsData] = await Promise.all([
        fetchDashboardOverview(),
        fetchObservations(filters),
        fetchScoringWeights()
      ]);
      setOverview(ovData);
      setObservations(obsData.items);
      setTotalObservations(obsData.total);
      setScoringWeights(weightsData);

      // Default select first observation if none selected
      if (!selectedObservation && obsData.items.length > 0) {
        setSelectedObservation(obsData.items[0]);
      }
    } catch (err: any) {
      console.error('Failed to load FireWatch telemetry:', err);
      setError(err.message || 'Error communicating with FireWatch backend API.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (newFilters: any) => {
    const merged = { ...activeFilters, ...newFilters };
    setActiveFilters(merged);
    loadData(merged);
  };

  return (
    <div className="min-h-screen bg-[#15191D] text-[#F4F1E9] flex flex-col font-body">
      {/* Top Header */}
      <Header
        onOpenUpload={() => setActiveTab('data-validation')}
        onRefresh={() => loadData(activeFilters)}
        isRefreshing={isRefreshing}
        onNotification={showToast}
      />

      {/* Navigation (Desktop sub-nav + Mobile bottom bar) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        highPriorityCount={overview?.high_priority_count}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1C2227] border border-[#55B887] text-[#55B887] px-3.5 py-2 rounded shadow-2xl font-mono text-xs flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[#55B887]"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-grow pt-16 md:pt-28 flex flex-col">
        {isLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8 space-y-3">
            <RefreshCw className="w-8 h-8 text-[#FFB547] animate-spin" />
            <p className="font-mono text-xs text-[#9BA3AF]">
              Initializing FireWatch Satellite Telemetry &amp; Radiometric Models...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 m-4 bg-[#252C32] border border-[#F04438]/50 rounded-lg max-w-lg mx-auto text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#F04438] mx-auto" />
            <h3 className="font-headline text-base font-bold text-[#F4F1E9]">API Communication Error</h3>
            <p className="font-mono text-xs text-[#9BA3AF]">{error}</p>
            <button
              onClick={() => loadData(activeFilters)}
              className="px-4 py-2 rounded bg-[#FFB547] text-[#15191D] font-mono text-xs font-bold hover:bg-[#E69E35]"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* Screen 3: Overview & Tactical Map */}
            {activeTab === 'overview-triage' && (
              <OverviewScreen
                overview={overview}
                observations={observations}
                selectedObservation={selectedObservation}
                onSelectObservation={setSelectedObservation}
                onRefresh={() => loadData(activeFilters)}
                isRefreshing={isRefreshing}
                onNavigateToQueue={() => setActiveTab('priority-queue')}
                onFilterChange={handleFilterChange}
              />
            )}

            {/* Priority Queue & Explorer Table */}
            {activeTab === 'priority-queue' && (
              <QueueScreen
                observations={observations}
                totalObservations={totalObservations}
                selectedObservation={selectedObservation}
                onSelectObservation={(obs) => {
                  setSelectedObservation(obs);
                  setModalObservation(obs);
                }}
                onFilterChange={handleFilterChange}
                onOpenDetailModal={(obs) => setModalObservation(obs)}
              />
            )}

            {/* Screen 2: Temporal Analytics */}
            {activeTab === 'analytics-trends' && (
              <AnalyticsScreen
                overview={overview}
                scoringWeights={scoringWeights}
                onRefreshWeights={() => fetchScoringWeights().then(setScoringWeights)}
                onRefreshData={() => loadData(activeFilters)}
              />
            )}

            {/* Screen 1: Caveats & Scientific Limitations */}
            {activeTab === 'evaluation-limitations' && (
              <CaveatsScreen />
            )}

            {/* Data Import & Validation Engine */}
            {activeTab === 'data-validation' && (
              <ValidationScreen
                onImportComplete={() => {
                  loadData(activeFilters);
                  showToast('New observations imported and prioritized.');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Observation Detail Inspection Modal */}
      {modalObservation && (
        <ObservationModal
          observation={modalObservation}
          onClose={() => setModalObservation(null)}
          onReviewUpdated={() => {
            loadData(activeFilters);
            showToast('Observation review updated.');
          }}
        />
      )}
    </div>
  );
};

export default App;
