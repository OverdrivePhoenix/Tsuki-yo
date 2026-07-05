import { useState } from 'react';
import { Dashboard } from './components/ui/dashboard';
import type { UploadedImage, LyricSection } from './components/ui/dashboard';
import { Performance } from './components/ui/performance';

interface GiftData {
  recipientName: string;
  outroMessage: string;
  outroFont: string;
  images: UploadedImage[];
  lyrics: LyricSection[];
  audioUrl: string;
  masterCropStart: number;
  masterCropEnd: number;
  stylePreset: 'matrix_rain' | 'anime_vignette';
}

function App() {
  const [viewState, setViewState] = useState<'editor' | 'performance'>('editor');
  const [giftData, setGiftData] = useState<GiftData | null>(null);

  const handleLaunchPerformance = (data: GiftData) => {
    setGiftData(data);
    setViewState('performance');
  };

  if (viewState === 'performance' && giftData) {
    return (
      <Performance
        data={giftData}
        onBackToDashboard={() => setViewState('editor')}
      />
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col font-sans bg-[#131313] text-[#e5e2e1] antialiased">
      {/* Top App Bar */}
      <header className="bg-[#131313]/90 backdrop-blur-xl border-b border-[#4b463c]/20 flex justify-between items-center px-10 py-4 w-full shrink-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[#d4c5a1] uppercase tracking-[0.25em]">
            TSUKI-YO
          </h1>
          <span className="text-[10px] font-mono text-gray-500 border border-[#4b463c]/30 px-2 py-0.5 rounded uppercase">
            STITCH WIZARD v1.2
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex w-full h-full overflow-hidden relative">
        <Dashboard onPreview={handleLaunchPerformance} />
      </main>
    </div>
  );
}

export default App;
