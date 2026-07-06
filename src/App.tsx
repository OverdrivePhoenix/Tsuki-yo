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

export const serializeGift = async (data: GiftData): Promise<string> => {
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
  const bytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();

      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      let totalLength = 0;
      for (const chunk of chunks) totalLength += chunk.length;
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      const binString = Array.from(result, (byte) => String.fromCharCode(byte)).join("");
      return btoa(binString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (e) {
      console.warn("CompressionStream failed, falling back to uncompressed serialization", e);
    }
  }

  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const deserializeGift = async (b64: string): Promise<GiftData | null> => {
  try {
    let base64 = b64.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));

    let json: string | null = null;

    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b && typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();

        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }

        let totalLength = 0;
        for (const chunk of chunks) totalLength += chunk.length;
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        json = new TextDecoder().decode(result);
      } catch (e) {
        console.error("Failed to decompress gzip stream", e);
        return null;
      }
    } else {
      json = new TextDecoder().decode(bytes);
    }

    if (!json) return null;
    const compact = JSON.parse(json);

    return {
      recipientName: compact.r,
      outroMessage: compact.m,
      outroFont: compact.f || 'modern',
      images: (compact.i || []).map((img: any) => ({
        id: img.id,
        name: img.name,
        src: img.src || '',
        contrast: img.contrast,
        brightness: img.brightness,
        cropZoom: img.cropZoom,
        cropOffsetX: img.cropOffsetX,
        cropOffsetY: img.cropOffsetY
      })),
      lyrics: (compact.l || []).map((sec: any, idx: number) => ({
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
  const [giftLoadError, setGiftLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const giftParam = urlParams.get('gift');
      if (giftParam) {
        deserializeGift(giftParam).then((data) => {
          if (data) {
            setGiftData(data);
            setViewState('performance');
          } else {
            setGiftLoadError('The gift link appears to be corrupted or incomplete. Please ensure you copied the entire URL.');
          }
        });
      }
    }
  }, []);

  const handleLaunchPerformance = (data: GiftData) => {
    setGiftData(data);
    setViewState('performance');
  };

  if (giftLoadError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#131313] font-sans px-6 select-none">
        <div className="max-w-md w-full p-8 rounded-2xl border border-red-500/20 bg-black/40 backdrop-blur-md shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center flex flex-col items-center gap-6 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <span className="font-mono text-[10px] text-red-400 uppercase tracking-[0.3em] font-bold">Decoding Failure</span>
            <h2 className="text-xl font-extrabold tracking-widest text-white uppercase mt-2">
              Invalid Gift Link
            </h2>
          </div>
          <p className="text-xs text-gray-300 font-mono leading-relaxed">
            {giftLoadError}
          </p>
          <button
            onClick={() => {
              setGiftLoadError(null);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.45)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Create Your Own Gift
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'performance' && giftData) {
    return (
      <Performance
        data={giftData}
        onBackToDashboard={() => {
          setViewState('editor');
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col font-sans bg-[#131313] text-[#e5e2e1] antialiased">
      {/* Top App Bar */}
      <header className="bg-[#131313]/90 backdrop-blur-xl border-b border-[#4b463c]/20 flex justify-between items-center px-10 py-4 w-full shrink-0 z-50">
        <div className="flex items-center gap-3 select-none">
          <svg className="w-8 h-8 filter drop-shadow-[0_0_8px_rgba(255,20,147,0.4)]" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <filter id="header-neon" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <g filter="url(#header-neon)">
              <path d="M 285 95 A 120 120 0 1 0 310 220" fill="none" stroke="#ff1493" strokeWidth="14" strokeLinecap="round"/>
              <line x1="120" y1="280" x2="120" y2="340" stroke="#ff1493" strokeWidth="12" strokeDasharray="10, 15, 5" strokeLinecap="round"/>
              <line x1="150" y1="300" x2="150" y2="370" stroke="#ff1493" strokeWidth="14" strokeDasharray="5, 10, 20" strokeLinecap="round"/>
              <line x1="180" y1="315" x2="180" y2="390" stroke="#ff1493" strokeWidth="16" strokeDasharray="20, 10, 5" strokeLinecap="round"/>
              <line x1="210" y1="315" x2="210" y2="360" stroke="#ff1493" strokeWidth="14" strokeDasharray="8, 12" strokeLinecap="round"/>
              <line x1="240" y1="295" x2="240" y2="350" stroke="#ff1493" strokeWidth="12" strokeDasharray="15, 8" strokeLinecap="round"/>
              <line x1="270" y1="265" x2="270" y2="310" stroke="#ff1493" strokeWidth="12" strokeDasharray="5, 10, 5" strokeLinecap="round"/>
              <circle cx="300" cy="80" r="7" fill="#ff1493"/>
              <circle cx="325" cy="110" r="9" fill="#ff1493"/>
              <circle cx="340" cy="145" r="6" fill="#ff1493"/>
              <circle cx="335" cy="180" r="5" fill="#ff1493"/>
            </g>
            <text x="180" y="210" fontFamily="sans-serif" fontSize="84" fontWeight="900" fill="#ffffff" textAnchor="middle" filter="url(#header-neon)">月夜</text>
          </svg>
          <h1 className="text-base font-extrabold text-[#ffffff] uppercase tracking-[0.35em] font-sans bg-gradient-to-r from-white via-[#ffb6c1] to-[#ff1493] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,20,147,0.2)]">
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
