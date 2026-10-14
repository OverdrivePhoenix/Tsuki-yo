import React from 'react';
import { usePreFetch } from '../../context/PreFetchContext';

export const TopSwitcher: React.FC = () => {
  const {
    activeView,
    setActiveView,
    orders,
    isMobileFrame,
    setIsMobileFrame,
    addLiveMockOrder,
    resetAllData,
  } = usePreFetch();

  const pendingCount = orders.filter((o) => o.status === 'PREPARING' || o.status === 'READY FOR PICKUP').length;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#060D17] text-white border-b border-[#00E5FF]/30 text-xs font-mono shadow-xl transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        {/* Left: Brand & Stitch Project Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#1E2E45] px-2 py-0.5 rounded border border-[#00E5FF]/40 text-[#00E5FF] font-bold">
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>MEC PreFetch</span>
          </div>
          <span className="hidden sm:inline-block px-1.5 py-0.5 bg-[#00E676]/10 text-[#00E676] rounded text-[10px] font-semibold">
            ● FIRESTORE LIVE
          </span>
        </div>

        {/* Middle: Screen Switchers matching Stitch Screens */}
        <div className="flex items-center gap-1 shrink-0 bg-[#0B192C] p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveView('landing')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-medium ${
              activeView === 'landing'
                ? 'bg-[#00E5FF] text-[#0B192C] font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
            title="Screen 1: Landing Hub"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            <span className="hidden md:inline">1. Landing Hub</span>
            <span className="md:hidden">1. Hub</span>
          </button>

          <button
            onClick={() => setActiveView('catalog')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-medium ${
              activeView === 'catalog'
                ? 'bg-[#00E5FF] text-[#0B192C] font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
            title="Screen 2: Student Catalog & AI Bundler"
          >
            <span className="material-symbols-outlined text-sm">storefront</span>
            <span className="hidden md:inline">2. Student Catalog</span>
            <span className="md:hidden">2. Catalog</span>
          </button>

          <button
            onClick={() => setActiveView('checkout')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-medium ${
              activeView === 'checkout'
                ? 'bg-[#00E5FF] text-[#0B192C] font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
            title="Screen 3: Checkout & Token"
          >
            <span className="material-symbols-outlined text-sm">qr_code_2</span>
            <span className="hidden md:inline">3. Checkout & Token</span>
            <span className="md:hidden">3. Token</span>
          </button>

          <button
            onClick={() => setActiveView('admin')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-medium ${
              activeView === 'admin'
                ? 'bg-[#00E5FF] text-[#0B192C] font-bold shadow'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
            title="Screen 4: Store Admin Fulfillment Console"
          >
            <span className="material-symbols-outlined text-sm">terminal</span>
            <span className="hidden md:inline">4. Admin Console</span>
            <span className="md:hidden">4. Admin</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 px-1 bg-[#FFB300] text-[#060D17] rounded-full text-[9px] font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: View Options & Simulations */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(activeView === 'catalog' || activeView === 'checkout') && (
            <button
              onClick={() => setIsMobileFrame((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors flex items-center gap-1 ${
                isMobileFrame
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]'
                  : 'bg-white/5 text-gray-300 border-white/20 hover:text-white'
              }`}
              title="Toggle Mobile PWA Device Frame"
            >
              <span className="material-symbols-outlined text-xs">
                {isMobileFrame ? 'stay_current_portrait' : 'desktop_windows'}
              </span>
              <span className="hidden lg:inline">{isMobileFrame ? 'Mobile Frame (390px)' : 'Full Responsive'}</span>
            </button>
          )}

          <button
            onClick={addLiveMockOrder}
            className="px-2 py-0.5 bg-[#5F259F] hover:bg-[#5F259F]/80 text-white rounded text-[10px] border border-white/20 flex items-center gap-1"
            title="Simulate student order placed right now"
          >
            <span className="material-symbols-outlined text-xs">add_circle</span>
            <span className="hidden sm:inline">+ Student Order</span>
          </button>

          <button
            onClick={resetAllData}
            className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-[10px] border border-white/10"
            title="Reset Stock & Orders"
          >
            <span className="material-symbols-outlined text-xs">restart_alt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
