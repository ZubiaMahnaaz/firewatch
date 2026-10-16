import React from 'react';

export type TabKey = 'overview-triage' | 'priority-queue' | 'data-validation' | 'analytics-trends' | 'evaluation-limitations';

interface NavigationProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  highPriorityCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  highPriorityCount = 0
}) => {
  const tabs = [
    { key: 'overview-triage' as TabKey, label: 'Overview', icon: 'radar' },
    { key: 'priority-queue' as TabKey, label: 'Queue', icon: 'table_chart', badge: highPriorityCount > 0 ? highPriorityCount : undefined },
    { key: 'data-validation' as TabKey, label: 'Validation', icon: 'verified' },
    { key: 'analytics-trends' as TabKey, label: 'Analytics', icon: 'query_stats' },
    { key: 'evaluation-limitations' as TabKey, label: 'Caveats', icon: 'info' },
  ];

  return (
    <>
      {/* Desktop Top Sub-nav Bar (hidden on mobile, visible on desktop md+) */}
      <nav className="hidden md:flex fixed top-16 w-full z-40 bg-[#1A2026] border-b border-[#323B43] px-4 h-11 items-center justify-between">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11px] transition-colors ${
                  isActive
                    ? 'bg-[#252C32] text-[#FFB547] border border-[#FFB547]/50 font-semibold shadow-sm'
                    : 'text-[#9BA3AF] hover:text-[#F4F1E9] hover:bg-[#252C32]/60'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-[#F04438] text-white font-mono text-[9px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[#6C7684]">
          <span>WGS 84 • MODIS 1km / VIIRS 375m</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#55B887]"></span>
          <span className="text-[#55B887]">Heuristic Decision Support</span>
        </div>
      </nav>

      {/* Mobile/Tablet Fixed Bottom Navigation (matching Stitch files exactly) */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#15191D]/95 backdrop-blur-md border-t border-[#323B43] md:hidden">
        <div className="flex items-center justify-around h-16 px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key)}
                className={`flex flex-col items-center justify-center w-16 h-12 transition-colors relative ${
                  isActive ? 'text-[#FFB547] font-semibold' : 'text-[#9BA3AF] hover:text-[#F4F1E9]'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 w-6 h-0.5 bg-[#FFB547] rounded-full"></span>
                )}
                <div className="relative">
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 px-1 rounded-full bg-[#F04438] text-white font-mono text-[8px] font-bold">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
