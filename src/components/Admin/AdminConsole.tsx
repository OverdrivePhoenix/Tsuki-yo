import React, { useState, useEffect, useRef } from 'react';
import { usePreFetch } from '../../context/PreFetchContext';
import { ScannerModal } from './ScannerModal';

export const AdminConsole: React.FC = () => {
  const {
    orders,
    selectedAdminOrder,
    setSelectedAdminOrder,
    toggleAdminCheckItem,
    markOrderCollected,
    setActiveView,
  } = usePreFetch();

  const [searchToken, setSearchToken] = useState<string>('#FETCH-8802');
  const [activeTab, setActiveTab] = useState<'manifest' | 'scan' | 'velocity' | 'config'>('manifest');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isInvalidatedFeedback, setIsInvalidatedFeedback] = useState<boolean>(false);
  const [velocityAlertDismissed, setVelocityAlertDismissed] = useState<boolean>(false);
  const [reorderSuccessToast, setReorderSuccessToast] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listeners (F2 for token search, Space for fast verify)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.code === 'Space' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        handleFastVerify();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAdminOrder]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchToken.trim().toUpperCase();
    const found = orders.find(
      (o) => o.id.toUpperCase() === query || o.id.replace('#', '').toUpperCase() === query.replace('#', '')
    );
    if (found) {
      setSelectedAdminOrder(found);
    } else {
      alert(`Token ${query} not found in live queue!`);
    }
  };

  const handleFastVerify = () => {
    if (!selectedAdminOrder) return;
    setIsInvalidatedFeedback(true);
    markOrderCollected(selectedAdminOrder.id);

    // Audio tone simulation using Web Audio API if supported
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio fallback
    }

    setTimeout(() => {
      setIsInvalidatedFeedback(false);
      setSearchToken('');
      searchInputRef.current?.focus();
    }, 1400);
  };

  const handleScannedToken = (token: string) => {
    setSearchToken(token);
    const found = orders.find((o) => o.id === token);
    if (found) {
      setSelectedAdminOrder(found);
    }
  };

  const handleTriggerReorder = () => {
    setReorderSuccessToast('⚡ Central Purchase Order PO-#8821 dispatched to Marian Central Depot! Delivery scheduled for 1:30 PM.');
    setTimeout(() => setReorderSuccessToast(null), 4000);
  };

  const pendingOrders = orders.filter((o) => o.status === 'PREPARING' || o.status === 'READY FOR PICKUP');
  const completedCount = orders.filter((o) => o.status === 'COLLECTED').length + 382;

  const currentOrder = selectedAdminOrder || orders[0];
  const checkedItemsCount = currentOrder?.items.filter((i) => i.checked).length || 0;
  const totalItemsCount = currentOrder?.items.length || 0;

  return (
    <div className="bg-[#060D17] text-white min-h-screen h-screen flex flex-col font-sans select-none antialiased overflow-hidden pt-9">
      
      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanToken={handleScannedToken}
        pendingTokens={pendingOrders.map((o) => o.id)}
      />

      {/* TOP APP BAR / BRAND HEADER */}
      <header className="fixed top-9 left-0 w-full z-40 flex items-center justify-between px-4 md:px-6 h-14 bg-[#0B192C] shadow-sm border-b border-[#00E5FF]/20">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-1.5 text-[#00E5FF] cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">bolt</span>
            <span className="font-bold text-sm tracking-tight text-white uppercase">MEC PreFetch</span>
          </div>

          <span className="text-[#00E5FF]/30 hidden sm:inline">|</span>
          <span className="font-mono text-xs text-[#00E5FF] font-bold tracking-wider hidden sm:inline">
            COUNTER DESK CONSOLE • STATION 01
          </span>
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] rounded font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-[#00E676] status-pulse"></span>
            500+ CONCURRENT STUDENTS • 0s LATENCY
          </span>
        </div>

        {/* Live Telemetry Quick Stats */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-6">
            <div className="flex flex-col text-right">
              <span className="font-mono text-[10px] text-gray-400 tracking-wider">AVG PICKUP</span>
              <span className="font-mono text-xs text-[#00E5FF] font-bold">22s</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-mono text-[10px] text-gray-400 tracking-wider">PENDING</span>
              <span className="font-mono text-xs text-[#FFB300] font-bold">
                {pendingOrders.length} ORDERS
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-mono text-[10px] text-gray-400 tracking-wider">COMPLETED TODAY</span>
              <span className="font-mono text-xs text-[#00E676] font-bold">{completedCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-[#00E5FF]/20">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded bg-[#1E2E45] text-[#00E5FF] hover:bg-[#00E5FF] hover:text-[#0B192C] transition-colors"
              title="Station Scanner Optical Feed"
            >
              <span className="material-symbols-outlined text-lg">document_scanner</span>
            </button>
            <div className="w-8 h-8 rounded bg-[#0e1c2f] border border-[#00E5FF]/40 flex items-center justify-center font-mono text-xs text-[#00E5FF] font-bold">
              01
            </div>
          </div>
        </div>
      </header>

      {/* BODY CONTENT SHELL: Fixed Layout for Industrial High-Speed Admin */}
      <div className="pt-14 flex h-[calc(100vh-2.25rem)] overflow-hidden">
        
        {/* DESKTOP DOCKED NAVIGATION DRAWER */}
        <aside className="hidden md:flex flex-col h-full w-60 p-4 bg-[#060D17] border-r border-[#00E5FF]/20 shrink-0 z-20 justify-between">
          <div className="flex flex-col gap-4">
            
            {/* Profile / Desk Badge */}
            <div className="p-3 bg-[#1E2E45]/50 border border-[#00E5FF]/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#00E5FF]">tune</span>
                <span className="font-bold text-sm text-white">Station 01 Desk</span>
              </div>
              <div className="text-xs text-gray-400 leading-snug">Marian Engineering College Store</div>
              <div className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-[#00E676] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] status-pulse"></span>
                ONLINE • WS SYNCED
              </div>
            </div>

            {/* Navigation items */}
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab('manifest')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs transition-all text-left ${
                  activeTab === 'manifest'
                    ? 'bg-[#1E2E45] text-[#00E5FF] border-l-2 border-[#00E5FF]'
                    : 'text-gray-400 hover:text-white hover:bg-[#1E2E45]/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">list_alt</span>
                <span>Live Manifest</span>
              </button>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs text-gray-400 hover:text-[#00E5FF] hover:bg-[#1E2E45]/50 transition-all text-left"
              >
                <span className="material-symbols-outlined text-lg">document_scanner</span>
                <span>Fast Scan & Verify</span>
              </button>

              <button
                onClick={() => setActiveTab('velocity')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs transition-all text-left ${
                  activeTab === 'velocity'
                    ? 'bg-[#1E2E45] text-[#00E5FF] border-l-2 border-[#00E5FF]'
                    : 'text-gray-400 hover:text-white hover:bg-[#1E2E45]/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">trending_up</span>
                <span>Stock Velocity</span>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs transition-all text-left ${
                  activeTab === 'config'
                    ? 'bg-[#1E2E45] text-[#00E5FF] border-l-2 border-[#00E5FF]'
                    : 'text-gray-400 hover:text-white hover:bg-[#1E2E45]/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                <span>Station Config</span>
              </button>
            </nav>
          </div>

          {/* Hardware Telemetry */}
          <div className="p-3 bg-[#0e1c2f] border border-[#00E5FF]/15 rounded flex flex-col gap-1 font-mono text-[10px] text-gray-400 mb-8">
            <div className="flex justify-between">
              <span>PORT: USB-BARCODE-01</span>
              <span className="text-[#00E676] font-bold">READY</span>
            </div>
            <div className="flex justify-between">
              <span>LATENCY:</span>
              <span className="text-[#00E5FF] font-bold">1.4ms</span>
            </div>
          </div>
        </aside>

        {/* MAIN CONSOLE OPERATIONAL CANVAS */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#060D17]">
          
          {/* Reorder Notification Toast */}
          {reorderSuccessToast && (
            <div className="p-2.5 bg-[#00E676]/20 border-b border-[#00E676]/50 text-[#00E676] font-mono text-xs flex items-center justify-between px-4 animate-pulse">
              <span>{reorderSuccessToast}</span>
              <button onClick={() => setReorderSuccessToast(null)} className="text-white hover:text-gray-300">
                ✕
              </button>
            </div>
          )}

          {/* QUICK BARCODE / TOKEN FAST LOOKUP COMMAND STRIP */}
          <section className="p-3 border-b border-[#00E5FF]/20 bg-[#0B192C]/40 shrink-0">
            <form onSubmit={handleSearchSubmit} className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#00E5FF]">
                  <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder="Scan or type Token (e.g. #FETCH-8802) [F2]"
                  className="w-full bg-[#0e1c2f] border border-[#00E5FF]/40 text-[#00E5FF] font-mono text-sm pl-10 pr-24 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#00E5FF] tracking-wider placeholder:text-gray-500"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-[#0B192C] border border-[#00E5FF]/30 text-[#00E5FF] font-mono text-[10px] rounded hover:bg-[#1E2E45]"
                  >
                    ENTER ↵
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFastVerify}
                className="w-full sm:w-auto px-5 py-2 bg-[#00E676] text-[#0B192C] font-mono text-xs font-bold rounded flex items-center justify-center gap-1.5 hover:bg-[#00E676]/90 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,230,118,0.25)] shrink-0"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>VERIFY & MARK COLLECTED (SPACE)</span>
              </button>
            </form>
          </section>

          {/* DUAL OPERATIONAL LANES (Split Screen Layout) */}
          <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
            
            {/* LANE 1: LIVE INCOMING FULFILLMENT QUEUE (7 Cols) */}
            <section className="col-span-12 lg:col-span-7 border-r border-[#00E5FF]/20 flex flex-col overflow-hidden bg-[#060D17]">
              
              {/* Queue Header */}
              <div className="px-4 py-2 bg-[#1E2E45]/30 border-b border-[#00E5FF]/15 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white tracking-wide uppercase">
                    LIVE PRIORITY QUEUE
                  </span>
                  <span className="px-2 py-0.5 bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/40 rounded-full font-mono text-[10px]">
                    {pendingOrders.length} PENDING
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs text-gray-400">
                  <span>SORT:</span>
                  <span className="text-[#00E5FF] font-semibold cursor-pointer">
                    INTER-BREAK PRIORITY ▾
                  </span>
                </div>
              </div>

              {/* Queue Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#00E5FF]/10">
                {orders.map((order) => {
                  const isSelected = currentOrder?.id === order.id;
                  const isCollected = order.status === 'COLLECTED';
                  const isReady = order.status === 'READY FOR PICKUP';

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedAdminOrder(order)}
                      className={`p-3 transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#1E2E45]/60 border-l-4 border-[#00E5FF]'
                          : isCollected
                          ? 'opacity-60 hover:opacity-100 border-l-4 border-gray-600'
                          : isReady
                          ? 'border-l-4 border-[#00E676] hover:bg-[#1E2E45]/40'
                          : 'border-l-4 border-[#FFB300] hover:bg-[#1E2E45]/30'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isSelected ? 'text-[#00E5FF]' : isCollected ? 'line-through text-gray-400' : 'text-white'
                            }`}
                          >
                            {order.id}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold flex items-center gap-1 ${
                              isCollected
                                ? 'bg-[#0B192C] text-gray-400 border border-gray-600'
                                : isReady
                                ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40'
                                : 'bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/40'
                            }`}
                          >
                            {!isCollected && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isReady ? 'bg-[#00E676] status-pulse' : 'bg-[#FFB300]'
                                }`}
                              ></span>
                            )}
                            {order.status}
                          </span>

                          <span className="font-mono text-[10px] text-gray-400">{order.createdAt}</span>
                        </div>

                        <div className="flex items-center gap-3 text-white text-xs">
                          <span className="font-bold">{order.studentName}</span>
                          <span className="font-mono text-[10px] text-gray-400">ROLL: {order.rollNumber}</span>
                          <span className="text-gray-400">• {order.branch}</span>
                        </div>

                        <div className="font-mono text-[10px] text-gray-400">
                          {order.items.length} items • {order.paymentRoute}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCollected ? (
                          <div className="flex items-center gap-1 font-mono text-[10px] text-[#00E676]">
                            <span className="material-symbols-outlined text-sm">check</span>
                            <span>DISPATCHED</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAdminOrder(order);
                            }}
                            className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-colors ${
                              isSelected
                                ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/50'
                                : 'bg-[#1E2E45] text-gray-400 hover:text-[#00E5FF] border border-white/10'
                            }`}
                          >
                            {isSelected ? 'ACTIVE' : 'SELECT'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* LANE 2: ORDER TICKET INSPECTOR & PACKING CHECKLIST (5 Cols) */}
            <section className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden bg-[#0B192C]/20">
              
              {/* Inspector Header */}
              <div className="px-4 py-2 bg-[#1E2E45]/40 border-b border-[#00E5FF]/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#00E5FF] text-base">assignment</span>
                  <span className="font-mono text-xs font-bold text-[#00E5FF] uppercase">
                    ACTIVE PACKET INSPECTION
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 font-mono text-[10px] font-bold">
                  VERIFIED {checkedItemsCount}/{totalItemsCount}
                </span>
              </div>

              {/* Dynamic Inspection Content */}
              {currentOrder ? (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  
                  {/* Token Encrypted Banner Box */}
                  <div className="p-3 bg-[#060D17] border-2 border-dashed border-[#00E5FF]/40 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] text-gray-400 uppercase">
                        SECURITY VERIFICATION TOKEN
                      </div>
                      <div className="font-mono text-xl text-[#00E5FF] tracking-wider font-bold">
                        {currentOrder.id}
                      </div>
                      <div className="font-mono text-[10px] text-[#00E676] mt-0.5">
                        ● VERIFIED CRYPTOGRAPHIC MATCH ({currentOrder.verificationHash})
                      </div>
                    </div>

                    <div className="p-2 bg-[#0e1c2f] border border-[#00E5FF]/30 rounded flex flex-col items-center">
                      <span className="material-symbols-outlined text-2xl text-[#00E5FF]">qr_code_2</span>
                      <span className="font-mono text-[9px] text-gray-400">COUNTER CAM</span>
                    </div>
                  </div>

                  {/* Student Metadata Row */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-[#0e1c2f]/80 border border-white/10 rounded text-xs">
                    <div>
                      <span className="font-mono text-[10px] text-gray-400 block">STUDENT BENEFICIARY</span>
                      <span className="font-bold text-white">{currentOrder.studentName}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-gray-400 block">ROLL NUMBER / DEPT</span>
                      <span className="font-mono text-xs text-[#00E5FF]">
                        {currentOrder.rollNumber} ({currentOrder.branch})
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-white/10 flex justify-between">
                      <span className="font-mono text-[10px] text-gray-400">
                        PAYMENT ROUTE: <span className="text-[#5F259F] font-bold">{currentOrder.paymentRoute}</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#00E676] font-bold">
                        ₹{currentOrder.totalAmount}.00 PAID
                      </span>
                    </div>
                  </div>

                  {/* Physical Verification Packing Checklist */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                      <span className="font-mono text-[10px] text-gray-400 tracking-wide uppercase">
                        PHYSICAL DISPATCH CHECKLIST (CLICK TO TICK)
                      </span>
                      <span className="font-mono text-[10px] text-[#00E5FF]">BIN LOCATIONS</span>
                    </div>

                    {currentOrder.items.map((item, idx) => {
                      const isChecked = item.checked;
                      return (
                        <label
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-[#1E2E45]/40 border-[#00E676]/40'
                              : 'bg-[#1E2E45] border-[#FFB300] shadow-[0_0_8px_rgba(255,179,0,0.15)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAdminCheckItem(currentOrder.id, idx)}
                              className="w-4 h-4 rounded text-[#00E676] focus:ring-0 bg-[#0e1c2f] border-gray-500 cursor-pointer"
                            />
                            <div>
                              <span
                                className={`text-xs font-bold text-white ${
                                  isChecked ? 'line-through opacity-80' : ''
                                }`}
                              >
                                {item.name} {item.spec && `— ${item.spec}`}
                              </span>
                              <span className="block font-mono text-[10px] text-gray-400">
                                SKU: {item.sku} • Qty: {item.quantity}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                              isChecked
                                ? 'bg-[#0e1c2f] text-[#00E5FF] border-[#00E5FF]/30'
                                : 'bg-[#0e1c2f] text-[#FFB300] border-[#FFB300]/40'
                            }`}
                          >
                            {item.rackLocation}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Instant Dispatch Action */}
                  <div className="mt-auto pt-3 flex flex-col gap-2">
                    {currentOrder.status !== 'COLLECTED' ? (
                      <button
                        onClick={handleFastVerify}
                        className={`w-full py-2.5 font-bold rounded flex items-center justify-center gap-2 transition-all tracking-tight uppercase font-mono text-xs ${
                          isInvalidatedFeedback
                            ? 'bg-[#00E5FF] text-[#0B192C]'
                            : 'bg-[#00E676] text-[#0B192C] hover:bg-[#00E676]/90 shadow-[0_0_20px_rgba(0,230,118,0.3)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {isInvalidatedFeedback ? 'verified' : 'check_circle'}
                        </span>
                        <span>
                          {isInvalidatedFeedback
                            ? 'TOKEN INVALIDATED • PACKET CLEARED'
                            : 'Mark Order Handed Over & Invalidate Token'}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-2 bg-[#0e1c2f] border border-[#00E676]/50 text-[#00E676] rounded font-mono text-xs font-bold text-center flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>ORDER ALREADY COLLECTED & TOKEN PERMANENTLY INVALIDATED</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-gray-400 font-mono text-[10px] px-1">
                      <span>PRESS [F8] TO INSTANT PRINT RECEIPT</span>
                      <span>ESC TO RELEASE HOLD</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-xs">
                  No order selected
                </div>
              )}

            </section>
          </div>

          {/* SPRING AI PREDICTIVE STOCK VELOCITY ALERT DRAWER (BOTTOM FIXED WIDGET) */}
          {!velocityAlertDismissed && (
            <footer className="border-t border-[#00E5FF]/30 bg-[#0e1c2f] px-4 py-2 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-[#FFB300]/20 border border-[#FFB300] text-[#FFB300] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base">bolt</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#FFB300] uppercase">
                        SPRING AI PREDICTIVE STOCK VELOCITY ALERT
                      </span>
                      <span className="px-1.5 py-0.2 bg-[#FF3366]/20 text-[#FF3366] font-mono text-[10px] border border-[#FF3366]/40 rounded">
                        CRITICAL BURN
                      </span>
                    </div>
                    <p className="text-xs text-white">
                      ⚡ High Burn Velocity:{' '}
                      <span className="font-bold text-[#00E5FF]">Graph Records (48 units/24h)</span> — Estimated
                      depletion in <span className="text-[#FFB300] font-bold">4.2 hours</span>. Trigger reorder
                      from Marian Central Depot?
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setVelocityAlertDismissed(true)}
                    className="px-3 py-1 bg-[#0B192C] border border-[#00E5FF]/30 text-gray-300 hover:text-white font-mono text-xs rounded transition-colors"
                  >
                    DISMISS
                  </button>
                  <button
                    onClick={handleTriggerReorder}
                    className="px-3.5 py-1 bg-[#00E5FF] text-[#0B192C] font-mono text-xs font-bold rounded hover:bg-[#00E5FF]/90 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,229,255,0.3)] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    <span>1-CLICK CENTRAL REORDER</span>
                  </button>
                </div>
              </div>
            </footer>
          )}

        </main>
      </div>
    </div>
  );
};
