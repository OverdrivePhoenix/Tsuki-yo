import { useState, useEffect } from 'react';
import { Dashboard } from './components/ui/dashboard';
import type { UploadedImage, LyricSection } from './components/ui/dashboard';
import { Performance } from './components/ui/performance';

export interface GiftData {
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

export const serializeGift = (data: GiftData): string => {
  const cleanImages = data.images.map(img => {
    const isBase64 = img.src.startsWith('data:');
    return {
      id: img.id,
      name: img.name,
      src: isBase64 ? '' : img.src,
      contrast: img.contrast,
      brightness: img.brightness,
      cropZoom: img.cropZoom,
      cropOffsetX: img.cropOffsetX,
      cropOffsetY: img.cropOffsetY
    };
  });

  const compactData = {
    r: data.recipientName,
    m: data.outroMessage,
    f: data.outroFont,
    i: cleanImages,
    l: data.lyrics.map(sec => ({
      s: sec.start,
      e: sec.end,
      t: sec.text,
      i: sec.imageId,
      p: sec.style,
      v: sec.scrollSpeed
    })),
    a: data.audioUrl,
    cs: data.masterCropStart,
    ce: data.masterCropEnd,
    sp: data.stylePreset
  };

  const json = JSON.stringify(compactData);
  const utf8Bytes = new TextEncoder().encode(json);
  const binString = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const deserializeGift = (b64: string): GiftData | null => {
  try {
    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binString = atob(base64);
    const utf8Bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(utf8Bytes);
    const compact = JSON.parse(json);

    return {
      recipientName: compact.r,
      outroMessage: compact.m,
      outroFont: compact.f || 'modern',
      images: compact.i.map((img: any) => ({
        id: img.id,
        name: img.name,
        src: img.src || '',
        contrast: img.contrast,
        brightness: img.brightness,
        cropZoom: img.cropZoom,
        cropOffsetX: img.cropOffsetX,
        cropOffsetY: img.cropOffsetY
      })),
      lyrics: compact.l.map((sec: any, idx: number) => ({
        id: `sec-${idx}`,
        start: sec.s,
        end: sec.e,
        text: sec.t,
        imageId: sec.i,
        style: sec.p,
        scrollSpeed: sec.v || 1.0
      })),
      audioUrl: compact.a,
      masterCropStart: compact.cs,
      masterCropEnd: compact.ce,
      stylePreset: compact.sp
    };
  } catch (e) {
    console.error("Failed to deserialize gift link:", e);
    return null;
  }
};

function App() {
  const [viewState, setViewState] = useState<'editor' | 'performance'>('editor');
  const [giftData, setGiftData] = useState<GiftData | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const giftParam = urlParams.get('gift');
      if (giftParam) {
        const data = deserializeGift(giftParam);
        if (data) {
          setGiftData(data);
          setViewState('performance');
        }
      }
    }
  }, []);

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
