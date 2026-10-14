import React from 'react';
import { usePreFetch } from '../../context/PreFetchContext';

export const LandingHub: React.FC = () => {
  const { setActiveView, addBundleToCart, bundles } = usePreFetch();

  const handleReserve = (bundleId: string) => {
    const bundle = bundles.find((b) => b.id === bundleId);
    if (bundle) {
      addBundleToCart(bundle);
    } else {
      setActiveView('catalog');
    }
  };

  return (
    <div className="bg-[#F8FAFC] text-[#111c2d] min-h-screen flex flex-col font-sans selection:bg-[#00E5FF] selection:text-[#0B192C] pt-9">
      {/* Desktop Navigation */}
      <header className="fixed top-9 left-0 w-full z-40 flex items-center justify-between px-4 md:px-8 h-14 bg-[#0B192C] text-[#f9f9ff] border-b border-[#75777d]/20">
        {/* MEC Insignia Brand Cluster */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#1E2E45] border border-[#00E5FF]/40 text-[#00E5FF]">
            <span className="material-symbols-outlined text-lg">bolt</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white uppercase hover:text-[#00E5FF] transition-colors duration-150">
              MEC PreFetch
            </span>
            <span className="font-mono text-[10px] text-[#525f75] leading-none">
              MARIAN CO-OP STORE
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <a
            className="text-sm text-gray-300 hover:text-[#00E5FF] transition-colors duration-150"
            href="#bundles"
          >
            Curriculum Bundles
          </a>
          <a
            className="text-sm text-gray-300 hover:text-[#00E5FF] transition-colors duration-150"
            href="#telemetry"
          >
            Live Queue Status
          </a>
          <a
            className="text-sm text-gray-300 hover:text-[#00E5FF] transition-colors duration-150"
            href="#steps"
          >
            Student Guide
          </a>
          <a
            className="text-sm text-gray-300 hover:text-[#00E5FF] transition-colors duration-150"
            href="#architecture"
          >
            Tech Architecture
          </a>
        </nav>

        {/* CTAs Cluster */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('admin')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00E5FF]/30 text-white font-mono text-xs hover:bg-[#1E2E45] hover:text-[#00E5FF] transition-all duration-150 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">terminal</span>
            <span>Admin Counter</span>
          </button>
          <button
            onClick={() => setActiveView('catalog')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00E5FF] text-[#0B192C] text-xs font-bold hover:bg-white transition-all duration-150 shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            <span>Launch App</span>
          </button>
        </div>
      </header>

      {/* Hero Section & Live Telemetry */}
      <main className="flex-1 pt-14 pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* High-Impact Technical Hero Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8 pb-10">
            {/* Left: Copy & Value Proposition */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded bg-[#e7eeff] border border-[#c5c6cd]">
                <span className="inline-block w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
                <span className="font-mono text-xs text-[#44474c] font-semibold">
                  CAMPUS CONCURRENCY ENGINE v3.4
                </span>
                <span className="font-mono text-xs text-[#75777d]">|</span>
                <span className="font-mono text-xs text-[#006875] font-semibold">
                  KTU 2024 CURRICULUM SYNCED
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B192C] tracking-tight leading-tight">
                Zero Queues. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0B192C] via-[#006875] to-[#00E5FF]">
                  30-Second Campus Pickups.
                </span>
              </h1>

              <p className="text-base text-[#525f75] max-w-2xl leading-relaxed">
                Engineered for Marian Engineering College. Pre-order syllabus-curated kits, pay
                instantly with Google Pay UPI, and pick up pre-packed bundles between lectures
                without waiting in line.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveView('catalog')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0B192C] text-white font-semibold text-sm rounded-lg hover:bg-[#1E2E45] transition-all duration-150 shadow-sm active:scale-95"
                >
                  <span>Order Curriculum Kit</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5F259F]/10 border border-[#5F259F]/20 text-[#5F259F] font-mono text-xs font-semibold">
                  <span className="material-symbols-outlined text-base">qr_code_2</span>
                  <span>Direct Google Pay UPI Intent</span>
                </div>
              </div>

              {/* Micro Stats Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#c5c6cd]/40">
                <div>
                  <div className="text-2xl font-bold text-[#0B192C]">18s</div>
                  <div className="font-mono text-xs text-[#525f75]">Avg Counter Transit</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0B192C]">100%</div>
                  <div className="font-mono text-xs text-[#525f75]">KTU Syllabus Verified</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0B192C]">0 Oversell</div>
                  <div className="font-mono text-xs text-[#525f75]">Atomic Inventory Lock</div>
                </div>
              </div>
            </div>

            {/* Right: Live Campus Store Status Widget & Token Mock */}
            <div className="lg:col-span-5 flex flex-col gap-4" id="telemetry">
              {/* Terminal Status Card */}
              <div className="bg-[#060D17] text-white p-6 rounded-xl border border-[#00E5FF]/30 shadow-xl relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#00E5FF]/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between pb-3 border-b border-[#00E5FF]/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00E5FF] text-base">
                      terminal
                    </span>
                    <span className="font-mono text-xs text-white font-semibold tracking-wider">
                      LIVE STORE TELEMETRY
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-ping"></span>
                    STATION 01 ONLINE
                  </span>
                </div>

                {/* Metrics List */}
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Current Counter Wait Time</span>
                    <span className="font-mono text-xl text-[#00E5FF] font-bold tracking-wide">
                      18s
                    </span>
                  </div>
                  <div className="w-full bg-[#1E2E45] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#00E5FF] h-full w-[15%]"></div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">Queue Density</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-[#00E676] font-bold">LOW</span>
                      <span className="text-xs text-gray-500">(Break in 42 mins)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Active Firestore Stream</span>
                    <span className="font-mono text-xs text-[#00E676] font-medium">
                      REACTIVE_SYNC_ONLINE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Concurrent Session Load</span>
                    <span className="font-mono text-xs text-white">24 Active Baskets</span>
                  </div>
                </div>

                {/* Dynamic Fast-Fetch Token Preview */}
                <div className="mt-2 p-3 rounded-lg bg-[#1E2E45]/60 border border-dashed border-[#00E5FF]/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] text-[#00E5FF] tracking-wider uppercase">
                        Sample Verifiable Pickup Token
                      </div>
                      <div className="font-mono text-xl font-bold text-white tracking-wider">
                        #FETCH-8802
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-white p-1 rounded flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#0B192C] text-2xl">
                        qr_code_scanner
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 mt-1">
                    Scanned via Honeywell 2D Imager at Counter Bay 02
                  </div>
                </div>
              </div>

              {/* Quick Tip */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#e7eeff] border border-[#c5c6cd]/60 text-[#111c2d]">
                <span className="material-symbols-outlined text-[#006875] text-lg">info</span>
                <span className="text-xs">
                  Kits ordered now will be staged for pickup by 10:45 AM tea interval.
                </span>
              </div>
            </div>
          </div>

          {/* How PreFetch Works in 3 Steps */}
          <section className="py-12 border-t border-[#c5c6cd]/40" id="steps">
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8">
              <div className="font-mono text-xs text-[#006875] font-semibold tracking-wider uppercase mb-1">
                HIGH-THROUGHPUT WORKFLOW
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#0B192C]">
                How PreFetch Operates in 3 Steps
              </h2>
              <p className="text-sm text-[#525f75] mt-1">
                Designed to eliminate the 200-student crush during standard 15-minute semester breaks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-white p-6 rounded-xl border border-[#c5c6cd]/60 hover:border-[#0B192C] transition-all duration-150 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#0B192C] text-white flex items-center justify-center font-mono font-bold text-lg mb-4">
                    01
                  </div>
                  <div className="flex items-center gap-1.5 text-[#006875] mb-1">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span className="font-mono text-xs font-semibold">KTU SYLLABUS RESOLVER</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B192C] mb-2">
                    Select Curriculum & AI Bundle
                  </h3>
                  <p className="text-xs text-[#525f75] leading-relaxed">
                    Filter by Semester and Engineering Branch. The system packages required lecture
                    notebooks, approved scientific calculators, drawing kits, and lab records with
                    zero manual item hunting.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#c5c6cd]/30 font-mono text-[11px] text-[#44474c] flex items-center justify-between">
                  <span>Catalog Accuracy</span>
                  <span className="text-[#00E676] font-bold">99.8%</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-6 rounded-xl border border-[#c5c6cd]/60 hover:border-[#0B192C] transition-all duration-150 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#5F259F] text-white flex items-center justify-center font-mono font-bold text-lg mb-4">
                    02
                  </div>
                  <div className="flex items-center gap-1.5 text-[#5F259F] mb-1">
                    <span className="material-symbols-outlined text-sm">lock_clock</span>
                    <span className="font-mono text-xs font-semibold">ATOMIC INVENTORY LOCK</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B192C] mb-2">
                    Atomic Concurrency & GPay UPI
                  </h3>
                  <p className="text-xs text-[#525f75] leading-relaxed">
                    Items are reserved via Redis distributed locks for 5 minutes during checkout.
                    Authorize payment directly through Google Pay UPI with zero transaction
                    surcharges. No stock overselling guaranteed.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#c5c6cd]/30 font-mono text-[11px] text-[#44474c] flex items-center justify-between">
                  <span>Payment Protocol</span>
                  <span className="text-[#5F259F] font-bold">UPI 2.0 INTENT</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-6 rounded-xl border border-[#c5c6cd]/60 hover:border-[#0B192C] transition-all duration-150 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#1E2E45] text-[#00E5FF] flex items-center justify-center font-mono font-bold text-lg mb-4">
                    03
                  </div>
                  <div className="flex items-center gap-1.5 text-[#006875] mb-1">
                    <span className="material-symbols-outlined text-sm">qr_code</span>
                    <span className="font-mono text-xs font-semibold">OPTICAL VERIFICATION</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B192C] mb-2">
                    &lt;30s Tokenized Collection
                  </h3>
                  <p className="text-xs text-[#525f75] leading-relaxed">
                    Receive an encrypted #FETCH pickup token with dynamic QR. Walk up to Station 01
                    express counter, optical laser scans your screen, and store staff hand over your
                    pre-bagged pack in seconds.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#c5c6cd]/30 font-mono text-[11px] text-[#44474c] flex items-center justify-between">
                  <span>Station Transit Time</span>
                  <span className="text-[#00E676] font-bold">&lt; 30 SECONDS</span>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Semester Bundles Grid */}
          <section className="py-10 border-t border-[#c5c6cd]/40" id="bundles">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
              <div>
                <div className="font-mono text-xs text-[#006875] font-semibold uppercase tracking-wider mb-1">
                  KTU OFFICIAL PACKS
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#0B192C]">
                  Featured Semester Curriculum Bundles
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#525f75]">
                <span className="w-2 h-2 rounded-full bg-[#00E676]"></span>
                <span>Real-time inventory stream active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {bundles.map((bundle) => {
                const isOutOfStock = bundle.inStock === 0;
                return (
                  <div
                    key={bundle.id}
                    className="bg-white rounded-xl border border-[#c5c6cd]/80 hover:border-[#0B192C] hover:shadow-md transition-all duration-150 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded bg-[#e7eeff] text-[#0B192C] font-mono text-[11px] font-bold">
                          {bundle.branch}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                            isOutOfStock
                              ? 'text-[#FF3366] bg-[#FF3366]/10 border border-[#FF3366]/30 line-through'
                              : bundle.inStock <= 5
                              ? 'text-[#FFB300] bg-[#FFB300]/10 border border-[#FFB300]/30'
                              : 'text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30'
                          }`}
                        >
                          {bundle.statusBadge}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0B192C] mb-1 leading-snug">
                        {bundle.title}
                      </h3>
                      <p className="text-xs text-[#525f75] mb-3 leading-relaxed">
                        {bundle.subtitle}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f0f3ff] text-[#44474c]">
                          {bundle.items.length} Items
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f0f3ff] text-[#44474c]">
                          Save ₹{bundle.savings}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-[#f0f3ff] border-t border-[#c5c6cd]/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#525f75] block">Bundle Price</span>
                        <div className="font-mono text-base text-[#0B192C] font-bold">
                          ₹{bundle.bundlePrice}
                        </div>
                      </div>
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-400 font-mono text-xs cursor-not-allowed font-semibold"
                        >
                          OUT OF STOCK
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReserve(bundle.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0B192C] text-white font-mono text-xs hover:bg-[#1E2E45] transition-colors duration-150 active:scale-95 font-semibold"
                        >
                          Reserve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Technical Architecture Showcase Banner */}
          <section
            className="my-10 bg-[#0B192C] text-white p-6 md:p-8 rounded-2xl border border-[#00E5FF]/20 relative overflow-hidden"
            id="architecture"
          >
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1E2E45] text-[#00E5FF] font-mono text-xs font-semibold mb-3 border border-[#00E5FF]/30">
                  <span className="material-symbols-outlined text-sm">memory</span>
                  <span>HIGH-CONCURRENCY STACK</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Campus-Scale Reliability Engine
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Powered by Spring Boot 3.x, Firebase Firestore reactive sync, and Spring AI.
                  Architected to sustain Marian Engineering College's 2,000+ simultaneous student hits
                  during peak examination intervals without database deadlock or inventory
                  discrepancy.
                </p>
              </div>

              {/* Architecture Pills Cluster */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="p-3 rounded-lg bg-[#1E2E45]/80 border border-[#00E5FF]/20">
                  <div className="font-mono text-[10px] text-gray-400">BACKEND CORE</div>
                  <div className="font-mono text-sm text-[#00E5FF] font-bold">Spring Boot 3.2</div>
                </div>
                <div className="p-3 rounded-lg bg-[#1E2E45]/80 border border-[#00E5FF]/20">
                  <div className="font-mono text-[10px] text-gray-400">REALTIME DATA</div>
                  <div className="font-mono text-sm text-[#00E676] font-bold">Firestore Sync</div>
                </div>
                <div className="p-3 rounded-lg bg-[#1E2E45]/80 border border-[#00E5FF]/20">
                  <div className="font-mono text-[10px] text-gray-400">INTELLIGENCE</div>
                  <div className="font-mono text-sm text-white font-bold">Spring AI</div>
                </div>
                <div className="p-3 rounded-lg bg-[#1E2E45]/80 border border-[#00E5FF]/20">
                  <div className="font-mono text-[10px] text-gray-400">CONCURRENCY LOCK</div>
                  <div className="font-mono text-sm text-[#FFB300] font-bold">Redis Mutex</div>
                </div>
                <div className="p-3 rounded-lg bg-[#1E2E45]/80 border border-[#00E5FF]/20">
                  <div className="font-mono text-[10px] text-gray-400">COUNTER SCAN</div>
                  <div className="font-mono text-sm text-white font-bold">2D Laser QR</div>
                </div>
                <div className="p-3 rounded-lg bg-[#1E2E45]/80 border border-[#00E5FF]/20">
                  <div className="font-mono text-[10px] text-gray-400">PAYMENT INTENT</div>
                  <div className="font-mono text-sm text-[#5F259F] font-bold">GPay Zero-Fee</div>
                </div>
              </div>
            </div>
          </section>

          {/* Admin Desk CTA Banner */}
          <section
            className="my-8 p-6 rounded-xl bg-[#e7eeff] border border-[#c5c6cd]/60 flex flex-col md:flex-row items-center justify-between gap-4"
            id="portal"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0B192C] text-[#00E5FF] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">point_of_sale</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B192C]">
                  Store Admin & Counter Staff Fulfillment Portal
                </h3>
                <p className="text-xs text-[#525f75]">
                  High-contrast fulfillment queue desk, laser token validator, real-time incoming
                  orders manifest, and AI stock velocity forecasting.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('admin')}
              className="px-5 py-2.5 bg-[#0B192C] text-white hover:bg-[#1E2E45] font-mono text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">terminal</span>
              <span>Open Station 01 Desk</span>
            </button>
          </section>

          {/* Project Credentials (From PRD) */}
          <div className="p-5 rounded-xl bg-white border border-[#c5c6cd]/40 text-xs text-gray-600 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#0B192C] font-mono uppercase">
                Project: PreFetch v1.0 MVP
              </span>
              <span className="font-mono text-[11px] text-[#006875] font-medium">
                Marian Engineering College (MEC)
              </span>
            </div>
            <p className="text-gray-500">
              <strong className="text-gray-700">Project Authors:</strong> Jyothish Krishna. B. S, Roshan
              Anto, Vaishnav. S. G, Ravisanker Nair
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 border-t border-[#c5c6cd]/40 bg-[#0B192C] text-gray-400 font-mono text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E676]"></span>
            <span>MEC CLUSTER 04 • 14ms LATENCY • SPRING BOOT 3.x</span>
          </div>
          <p>© Marian Engineering College Campus Store. Powered by PreFetch High-Concurrency Architecture.</p>
        </div>
      </footer>
    </div>
  );
};
