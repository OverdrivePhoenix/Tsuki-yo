import React, { useState, useEffect, useRef } from 'react';
import { serializeGift } from '../../App';
import { StitchEngine } from './stitch-engine';
import { MatrixRain } from './matrix-rain';
import { RotateCcw, VolumeX, Volume2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { UploadedImage, LyricSection, StitchStyle } from './dashboard';

interface PerformanceProps {
  data: {
    recipientName: string;
    outroMessage: string;
    outroFont?: string;
    images: UploadedImage[];
    lyrics: LyricSection[];
    audioUrl: string;
    masterCropStart: number;
    masterCropEnd: number;
    stylePreset: StitchStyle;
  };
  onBackToDashboard: () => void;
}

export const Performance: React.FC<PerformanceProps> = ({ data, onBackToDashboard }) => {
  const [phase, setPhase] = useState<'entry' | 'playback' | 'outro'>('entry');
  const [activeText, setActiveText] = useState('YOU');
  const [activeImage, setActiveImage] = useState<UploadedImage | null>(null);
  const [activeStyle, setActiveStyle] = useState<StitchStyle>(data.stylePreset);
  const [isMuted, setIsMuted] = useState(false);
  const [isDissolved, setIsDissolved] = useState(false);
  const [rainOpacity, setRainOpacity] = useState(0.25);
  const [isFadedToBlack, setIsFadedToBlack] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Playback sync states for StitchEngine scrolling lyrics
  const [playbackTime, setPlaybackTime] = useState<number>(data.masterCropStart);
  const [activeSecStart, setActiveSecStart] = useState<number>(data.masterCropStart);
  const [activeSecEnd, setActiveSecEnd] = useState<number>(data.masterCropEnd);
  const [isPlayingState, setIsPlayingState] = useState<boolean>(false);

  const handleCopyLink = async () => {
    try {
      const b64 = await serializeGift(data as any);
      const url = `${window.location.origin}${window.location.pathname}?gift=${b64}`;
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 3000);
        })
        .catch(() => {
          alert("Failed to copy link automatically. Here is the URL: " + url);
        });
    } catch (e) {
      console.error("Failed to copy share link:", e);
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const syntheticTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const lastSyncTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fallbackGainRef = useRef<GainNode | null>(null);
  const fallbackOscillatorsRef = useRef<OscillatorNode[]>([]);
  const fallbackTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const blackFadeTimeoutRef = useRef<number | null>(null);

  const stopFallbackAudio = () => {
    if (fallbackTimerRef.current) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    fallbackOscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    fallbackOscillatorsRef.current = [];
    fallbackGainRef.current = null;
    audioContextRef.current = null;
  };

  const startFallbackAudio = () => {
    if (typeof window === 'undefined') return;
    if (audioContextRef.current) return;

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const master = ctx.createGain();
    master.gain.value = 0.028;
    master.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 220;
    osc1.connect(master);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 330;
    osc2.connect(master);
    osc2.start();

    audioContextRef.current = ctx;
    fallbackGainRef.current = master;
    fallbackOscillatorsRef.current = [osc1, osc2];

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    fallbackTimerRef.current = window.setInterval(() => {
      if (!isMountedRef.current || !fallbackGainRef.current || !audioContextRef.current) return;
      const t = performance.now() / 1000;
      const level = 0.018 + Math.sin(t * 1.8) * 0.008 + Math.sin(t * 4.2) * 0.004;
      fallbackGainRef.current.gain.setTargetAtTime(isMuted ? 0 : level, audioContextRef.current.currentTime, 0.08);
    }, 80);
  };

  const beginPlayback = async () => {
    const audio = audioRef.current;
    if (!audio) {
      startFallbackAudio();
      syncLyricsLoop();
      return;
    }

    try {
      if (audio.src) {
        audio.load();
      }
      await audio.play();
      stopFallbackAudio();
    } catch (err) {
      console.warn('Audio playback fallback engaged:', err);
      startFallbackAudio();
    }

    syncLyricsLoop();
  };

  // Initialize Audio
  useEffect(() => {
    isMountedRef.current = true;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.src = data.audioUrl;
    audioRef.current = audio;
    audio.muted = isMuted;
    audio.volume = 0.95;

    const handleLoadedMetadata = () => {
      if (!isMountedRef.current) return;
      const isSnippet = audio.duration <= 35;
      audio.currentTime = isSnippet ? 0 : data.masterCropStart;
      syntheticTimeRef.current = 0;
    };

    const handleEnded = () => {
      if (!isMountedRef.current) return;
      triggerOutroSequence();
    };

    const handleError = () => {
      if (!isMountedRef.current) return;
      startFallbackAudio();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      isMountedRef.current = false;
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopFallbackAudio();
      if (blackFadeTimeoutRef.current) {
        clearTimeout(blackFadeTimeoutRef.current);
      }
    };
  }, [data.audioUrl, data.masterCropStart, isMuted]);

  // Handle Mute/Unmute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
    if (fallbackGainRef.current && audioContextRef.current) {
      fallbackGainRef.current.gain.setTargetAtTime(nextMuted ? 0 : 0.00015, audioContextRef.current.currentTime, 0.08);
    }
    setIsMuted(nextMuted);
  };

  const handleRestart = () => {
    if (blackFadeTimeoutRef.current) {
      clearTimeout(blackFadeTimeoutRef.current);
      blackFadeTimeoutRef.current = null;
    }
    setIsFadedToBlack(false);
    syntheticTimeRef.current = 0;
    setIsDissolved(false);
    setRainOpacity(0.25);
    setPhase('entry');
    setActiveText(data.recipientName.toUpperCase() || 'YOU');
    if (data.images.length > 0) {
      setActiveImage(data.images[0]);
    }
    setIsPlayingState(false);
    if (audioRef.current) {
      audioRef.current.volume = 0.95;
      const isSnippet = audioRef.current.duration <= 35;
      audioRef.current.currentTime = isSnippet ? 0 : data.masterCropStart;
    }
  };

  // Launch Playback from Entry Phase
  const handleOpenGift = () => {
    setIsFadedToBlack(false);
    syntheticTimeRef.current = 0;
    setPhase('playback');
    setActiveText(data.recipientName.toUpperCase() || 'YOU');
    if (data.images.length > 0) {
      setActiveImage(data.images[0]);
    }
    setIsPlayingState(true);

    if (audioRef.current) {
      const isSnippet = audioRef.current.duration <= 35;
      audioRef.current.currentTime = isSnippet ? 0 : data.masterCropStart;
      void beginPlayback();
    } else {
      startFallbackAudio();
      syncLyricsLoop();
    }
  };

  // Frame loop for lyric syncing
  const syncLyricsLoop = () => {
    if (!audioRef.current && !audioContextRef.current) {
      startFallbackAudio();
    }

    const update = () => {
      const now = performance.now();
      const delta = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) / 1000 : 0.016;
      lastFrameTimeRef.current = now;

      const audio = audioRef.current;
      const hasRealAudio = !!audio && Number.isFinite(audio.currentTime) && audio.duration > 0;
      const rawTime = hasRealAudio ? audio.currentTime : syntheticTimeRef.current;
      const isSnippet = (audio?.duration || 0) <= 35;
      const isUsingFallback = !hasRealAudio || (audio?.error ? true : false);
      const localTime = isUsingFallback ? (syntheticTimeRef.current += delta) : rawTime;
      const time = isSnippet || isUsingFallback ? (data.masterCropStart + localTime) : localTime;
      const relTime = time - data.masterCropStart;

      if (now - lastSyncTimeRef.current >= 60) {
        lastSyncTimeRef.current = now;
        setPlaybackTime((prev) => (Math.abs(prev - relTime) > 0.01 ? relTime : prev));

        const activeSec = data.lyrics.find(sec => relTime >= sec.start && relTime <= sec.end) || null;

        if (activeSec) {
          const nextText = activeSec.text;
          const nextImage = data.images.find(i => i.id === activeSec.imageId) || null;
          if (activeText !== nextText) setActiveText(nextText);
          if (activeImage?.id !== nextImage?.id) setActiveImage(nextImage);
          if (activeStyle !== activeSec.style) setActiveStyle(activeSec.style);
          if (activeSecStart !== activeSec.start) setActiveSecStart(activeSec.start);
          if (activeSecEnd !== activeSec.end) setActiveSecEnd(activeSec.end);
        } else {
          const nextText = data.recipientName.toUpperCase() || 'YOU';
          if (activeText !== nextText) setActiveText(nextText);
          if (data.images.length > 0 && activeImage?.id !== data.images[0].id) {
            setActiveImage(data.images[0]);
          }
          if (activeStyle !== data.stylePreset) setActiveStyle(data.stylePreset);
          if (activeSecStart !== 0) setActiveSecStart(0);
          if (activeSecEnd !== data.masterCropEnd - data.masterCropStart) setActiveSecEnd(data.masterCropEnd - data.masterCropStart);
        }
      }

      const isEnded = isUsingFallback
        ? (time >= data.masterCropEnd)
        : isSnippet
          ? (time >= data.masterCropEnd || localTime >= (audioRef.current?.duration || 30))
          : (time >= data.masterCropEnd || time >= (audioRef.current?.duration || 60));

      if (isEnded) {
        triggerOutroSequence();
        return;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    update();
  };

  // Outro transition triggers
  const triggerOutroSequence = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    setIsDissolved(true);
    setIsPlayingState(false);

    // Fade matrix background rain
    let opacity = 0.25;
    const fade = setInterval(() => {
      opacity -= 0.01;
      if (opacity <= 0) {
        clearInterval(fade);
        setRainOpacity(0);
        setPhase('outro');
        triggerConfetti();
        
        // Start 12-second fade-to-black timer
        if (blackFadeTimeoutRef.current) clearTimeout(blackFadeTimeoutRef.current);
        blackFadeTimeoutRef.current = window.setTimeout(() => {
          // Gracefully fade volume
          const audio = audioRef.current;
          if (audio && !audio.paused) {
            let curVol = audio.volume;
            const volFade = setInterval(() => {
              if (curVol > 0.05) {
                curVol -= 0.05;
                audio.volume = curVol;
              } else {
                audio.volume = 0;
                audio.pause();
                clearInterval(volFade);
              }
            }, 100);
          }
          setIsFadedToBlack(true);
        }, 12000);
      } else {
        setRainOpacity(opacity);
      }
    }, 50);
  };

  const triggerConfetti = () => {
    const count = 180;
    const colors = ['#ff007f', '#ff69b4', '#ffffff'];
      
    const defaults = {
      origin: { y: 0.7 },
      colors: colors
    };

    confetti({
      ...defaults,
      spread: 26,
      startVelocity: 55,
      particleCount: Math.floor(count * 0.25)
    });
    confetti({
      ...defaults,
      spread: 60,
      particleCount: Math.floor(count * 0.2)
    });
    confetti({
      ...defaults,
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      particleCount: Math.floor(count * 0.35)
    });
  };

  // Maps outroFont configuration key to CSS font family class
  const getFontClass = (fontKey?: string) => {
    switch (fontKey) {
      case 'serif': return 'font-serif-elegant';
      case 'script': return 'font-script-hand';
      case 'digital': return 'font-digital-mono';
      default: return 'font-modern-sans';
    }
  };

  return (
    <div className="relative w-full bg-black overflow-hidden select-none notranslate" translate="no" style={{ height: '100vh' }}>
      
      {/* Dynamic Background Matrix rain preset */}
      <MatrixRain opacity={rainOpacity} stylePreset={activeStyle} />

      {/* Control panel header */}
      <div className="absolute top-6 left-10 right-10 flex items-center justify-between z-40">
        <button
          onClick={onBackToDashboard}
          className="bg-black/60 hover:bg-black border border-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-xs font-mono uppercase transition-all tracking-wider"
        >
          Exit Screen
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 1. ENTRY PHASE OVERLAY — Beautiful Frosted Glass Splash Card */}
      {phase === 'entry' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="text-center flex flex-col items-center gap-6 max-w-md p-10 glass-envelope rounded-2xl shadow-[0_0_50px_rgba(255,0,127,0.15)] animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff007f]/20 to-[#ff69b4]/10 flex items-center justify-center border border-[#ff007f]/40 mb-2 animate-pulse shadow-[0_0_20px_rgba(255,0,127,0.3)]">
              <Sparkles className="w-7 h-7 text-[#ff007f] animate-pulse" />
            </div>
          
            <div>
              <span className="font-mono text-[10px] text-[#ff69b4] uppercase tracking-[0.3em] font-bold">A special gift has arrived</span>
              <h2 className="text-2xl font-extrabold tracking-widest text-white uppercase mt-2">
                For {data.recipientName}
              </h2>
            </div>
          
            <p className="text-xs text-gray-300 font-mono leading-relaxed max-w-xs">
              A custom experience has been crafted for you. Tap to open in the dark.
            </p>

            <button
              onClick={handleOpenGift}
              className="w-full bg-gradient-to-r from-[#ff007f] to-[#ff69b4] text-white font-bold uppercase tracking-wider py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(255,0,127,0.35)] hover:shadow-[0_0_40px_rgba(255,0,127,0.55)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Open Gift
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full mt-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs uppercase py-2.5 rounded-lg border border-gray-800 transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: activeStyle === 'matrix_rain' ? '#ff007f' : '#d4c5a1' }} />
              <span>{copiedShare ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. PLAYBACK SEQUENCE — full screen */}
      {phase === 'playback' && (
        <div className="absolute inset-0 z-20">
          <StitchEngine
            text={activeText}
            imageSrc={activeImage ? activeImage.src : null}
            contrast={activeImage ? activeImage.contrast : 1.3}
            brightness={activeImage ? activeImage.brightness : 10}
            cropZoom={activeImage ? activeImage.cropZoom : 1.0}
            cropOffsetX={activeImage ? activeImage.cropOffsetX : 0}
            cropOffsetY={activeImage ? activeImage.cropOffsetY : 0}
            isDissolved={isDissolved}
            stylePreset={activeStyle}
            currentTime={playbackTime}
            sectionStart={activeSecStart}
            sectionEnd={activeSecEnd}
            isPlaying={isPlayingState}
            audioElement={audioRef.current}
          />
        </div>
      )}

      {/* 3. DISSOLVE & SIGNATURE OUTRO — full screen with Fade-to-Black overlay */}
      {phase === 'outro' && (
        <div className="absolute inset-0 z-20">
          <StitchEngine
            text="<HEART>"
            imageSrc={null}
            isDissolved={false}
            stylePreset={data.stylePreset}
            audioElement={audioRef.current}
            isPlaying={false}
          />
          
          {/* Black fade overlay */}
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-[2000ms] pointer-events-none z-30" 
            style={{ opacity: isFadedToBlack ? 1 : 0 }}
          />

          {/* Outro text inside the heart */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 gap-4">
            <div 
              className={`text-center font-bold text-white text-lg tracking-wider bg-black/55 px-8 py-4 rounded-lg border border-[#ff007f]/30 shadow-[0_0_20px_rgba(255,0,127,0.25)] max-w-sm leading-relaxed select-text pointer-events-auto transition-opacity duration-[2000ms] ${getFontClass(data.outroFont)}`}
              style={{ opacity: isFadedToBlack ? 0 : 1 }}
            >
              {data.outroMessage}
            </div>
            
            {/* Action Buttons (placed on top of the black overlay in low contrast) */}
            <div className="flex gap-3 mt-4 pointer-events-auto">
              <button
                onClick={handleRestart}
                className={`bg-black/80 hover:bg-[#ff007f]/10 border border-[#ff007f]/45 text-white font-mono text-[10px] uppercase px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-black/50 ${
                  isFadedToBlack ? 'opacity-30 hover:opacity-100 border-[#ff007f]/20' : 'opacity-100'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#ff007f]" /> Replay Experience
              </button>
              
              <button
                onClick={handleCopyLink}
                className={`bg-black/80 hover:bg-[#ff007f]/10 border border-[#ff007f]/45 text-white font-mono text-[10px] uppercase px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-black/50 ${
                  isFadedToBlack ? 'opacity-30 hover:opacity-100 border-[#ff007f]/20' : 'opacity-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: activeStyle === 'matrix_rain' ? '#ff007f' : '#d4c5a1' }} />
                <span>{copiedShare ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
