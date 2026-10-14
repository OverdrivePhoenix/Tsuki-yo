import React, { useState } from 'react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanToken: (tokenId: string) => void;
  pendingTokens: string[];
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanToken,
  pendingTokens,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSimulateScan = (token: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onScanToken(token);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#060D17] border-2 border-[#00E5FF] rounded-xl max-w-lg w-full p-6 text-white shadow-[0_0_40px_rgba(0,229,255,0.3)] relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#00E5FF]/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00E5FF]">document_scanner</span>
            <span className="font-mono text-sm font-bold text-[#00E5FF] uppercase">
              Station 01 Optical Laser Scanner Bay
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Viewport Simulation */}
        <div className="my-4 relative bg-[#0B192C] h-64 rounded-lg border border-[#00E5FF]/40 flex flex-col items-center justify-center overflow-hidden">
          {/* Target Reticles */}
          <div className="absolute inset-8 border-2 border-dashed border-[#00E5FF]/50 rounded pointer-events-none flex items-center justify-center">
            {/* Corner Crosshairs */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#00E5FF]"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#00E5FF]"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#00E5FF]"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#00E5FF]"></div>
          </div>

          {/* Animated Laser Bar */}
          <div className="absolute left-0 right-0 h-1 bg-[#FF3366] shadow-[0_0_12px_#FF3366] animate-radar-sweep pointer-events-none"></div>

          {/* Center Graphic */}
          <div className="text-center z-10 space-y-2">
            <span className="material-symbols-outlined text-5xl text-[#00E5FF]/80 animate-pulse">
              qr_code_scanner
            </span>
            <p className="font-mono text-xs text-[#00E5FF]">
              {isScanning ? 'DECODING OPTICAL HASH...' : 'ALIGN STUDENT SCREEN WITHIN RETICLE'}
            </p>
            <span className="font-mono text-[10px] text-gray-400 block">
              Honeywell 2D Xenon Engine Active • 1.4ms
            </span>
          </div>
        </div>

        {/* Simulated Quick Targets */}
        <div className="space-y-2">
          <span className="font-mono text-xs text-gray-400 block">
            Simulate Optical Read of Student Screen:
          </span>
          <div className="flex flex-wrap gap-2">
            {pendingTokens.map((token) => (
              <button
                key={token}
                onClick={() => handleSimulateScan(token)}
                className="px-3 py-1.5 bg-[#1E2E45] hover:bg-[#00E5FF] hover:text-[#060D17] border border-[#00E5FF]/40 text-[#00E5FF] font-mono text-xs font-bold rounded transition-colors flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">qr_code</span>
                <span>{token}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#00E5FF]/20 flex justify-end gap-2 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1E2E45] text-gray-300 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
