import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePreFetch } from '../../context/PreFetchContext';

export const CheckoutToken: React.FC = () => {
  const {
    checkoutTab,
    setCheckoutTab,
    cart,
    cartSubtotal,
    subsidyDiscount,
    cartFinalTotal,
    activeStudentOrder,
    lockRemainingSeconds,
    simulateGooglePayCheckout,
    confirmUpiPayment,
    generatedUpiUrl,
    setActiveView,
    isMobileFrame,
  } = usePreFetch();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [utrInput, setUtrInput] = useState<string>('');
  const [isConfirmingUtr, setIsConfirmingUtr] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyToken = (tokenId: string) => {
    navigator.clipboard?.writeText(tokenId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleUtrConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      alert('Please enter a valid 12-digit UPI UTR reference number.');
      return;
    }
    setIsConfirmingUtr(true);
    setTimeout(() => {
      setIsConfirmingUtr(false);
      confirmUpiPayment(currentOrderId, utrInput.trim());
      setUtrInput('');
      setCheckoutTab('token');
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }, 600);
  };

  const currentOrderId = activeStudentOrder ? activeStudentOrder.id : '#FETCH-8802';
  const orderStatus = activeStudentOrder ? activeStudentOrder.status : 'PAID';

  return (
    <div
      className={`min-h-screen bg-[#F8FAFC] text-[#111c2d] flex flex-col font-sans select-none pb-28 pt-10 ${
        isMobileFrame ? 'flex items-center justify-center py-6 bg-slate-900' : ''
      }`}
    >
      <div
        className={`w-full ${
          isMobileFrame
            ? 'max-w-[410px] bg-[#F8FAFC] min-h-[844px] rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-800 relative'
            : 'max-w-md mx-auto'
        }`}
      >
        {/* TOP APP BAR */}
        <header className="sticky top-0 left-0 w-full z-30 flex items-center justify-between px-4 h-14 bg-[#0B192C] border-b border-[#00E5FF]/20 shadow-sm text-white">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('landing')}>
            <span className="material-symbols-outlined text-[#00E5FF] font-bold">bolt</span>
            <span className="text-sm font-bold tracking-tight text-white uppercase">MEC PreFetch</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1E2E45] rounded border border-[#00E5FF]/30 text-[#00E5FF] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping"></span>
              <span className="text-[10px] tracking-widest font-bold">LIVE WS</span>
            </div>

            <button
              onClick={() => setCheckoutTab('checkout')}
              aria-label="Cart"
              className="text-gray-300 hover:text-[#00E5FF] transition-colors p-1"
            >
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
            </button>
          </div>
        </header>

        {/* MAIN CANVAS CONTAINER */}
        <main className="w-full px-4 pt-3 flex flex-col gap-4">
          
          {/* TAB / WORKFLOW TOGGLE */}
          <div className="bg-[#dee8ff] p-1 rounded-lg flex border border-[#75777d]/20">
            <button
              onClick={() => setCheckoutTab('checkout')}
              className={`flex-1 py-1.5 text-center font-mono text-xs font-semibold rounded transition-all duration-150 ${
                checkoutTab === 'checkout'
                  ? 'bg-[#0B192C] text-[#00E5FF] shadow-sm'
                  : 'text-[#525f75] hover:text-[#0B192C]'
              }`}
            >
              1. Checkout & Lock
            </button>
            <button
              onClick={() => setCheckoutTab('token')}
              className={`flex-1 py-1.5 text-center font-mono text-xs font-medium transition-all duration-150 flex items-center justify-center gap-1.5 ${
                checkoutTab === 'token'
                  ? 'bg-[#0B192C] text-[#00E5FF] font-semibold shadow-sm'
                  : 'text-[#525f75] hover:text-[#0B192C]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]"></span>
              <span>2. Verified Token</span>
            </button>
          </div>

          {/* ========================================== */}
          {/* VIEW 1: ACTIVE CHECKOUT & ATOMIC LOCK       */}
          {/* ========================================== */}
          {checkoutTab === 'checkout' && (
            <section className="flex flex-col gap-4">
              
              {/* Atomic Stock Lock Banner */}
              <div className="bg-[#0e1c2f] text-white rounded-lg p-4 border border-[#00E5FF]/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-[#00E5FF]/10 to-transparent pointer-events-none"></div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#FFB300] text-lg">lock_clock</span>
                    <span className="font-mono text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                      Atomic Stock Lock
                    </span>
                  </div>
                  <div className="px-2 py-0.5 bg-[#FFB300]/20 border border-[#FFB300] rounded text-[#FFB300] font-mono text-xs font-bold tracking-wider">
                    <span>{formatCountdown(lockRemainingSeconds)}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-normal text-gray-300 leading-relaxed">
                  Inventory reserved in Marian Firestore cluster via Java Spring Boot atomic transaction. Lock guarantees items will not be
                  allocated to counter queue during the rush break.
                </p>
              </div>

              {/* Itemized Order Manifest Card */}
              <div className="bg-white border border-[#0B192C]/10 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#0B192C]/10">
                  <h2 className="font-bold text-sm text-[#0B192C]">Order Breakdown</h2>
                  <span className="font-mono text-xs text-[#525f75]">
                    {cart.length > 0 ? `${cart.length} Line Items` : '3 Line Items'}
                  </span>
                </div>

                <div className="divide-y divide-[#0B192C]/5">
                  {(cart.length > 0
                    ? cart
                    : [
                        {
                          productId: '1',
                          name: 'S4 CSE Lab Coat',
                          spec: 'SPEC: SIZE L • STARCHED',
                          price: 420,
                          quantity: 1,
                          rackLocation: 'RACK A-04',
                        },
                        {
                          productId: '2',
                          name: 'Hardbound Record (200-pg)',
                          spec: 'MEC SEAL EMBOSSED • RULED',
                          price: 95,
                          quantity: 1,
                          rackLocation: 'RACK C-12',
                        },
                        {
                          productId: '3',
                          name: 'CST204 DBMS Guide',
                          spec: 'KTU 2024 ED • PROF NOTES',
                          price: 550,
                          quantity: 1,
                          rackLocation: 'STACK 02',
                        },
                      ]
                  ).map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#0B192C]">{item.name}</span>
                        <span className="font-mono text-[10px] text-[#525f75]">
                          {item.spec || 'MEC SPEC APPROVED'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-[#0B192C]">₹{item.price}</span>
                        <div className="text-[#00E676] font-mono text-[9px] tracking-tight">ALLOCATED</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tally Ledger */}
                <div className="pt-3 mt-2 border-t border-[#0B192C]/10 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-[#525f75]">
                    <span>Subtotal</span>
                    <span>₹{cartSubtotal > 0 ? cartSubtotal.toFixed(2) : '1,065.00'}</span>
                  </div>
                  <div className="flex justify-between text-[#00E676] font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Campus Engineering Subsidy
                    </span>
                    <span>-₹{subsidyDiscount > 0 ? subsidyDiscount.toFixed(2) : '65.00'}</span>
                  </div>
                  <div className="pt-2 border-t border-dashed border-[#0B192C]/20 flex justify-between items-baseline font-bold text-[#0B192C]">
                    <span className="text-sm">Final Total</span>
                    <span className="font-mono text-xl text-[#0B192C]">
                      ₹{cartFinalTotal > 0 ? cartFinalTotal : '1,000'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Frictionless Payment Flow */}
              <div className="bg-white border border-[#0B192C]/10 rounded-lg p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono uppercase text-[11px] tracking-wider text-[#525f75]">
                    Instant UPI Settlement (Zero Gateway Fees)
                  </span>
                  <span className="px-2 py-0.5 bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 text-[9px] font-mono rounded">
                    ZERO CONCURRENCY LATENCY
                  </span>
                </div>

                {/* Primary UPI Intent Trigger (Simulate / Open GPay) */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={simulateGooglePayCheckout}
                    className="w-full h-12 bg-[#5F259F] hover:bg-[#5F259F]/90 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform duration-100 ease-out"
                  >
                    <span className="material-symbols-outlined text-[#00E5FF]">account_balance_wallet</span>
                    <span>Pay ₹{cartFinalTotal > 0 ? cartFinalTotal : '1,000'} via Google Pay UPI</span>
                    <span className="material-symbols-outlined text-xs opacity-80">arrow_forward</span>
                  </button>

                  <a
                    href={generatedUpiUrl}
                    className="w-full py-2 bg-[#0B192C] text-[#00E5FF] hover:bg-[#1E2E45] font-mono text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 border border-[#00E5FF]/30 active:scale-95 transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>Open Native GPay Intent Link</span>
                  </a>
                </div>

                {/* Dynamic QR Code from qrcode.react */}
                <div className="p-3 bg-[#f0f3ff] rounded border border-[#0B192C]/10 flex flex-col items-center text-center">
                  <span className="font-mono text-[10px] text-[#525f75] mb-2 font-semibold">
                    Dynamic Google Pay UPI QR Code (Scan with GPay / PhonePe / Paytm)
                  </span>

                  <div className="p-2.5 bg-white border-2 border-[#00E5FF] rounded-lg shadow-md flex items-center justify-center">
                    <QRCodeSVG
                      value={generatedUpiUrl}
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <span className="mt-2 font-mono text-[10px] text-[#0B192C] font-semibold">
                    VPA: marian.coop@okaxis • Amt: ₹{cartFinalTotal > 0 ? cartFinalTotal : 1000}.00
                  </span>
                </div>

                {/* Student UPI Reference UTR Confirmation Form */}
                <form onSubmit={handleUtrConfirm} className="pt-2 border-t border-[#0B192C]/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[11px] text-[#0B192C] font-bold uppercase">
                      Confirm UPI UTR / Transaction Reference
                    </label>
                    <span className="font-mono text-[10px] text-gray-500">12 digits</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 428901928374"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#F8FAFC] border border-[#0B192C]/20 rounded font-mono text-xs text-[#0B192C] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]"
                    />
                    <button
                      type="submit"
                      disabled={isConfirmingUtr}
                      className="px-4 py-2 bg-[#00E676] text-[#0B192C] hover:bg-[#00E676]/90 font-mono text-xs font-bold rounded shadow-sm transition-all shrink-0 active:scale-95"
                    >
                      {isConfirmingUtr ? 'Verifying...' : 'Confirm'}
                    </button>
                  </div>
                </form>

              </div>
            </section>
          )}

          {/* ========================================== */}
          {/* VIEW 2: VERIFIED DIGITAL PICKUP TOKEN CARD  */}
          {/* ========================================== */}
          {checkoutTab === 'token' && (
            <section className="flex flex-col gap-4">
              
              {/* Anti-Counterfeit Pass Container */}
              <div className="relative bg-[#060D17] text-white rounded-xl p-5 border-2 border-dashed border-[#00E5FF] shadow-2xl overflow-hidden">
                {/* Live Watermark Security Strip */}
                <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
                  <div className="font-mono text-2xl text-white whitespace-nowrap animate-watermark uppercase font-black">
                    MARIAN CAMPUS VALIDATED SECURE PREFETCH MARIAN CAMPUS
                  </div>
                </div>

                {/* Scanning Beam Simulation Line */}
                <div className="absolute left-0 right-0 h-[2px] bg-[#00E5FF]/70 shadow-[0_0_8px_#00E5FF] animate-radar-sweep pointer-events-none"></div>

                {/* Token Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#00E5FF]/20">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00E5FF] text-base">badge</span>
                    <span className="font-mono text-xs text-[#00E5FF] tracking-wider font-semibold">
                      DIGITAL ACCESS TOKEN
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]"></span>
                    <span>SEC-LAYER: ACTIVE</span>
                  </div>
                </div>

                {/* Hero Token Display */}
                <div className="my-3 text-center py-3 bg-[#1E2E45]/50 rounded-lg border border-[#00E5FF]/20 relative">
                  <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest block mb-0.5">
                    Authorization Code
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl text-[#00E5FF] tracking-wider font-bold block select-all">
                    {currentOrderId}
                  </span>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-[#060D17] rounded text-[10px] font-mono text-gray-400">
                    <span className="material-symbols-outlined text-[12px] text-[#00E676]">schedule</span>
                    <span>TS: {currentTime || '11:42:08'} IST • WS-SYNC</span>
                  </div>
                </div>

                {/* High-Def Counter Scanner Code (QRCodeSVG) */}
                <div className="flex flex-col items-center justify-center my-2">
                  <div className="p-2.5 bg-white rounded-lg border border-[#00E5FF] shadow-inner">
                    <QRCodeSVG
                      value={`PREFETCH:${currentOrderId}:${activeStudentOrder?.verificationHash || 'MEC-SEC'}`}
                      size={140}
                      level="H"
                      fgColor="#0B192C"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <span className="mt-1.5 font-mono text-[9px] text-[#00E5FF] tracking-wider uppercase">
                    MARIAN COUNTER LASER OPTICAL COMPATIBLE
                  </span>
                </div>

                {/* Live Status Stepper */}
                <div className="mt-3 pt-3 border-t border-[#00E5FF]/20">
                  <span className="font-mono text-[10px] text-gray-400 uppercase block mb-3 font-semibold">
                    Fulfillment Lifecycle
                  </span>
                  <div className="flex items-center justify-between relative px-2">
                    {/* Connecting progress bar */}
                    <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-[#1E2E45] -translate-y-1/2 z-0"></div>
                    <div
                      className={`absolute top-1/2 left-6 h-0.5 bg-[#00E676] -translate-y-1/2 z-0 transition-all duration-300 ${
                        orderStatus === 'COLLECTED'
                          ? 'w-[calc(100%-3rem)]'
                          : orderStatus === 'PAID' || orderStatus === 'READY FOR PICKUP'
                          ? 'w-1/2'
                          : 'w-1/6'
                      }`}
                    ></div>

                    {/* Step 1: PENDING / PAID */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-[#00E676] text-[#0B192C] flex items-center justify-center font-bold text-xs shadow-md">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                      <span className="mt-1 font-mono text-[9px] font-bold text-[#00E676]">PAID</span>
                    </div>

                    {/* Step 2: READY FOR PICKUP */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          orderStatus === 'READY FOR PICKUP' || orderStatus === 'PAID'
                            ? 'bg-[#060D17] border-2 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_12px_#00E5FF]'
                            : orderStatus === 'COLLECTED'
                            ? 'bg-[#00E676] text-[#0B192C]'
                            : 'bg-[#1E2E45] text-gray-500'
                        }`}
                      >
                        {orderStatus === 'COLLECTED' ? (
                          <span className="material-symbols-outlined text-sm">check</span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping"></span>
                        )}
                      </div>
                      <span className="mt-1 font-mono text-[9px] font-bold text-[#00E5FF] whitespace-nowrap">
                        READY PICKUP
                      </span>
                    </div>

                    {/* Step 3: DISPENSED */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          orderStatus === 'COLLECTED'
                            ? 'bg-[#00E676] text-[#0B192C]'
                            : 'bg-[#1E2E45] text-gray-500 border border-white/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">archive</span>
                      </div>
                      <span
                        className={`mt-1 font-mono text-[9px] ${
                          orderStatus === 'COLLECTED' ? 'text-[#00E676] font-bold' : 'text-gray-400'
                        }`}
                      >
                        COLLECTED
                      </span>
                    </div>
                  </div>

                  {/* Pulsing Beacon Message */}
                  <div className="mt-3 p-2 bg-[#00E5FF]/10 border border-[#00E5FF]/40 rounded flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E5FF]"></span>
                    </span>
                    <span className="font-mono text-xs text-white font-medium">
                      {orderStatus === 'COLLECTED'
                        ? 'Handed Over at Counter Bay 02 • Token Cryptographically Invalidated in Firestore'
                        : 'Waiting for Counter Desk Scan at Station 01 Bay 02'}
                    </span>
                  </div>
                </div>

                {/* Clearance Instructions */}
                <div className="mt-3 pt-2.5 border-t border-[#00E5FF]/20 flex items-start gap-2 text-gray-300 text-xs">
                  <span className="material-symbols-outlined text-[#00E5FF] text-base mt-0.5">info</span>
                  <p className="leading-snug">
                    Flash this token at{' '}
                    <strong className="text-white font-semibold">Marian Co-op Store Counter 02</strong> for
                    instantaneous &lt;30-second handover. Pre-bagged and ready.
                  </p>
                </div>
              </div>

              {/* Actionable Token Utilities */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyToken(currentOrderId)}
                  className="flex-1 py-2 bg-[#dee8ff] hover:bg-[#d8e3fb] border border-[#75777d]/20 rounded-lg text-[#0B192C] font-mono text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copySuccess ? 'done' : 'content_copy'}
                  </span>
                  <span>{copySuccess ? 'Copied!' : 'Copy Token'}</span>
                </button>
                <button
                  onClick={() => alert(`Wallet Pass generated for token ${currentOrderId} on Marian PreFetch Network!`)}
                  className="flex-1 py-2 bg-[#dee8ff] hover:bg-[#d8e3fb] border border-[#75777d]/20 rounded-lg text-[#0B192C] font-mono text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">add_to_home_screen</span>
                  <span>Save Pass</span>
                </button>
              </div>

            </section>
          )}

          {/* Telemetry System Footer Note */}
          <footer className="w-full py-3 flex flex-col justify-between items-center gap-1 text-center border-t border-[#75777d]/10 text-gray-400 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]"></span>
              <span>MEC CORE CLUSTER 04 • 14ms LATENCY • SPRING BOOT 3.x</span>
            </div>
            <p>© Marian Engineering College Campus Store. Powered by PreFetch High-Concurrency Architecture.</p>
          </footer>

        </main>

        {/* SHARED BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 w-full z-30 flex justify-around items-center h-16 bg-[#F8FAFC] border-t border-[#0B192C]/10 shadow-lg">
          <button
            onClick={() => setActiveView('catalog')}
            className="flex flex-col items-center justify-center text-gray-400 hover:text-[#0B192C] transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">storefront</span>
            <span className="font-mono text-[10px] mt-0.5">Catalog</span>
          </button>

          <button
            onClick={() => setActiveView('landing')}
            className="flex flex-col items-center justify-center text-gray-400 hover:text-[#0B192C] transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">package_2</span>
            <span className="font-mono text-[10px] mt-0.5">Bundles</span>
          </button>

          <button
            onClick={() => {
              setActiveView('checkout');
              setCheckoutTab('token');
            }}
            className="flex flex-col items-center justify-center text-[#0B192C] font-semibold active:scale-95 transition-transform"
          >
            <div className="relative">
              <span className="material-symbols-outlined text-2xl text-[#0B192C]">qr_code_scanner</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00E676] rounded-full"></span>
            </div>
            <span className="font-mono text-[10px] mt-0.5">My Fetch</span>
          </button>

          <button
            onClick={() => setActiveView('admin')}
            className="flex flex-col items-center justify-center text-gray-400 hover:text-[#0B192C] transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-2xl">terminal</span>
            <span className="font-mono text-[10px] mt-0.5">Counter Desk</span>
          </button>
        </nav>

      </div>
    </div>
  );
};
