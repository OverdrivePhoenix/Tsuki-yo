import React, { useState } from 'react';
import { usePreFetch } from '../../context/PreFetchContext';
import type { BranchSemester, ProductCategory } from '../../types';

export const StudentCatalog: React.FC = () => {
  const {
    currentBranch,
    setCurrentBranch,
    bundles,
    products,
    addToCart,
    addBundleToCart,
    selectProductVariant,
    setActiveView,
    setCheckoutTab,
    cartFinalTotal,
    totalCartItemCount,
    isMobileFrame,
  } = usePreFetch();

  const [activeCategory, setActiveCategory] = useState<ProductCategory>('All');
  const [stepperQuantities, setStepperQuantities] = useState<Record<string, number>>({
    'prod-cst202': 1,
    'prod-graph-record': 1,
  });

  const branches: BranchSemester[] = ['S4 CSE', 'S2 ECE', 'S6 ME', 'S8 CE', 'S4 EEE'];
  const categories: ProductCategory[] = ['All', 'Textbooks', 'Lab Supplies', 'Stationery', 'MEC Merch'];

  // Current active bundle for selected branch
  const activeBundle =
    bundles.find((b) => b.branch === currentBranch) || bundles[0];

  const filteredProducts = products.filter((p) => {
    if (activeCategory === 'All') return true;
    return p.category === activeCategory;
  });

  const handleStepperChange = (prodId: string, delta: number) => {
    setStepperQuantities((prev) => {
      const current = prev[prodId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [prodId]: next };
    });
  };

  const handleAddStepperProduct = (product: any) => {
    const qty = stepperQuantities[product.id] || 1;
    addToCart(product, undefined, qty);
  };

  const handleAddLabCoat = (product: any) => {
    const selectedVariant = product.variants?.find((v: any) => v.id === product.selectedVariantId) || product.variants?.[2];
    if (selectedVariant) {
      addToCart(product, selectedVariant.id, 1);
    }
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-[#111c2d] flex flex-col font-sans select-none pb-28 pt-10 ${isMobileFrame ? 'flex items-center justify-center py-6 bg-slate-900' : ''}`}>
      <div className={`w-full ${isMobileFrame ? 'max-w-[410px] bg-[#F8FAFC] min-h-[844px] rounded-3xl shadow-2xl overflow-hidden border-8 border-slate-800 relative' : 'max-w-md mx-auto'}`}>
        
        {/* TOP APP BAR */}
        <header className="sticky top-0 left-0 w-full z-30 flex items-center justify-between px-4 h-14 bg-[#0B192C] text-white border-b border-[#00E5FF]/20 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('landing')}>
            <span className="material-symbols-outlined text-[#00E5FF] text-xl">bolt</span>
            <span className="font-bold text-sm tracking-tight text-white uppercase">MEC PreFetch</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Student Profile Chip */}
            <div className="flex items-center gap-1.5 bg-[#1E2E45] px-2.5 py-1 rounded-lg border border-[#00E5FF]/20">
              <span className="w-2 h-2 rounded-full bg-[#00E676]"></span>
              <span className="font-mono text-[11px] text-white font-semibold">{currentBranch}</span>
            </div>

            {/* Cart Trigger with active indicator */}
            <button
              onClick={() => {
                setActiveView('checkout');
                setCheckoutTab('checkout');
              }}
              aria-label="Cart"
              className="relative flex items-center justify-center p-1.5 text-white hover:text-[#00E5FF] transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-2xl">shopping_bag</span>
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#00E5FF] text-[#0B192C] font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCartItemCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT CANVAS */}
        <main className="w-full px-4 pt-3 flex flex-col gap-4">
          
          {/* REAL-TIME TELEMETRY STREAM BAR */}
          <section className="flex items-center justify-between bg-[#f0f3ff] px-3.5 py-2 rounded-lg border border-[#0B192C]/10 text-[#111c2d]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E676] live-dot"></span>
              <span className="font-mono text-xs text-[#525f75]">Firestore Live Stream Active</span>
            </div>
            <span className="font-mono text-xs text-[#0B192C] font-semibold tracking-tight">Zero Refresh Needed</span>
          </section>

          {/* DEPARTMENT & SEMESTER SELECTOR PILLS */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-[#525f75]">KTU Branch & Semester Filter</span>
              <span className="font-mono text-xs text-[#006875] font-semibold">Quick Switch</span>
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scroll py-1 -mx-4 px-4">
              {branches.map((b) => {
                const isActive = b === currentBranch;
                return (
                  <button
                    key={b}
                    onClick={() => setCurrentBranch(b)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold active:scale-95 transition-all ${
                      isActive
                        ? 'bg-[#0B192C] text-[#00E5FF] border-[#00E5FF] shadow-sm'
                        : 'bg-[#e7eeff] text-[#44474c] hover:text-[#0B192C] border-[#0B192C]/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">school</span>
                    <span>{b}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]"></span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* SPRING AI CURATED BUNDLER HERO CARD */}
          <section className="bg-white rounded-xl p-4 border border-[#0B192C]/15 shadow-sm relative overflow-hidden">
            {/* Glow Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0B192C] via-[#00E5FF] to-[#5F259F]"></div>
            
            <div className="flex items-start justify-between mb-3 pt-1">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[#5F259F] text-base">auto_awesome</span>
                  <span className="font-mono text-xs font-semibold uppercase text-[#5F259F] tracking-wider">
                    Spring AI Core Bundle
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#0B192C] tracking-tight">{activeBundle.title}</h2>
                <p className="text-xs text-[#525f75] mt-0.5">{activeBundle.subtitle}</p>
              </div>
              <div className="bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-1 rounded-lg text-right">
                <span className="font-mono text-xs text-[#00984c] font-bold block leading-none">
                  SAVE ₹{activeBundle.savings}
                </span>
                <span className="font-mono text-[9px] text-[#525f75]">Instant Bundle</span>
              </div>
            </div>

            {/* Bundle Items Breakdown Checklist */}
            <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#0B192C]/10 space-y-2 my-3">
              {activeBundle.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00E676] text-sm">check_circle</span>
                    <span className="text-[#111c2d] font-medium">{item.name}</span>
                  </div>
                  <span className="font-mono text-gray-500">₹{item.price}</span>
                </div>
              ))}
            </div>

            {/* Action Footer for Bundle */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <span className="font-mono text-xs text-gray-400 block line-through">₹{activeBundle.originalPrice}</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-lg font-bold text-[#0B192C]">₹{activeBundle.bundlePrice}</span>
                  <span className="font-mono text-xs text-[#00E676] font-bold">(-{activeBundle.discountPercentage}%)</span>
                </div>
              </div>

              <button
                onClick={() => addBundleToCart(activeBundle)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#0B192C] text-white hover:text-[#00E5FF] px-4 py-2.5 rounded-lg active:scale-95 transition-transform shadow-md font-mono text-xs font-bold uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[#00E5FF] text-base">bolt</span>
                <span>PreFetch All</span>
              </button>
            </div>
          </section>

          {/* LIVE CATALOG FEED HEADER & CATEGORY TABS */}
          <section className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0B192C]">Live Catalog Feed</h3>
              <div className="flex items-center gap-1 font-mono text-xs text-[#525f75]">
                <span className="material-symbols-outlined text-sm">sync</span>
                <span>Station 01 Synced</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto custom-scroll py-1 -mx-4 px-4">
              {categories.map((cat) => {
                const isCatActive = cat === activeCategory;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 font-mono text-xs font-medium rounded-lg shrink-0 transition-colors ${
                      isCatActive
                        ? 'bg-[#0B192C] text-white font-semibold'
                        : 'bg-[#e7eeff] text-[#44474c] hover:text-[#0B192C]'
                    }`}
                  >
                    {cat === 'All' ? `All (${products.length})` : cat}
                  </button>
                );
              })}
            </div>
          </section>

          {/* PRODUCT LISTING CARDS */}
          <section className="flex flex-col gap-3">
            
            {/* CARD 1: CST202 Computer Organization & Architecture */}
            {filteredProducts.some((p) => p.id === 'prod-cst202') && (
              <article className="bg-white p-4 rounded-xl border border-[#0B192C]/10 shadow-sm flex flex-col gap-2.5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] bg-[#e7eeff] px-1.5 py-0.5 rounded text-[#525f75] uppercase font-semibold">
                        CSE • S4 Textbook
                      </span>
                      <span className="font-mono text-[10px] bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/30 px-1.5 py-0.5 rounded font-bold">
                        URGENT: 3 LEFT
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#0B192C] leading-tight">
                      CST202 Computer Organization & Architecture
                    </h4>
                    <p className="text-xs text-[#525f75] mt-0.5">Author: Carl Hamacher • 5th Edition</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-[#0B192C] block">₹540</span>
                    <span className="font-mono text-[10px] text-[#00E676] font-medium">In Counter Rack A-3</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#0B192C]/5">
                  <div className="flex items-center gap-1 text-[#FF3366] font-mono text-[11px]">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>Fast Velocity • 14 fetched in last hr</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStepperChange('prod-cst202', -1)}
                      className="w-8 h-8 rounded-lg border border-[#0B192C]/20 flex items-center justify-center font-mono font-bold text-[#0B192C] active:scale-95 bg-[#F8FAFC] hover:bg-[#e7eeff]"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm px-1.5">
                      {stepperQuantities['prod-cst202'] || 1}
                    </span>
                    <button
                      onClick={() => handleStepperChange('prod-cst202', 1)}
                      className="w-8 h-8 rounded-lg bg-[#0B192C] text-[#00E5FF] flex items-center justify-center font-mono font-bold active:scale-95"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleAddStepperProduct(products.find((p) => p.id === 'prod-cst202'))}
                      className="px-3 py-1.5 bg-[#0B192C] text-white hover:text-[#00E5FF] rounded-lg font-mono text-xs font-semibold active:scale-95 transition-all ml-1"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </article>
            )}

            {/* CARD 2: MEC Standard Lab Coat with Size Variants */}
            {filteredProducts.some((p) => p.id === 'prod-labcoat') && (
              <article className="bg-white p-4 rounded-xl border border-[#0B192C]/10 shadow-sm flex flex-col gap-2.5">
                {(() => {
                  const labCoat = products.find((p) => p.id === 'prod-labcoat')!;
                  const activeVar = labCoat.variants?.find((v) => v.id === labCoat.selectedVariantId) || labCoat.variants?.[2]!;

                  return (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] bg-[#e7eeff] px-1.5 py-0.5 rounded text-[#525f75] uppercase font-semibold">
                              Lab Supplies
                            </span>
                            <span className="font-mono text-[10px] bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 px-1.5 py-0.5 rounded font-bold">
                              STOCKED
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#0B192C] leading-tight">
                            MEC Standard Unisex White Lab Coat
                          </h4>
                          <p className="text-xs text-[#525f75] mt-0.5">Heavy Drill Cotton • Embroidered College Crest</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-base font-bold text-[#0B192C] block">₹300</span>
                          <span className="font-mono text-[10px] text-gray-500">Uniform Policy Valid</span>
                        </div>
                      </div>

                      {/* Size Variant Selector Matrix */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="font-mono text-[11px] text-[#525f75] uppercase font-semibold">
                          Select Size & Live Rack Stock
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {labCoat.variants?.map((v) => {
                            const isDepleted = v.stock === 0;
                            const isSelected = labCoat.selectedVariantId === v.id;

                            if (isDepleted) {
                              return (
                                <button
                                  key={v.id}
                                  disabled
                                  className="p-1.5 border border-[#FF3366]/20 rounded-lg text-center bg-[#e7eeff]/50 opacity-60 cursor-not-allowed"
                                >
                                  <span className="block font-mono font-bold text-xs text-[#FF3366] line-through">
                                    {v.name}
                                  </span>
                                  <span className="block font-mono text-[9px] text-[#FF3366] font-bold">
                                    DEPLETED
                                  </span>
                                </button>
                              );
                            }

                            if (isSelected) {
                              return (
                                <button
                                  key={v.id}
                                  onClick={() => selectProductVariant(labCoat.id, v.id)}
                                  className="p-1.5 border-2 border-[#0B192C] rounded-lg text-center bg-[#0B192C] text-white active:scale-95 transition-all shadow-sm"
                                >
                                  <span className="block font-mono font-bold text-xs text-[#00E5FF]">{v.name}</span>
                                  <span className="block font-mono text-[10px] text-[#00E676] font-medium">
                                    {v.stock} left
                                  </span>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={v.id}
                                onClick={() => selectProductVariant(labCoat.id, v.id)}
                                className="p-1.5 border border-[#0B192C]/15 rounded-lg text-center bg-[#F8FAFC] hover:border-[#0B192C] active:scale-95 transition-all"
                              >
                                <span className="block font-mono font-bold text-xs text-[#0B192C]">{v.name}</span>
                                <span
                                  className={`block font-mono text-[10px] ${
                                    v.stock <= 5 ? 'text-[#FFB300] font-semibold' : 'text-[#00E676]'
                                  }`}
                                >
                                  {v.stock} left
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddLabCoat(labCoat)}
                        className="w-full flex items-center justify-center gap-2 bg-[#0B192C] text-white hover:text-[#00E5FF] py-2 rounded-lg active:scale-98 transition-all font-mono text-xs font-semibold"
                      >
                        <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                        <span>Add Size {activeVar.name} to Cart (₹300)</span>
                      </button>
                    </>
                  );
                })()}
              </article>
            )}

            {/* CARD 3: Engineering Graph Record */}
            {filteredProducts.some((p) => p.id === 'prod-graph-record') && (
              <article className="bg-white p-4 rounded-xl border border-[#0B192C]/10 shadow-sm flex flex-col gap-2.5">
                {(() => {
                  const record = products.find((p) => p.id === 'prod-graph-record')!;
                  return (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] bg-[#e7eeff] px-1.5 py-0.5 rounded text-[#525f75] uppercase font-semibold">
                              Stationery
                            </span>
                            <span className="font-mono text-[10px] bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 px-1.5 py-0.5 rounded font-bold">
                              {record.stock} IN STOCK
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#0B192C] leading-tight">
                            200-page Hardbound Graph Record Notebook
                          </h4>
                          <p className="text-xs text-[#525f75] mt-0.5">KTU Regulation Standard Layout</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-base font-bold text-[#0B192C] block">₹120</span>
                          <span className="font-mono text-[10px] text-gray-500">Stationery Bay 2</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#0B192C]/5">
                        <span className="font-mono text-xs text-[#525f75]">Pre-inspected binding quality</span>
                        <button
                          onClick={() => addToCart(record, undefined, 1)}
                          className="flex items-center gap-1.5 bg-[#e7eeff] hover:bg-[#0B192C] hover:text-white text-[#0B192C] px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>Add Single</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </article>
            )}

            {/* CARD 4: MEC Official Hoodie */}
            {filteredProducts.some((p) => p.id === 'prod-hoodie') && (
              <article className="bg-white p-4 rounded-xl border border-[#0B192C]/10 shadow-sm flex flex-col gap-2.5">
                {(() => {
                  const hoodie = products.find((p) => p.id === 'prod-hoodie')!;
                  return (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] bg-[#e7eeff] px-1.5 py-0.5 rounded text-[#525f75] uppercase font-semibold">
                              MEC Official Merch
                            </span>
                            <span className="font-mono text-[10px] bg-[#FFB300]/15 text-[#FFB300] border border-[#FFB300]/30 px-1.5 py-0.5 rounded font-bold">
                              LIMITED DROP
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#0B192C] leading-tight">
                            Marian Engineering Navy Pullover Hoodie
                          </h4>
                          <p className="text-xs text-[#525f75] mt-0.5">380 GSM Brushed Fleece • Silver MEC Monogram</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-base font-bold text-[#0B192C] block">₹890</span>
                          <span className="font-mono text-[10px] text-gray-500">Admin Desk Safe</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addToCart(hoodie, undefined, 1)}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#e7eeff] hover:bg-[#0B192C] hover:text-white text-[#0B192C] py-2 rounded-lg active:scale-98 transition-all font-mono text-xs font-semibold"
                      >
                        <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                        <span>Add Hoodie to Cart (₹890)</span>
                      </button>
                    </>
                  );
                })()}
              </article>
            )}

          </section>

          {/* LIVE COUNTER LATENCY ADVISORY */}
          <section className="bg-[#0B192C] p-3.5 rounded-xl text-white border border-[#00E5FF]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1E2E45] flex items-center justify-center text-[#00E5FF]">
                <span className="material-symbols-outlined text-lg">timer</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-gray-400 block uppercase tracking-wider">
                  Current Counter Pickup Wait
                </span>
                <span className="font-mono text-sm font-bold text-[#00E5FF]">~1 min 45 sec</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs text-[#00E676] font-semibold block">2 Windows Free</span>
              <span className="font-mono text-[10px] text-gray-400">Station 01 & 02</span>
            </div>
          </section>

        </main>

        {/* BOTTOM NAVBAR */}
        <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 bg-[#F8FAFC] border-t border-[#0B192C]/10 shadow-lg">
          <button
            onClick={() => setActiveView('catalog')}
            className="flex flex-col items-center justify-center text-[#0B192C] font-semibold active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-2xl text-[#0B192C]">storefront</span>
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
            className="flex flex-col items-center justify-center text-gray-400 hover:text-[#0B192C] transition-colors active:scale-95"
          >
            <div className="relative">
              <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
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

        {/* QUICK CHECKOUT ACTION DRAWER (STICKY FLOATING THUMB TRIGGER OVER NAV) */}
        {totalCartItemCount > 0 && (
          <aside className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-2 z-40">
            <div className="bg-[#0B192C] text-white p-2.5 rounded-xl shadow-2xl border border-[#00E5FF]/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 pl-1">
                <div className="w-7 h-7 rounded-full bg-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF]">
                  <span className="font-mono text-xs font-bold">{totalCartItemCount}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-gray-400 block uppercase">Draft Fetch</span>
                  <span className="font-mono text-sm font-bold text-white">₹{cartFinalTotal}</span>
                </div>
              </div>

              {/* Quick 1-Tap UPI Intent Button */}
              <button
                onClick={() => {
                  setActiveView('checkout');
                  setCheckoutTab('checkout');
                }}
                className="flex items-center gap-1.5 bg-[#5F259F] hover:bg-[#5F259F]/90 text-white px-4 py-2 rounded-lg active:scale-95 transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[#00E5FF] text-base">bolt</span>
                <span className="font-mono text-xs font-bold tracking-wider uppercase">Express Checkout</span>
              </button>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
};
