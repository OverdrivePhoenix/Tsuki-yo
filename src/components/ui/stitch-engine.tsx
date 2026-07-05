import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  originX: number;
  originY: number;
  originZ: number;
  targetX: number | null;
  targetY: number | null;
  targetZ: number | null;
  size: number;
  color: string;
  alpha: number;
  speed: number;
  isAssembled: boolean;
  char: string;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  baseR: number;
  baseG: number;
  baseB: number;
  targetR: number;
  targetG: number;
  targetB: number;
  baseZ: number;
}

interface StitchEngineProps {
  text: string;
  imageSrc: string | null;
  contrast?: number;
  brightness?: number;
  cropZoom?: number;
  cropOffsetX?: number;
  cropOffsetY?: number;
  isDissolved?: boolean;
  stylePreset?: 'matrix_rain' | 'anime_vignette';
  currentTime?: number;
  sectionStart?: number;
  sectionEnd?: number;
  isPlaying?: boolean;
  audioElement?: HTMLAudioElement | null;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const StitchEngine: React.FC<StitchEngineProps> = ({
  text,
  imageSrc,
  contrast = 1.3,
  brightness = 10,
  cropZoom = 1.0,
  cropOffsetX = 0,
  cropOffsetY = 0,
  isDissolved = false,
  stylePreset = 'matrix_rain',
  currentTime,
  sectionStart,
  sectionEnd,
  isPlaying = false,
  audioElement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const poolReadyRef = useRef(false);
  const targetTextRef = useRef(text);
  const frameRef = useRef(0);
  const lastActiveRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  // Additional refs for advanced cinematic features
  const portraitBufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const portraitImageDataRef = useRef<ImageData | null>(null);
  const lastBufferKeyRef = useRef<string>('');
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const tiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const transitionStateRef = useRef<{
    type: 'glitch' | 'none';
    startTime: number;
    nextText: string;
    nextActive: boolean;
  }>({
    type: 'none',
    startTime: 0,
    nextText: '',
    nextActive: false,
  });
  const currentVolRef = useRef<number>(0);

  // Load image
  useEffect(() => {
    if (!imageSrc) {
      imgRef.current = null;
      imgLoadedRef.current = false;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => { imgRef.current = img; imgLoadedRef.current = true; };
    img.onerror = () => { imgRef.current = null; imgLoadedRef.current = false; };
  }, [imageSrc]);

  // Audio analyser
  useEffect(() => {
    if (!audioElement) return;
    try {
      const el = audioElement as any;
      if (!el.__tsukiyoAnalyser) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const actx = new AC();
        const a = actx.createAnalyser();
        a.fftSize = 64;
        const src = actx.createMediaElementSource(audioElement);
        src.connect(a);
        a.connect(actx.destination);
        el.__tsukiyoAnalyser = a;
        el.__tsukiyoAudioContext = actx;
      }
      analyserRef.current = el.__tsukiyoAnalyser;
    } catch { analyserRef.current = null; }
  }, [audioElement]);

  // =============================================
  // Init particle pool — 2500 particles max
  // =============================================
  const initPool = (w: number, h: number) => {
    const n = 2500;
    const colors = stylePreset === 'anime_vignette'
      ? ['#d4c5a1', '#bda87f', '#f5edd6', '#ffffff']
      : ['#ff1493', '#ff69b4', '#ffb6c1', '#ffffff'];
    const chars = '01';
    const pool: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const baseSpeed = (Math.random() * 0.8 + 0.2) * 4; // RAIN_SPEED = 4
      const hex = Math.random() > 0.9 ? colors[3] : colors[Math.floor(Math.random() * 3)];
      const rgb = hexToRgb(hex) || { r: 255, g: 20, b: 147 };
      const baseZ = Math.random() * 300 - 50; // Some particles float forward, some backward
      pool.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: baseZ,
        originX: 0,
        originY: 0,
        originZ: baseZ,
        targetX: null,
        targetY: null,
        targetZ: null,
        size: Math.random() * 3 + 8, // 8–11px
        color: hex,
        alpha: 0.15 + Math.random() * 0.2,
        speed: baseSpeed,
        isAssembled: false,
        char: chars[Math.floor(Math.random() * chars.length)],
        vx: 0,
        vy: baseSpeed,
        vz: 0,
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        baseR: rgb.r,
        baseG: rgb.g,
        baseB: rgb.b,
        targetR: rgb.r,
        targetG: rgb.g,
        targetB: rgb.b,
        baseZ: baseZ,
      });
    }
    particlesRef.current = pool;
    poolReadyRef.current = true;
  };

  // =============================================
  // Main animation loop
  // =============================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Persistent offscreen canvas for particle trails
    const trailCanvas = document.createElement('canvas');
    const trailCtx = trailCanvas.getContext('2d');

    const chars = '01';

    const getCoordinates = (word: string, w: number, h: number) => {
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const octx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!octx) return [];

      octx.fillStyle = 'white';
      
      const display = word === '<HEART>' ? '♥' : word;
      const lines: string[] = [];
      if (display.includes(' ')) {
        const words = display.split(' ');
        if (words.length >= 3 && display.length > 20) {
          const third = Math.max(1, Math.round(words.length / 3));
          const twoThird = Math.max(third + 1, Math.round(2 * words.length / 3));
          lines.push(words.slice(0, third).join(' '));
          lines.push(words.slice(third, twoThird).join(' '));
          lines.push(words.slice(twoThird).join(' '));
        } else if (display.length > 14) {
          const mid = Math.max(1, Math.floor(words.length / 2));
          lines.push(words.slice(0, mid).join(' '));
          lines.push(words.slice(mid).join(' '));
        } else {
          lines.push(display);
        }
      } else {
        lines.push(display);
      }

      // Large bold fonts so particles fully fill each letter shape
      const fontSize = display === '♥' 
        ? Math.min(h * 0.55, 320) 
        : lines.length === 3
          ? Math.min(h * 0.13, 72)
          : lines.length === 2
            ? Math.min(h * 0.18, 100)
            : Math.min(h * 0.28, 150);

      octx.font = `900 ${fontSize}px monospace`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';

      if (lines.length === 3) {
        const spacing = fontSize * 0.65;
        octx.fillText(lines[0], w / 2, h / 2 - spacing * 1.2);
        octx.fillText(lines[1], w / 2, h / 2);
        octx.fillText(lines[2], w / 2, h / 2 + spacing * 1.2);
      } else if (lines.length === 2) {
        const spacing = fontSize * 0.65;
        octx.fillText(lines[0], w / 2, h / 2 - spacing);
        octx.fillText(lines[1], w / 2, h / 2 + spacing);
      } else {
        octx.fillText(display, w / 2, h / 2);
      }

      const imgData = octx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const coords: { x: number; y: number }[] = [];
      
      const step = w > 1200 ? 7 : 5; // Denser sampling = crisper letter fills
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const index = (y * w + x) * 4;
          if (data[index + 3] > 128) { 
            coords.push({ x, y });
          }
        }
      }
      return coords;
    };

    const formWord = (word: string, w: number, h: number) => {
      const coords = getCoordinates(word, w, h);
      coords.sort(() => Math.random() - 0.5);
      
      const pool = particlesRef.current;
      const shouldRenderPortrait = !!imgRef.current && imgLoadedRef.current && !!imageSrc && word !== '<HEART>';
      
      const colors = stylePreset === 'anime_vignette'
        ? ['#d4c5a1', '#bda87f', '#f5edd6', '#ffffff']
        : ['#ff1493', '#ff69b4', '#ffb6c1', '#ffffff'];

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (i < coords.length) {
          p.targetX = coords[i].x;
          p.targetY = coords[i].y;
          p.targetZ = 0; // Assemble in the foreground flat plane

          // Sample color from cached portrait offscreen buffer
          const px = coords[i].x;
          const py = coords[i].y;
          let r = 255, g = 20, b = 147;
          let hasSampled = false;

          if (shouldRenderPortrait && portraitImageDataRef.current) {
            const imgData = portraitImageDataRef.current;
            const idx = (Math.floor(py) * imgData.width + Math.floor(px)) * 4;
            if (idx >= 0 && idx < imgData.data.length - 3) {
              const alpha = imgData.data[idx + 3];
              if (alpha > 30) {
                r = imgData.data[idx];
                g = imgData.data[idx+1];
                b = imgData.data[idx+2];
                hasSampled = true;
              }
            }
          }

          if (!hasSampled) {
            const hex = Math.random() > 0.9 ? colors[3] : colors[Math.floor(Math.random() * 3)];
            const rgb = hexToRgb(hex) || { r: 255, g: 20, b: 147 };
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
          }

          p.targetR = r;
          p.targetG = g;
          p.targetB = b;
        } else {
          p.targetX = null;
          p.targetY = null;
          p.targetZ = p.baseZ;
          p.targetR = p.baseR;
          p.targetG = p.baseG;
          p.targetB = p.baseB;
        }
      }
    };

    const scatterParticles = () => {
      const pool = particlesRef.current;
      const vol = currentVolRef.current || 0;
      // Audio-Driven Scatter: A louder volume spike causes a more violent, wider scatter
      const SCATTER_FORCE = 12 + (vol / 255) * 22;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.targetX !== null) {
          p.targetX = null;
          p.targetY = null;
          p.targetZ = null;
          p.vx = (Math.random() - 0.5) * SCATTER_FORCE;
          p.vy = (Math.random() - 1.0) * SCATTER_FORCE;
          p.vz = (Math.random() - 0.5) * SCATTER_FORCE * 1.5;
          p.targetR = p.baseR;
          p.targetG = p.baseG;
          p.targetB = p.baseB;
        }
      }
    };

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) { frameRef.current = requestAnimationFrame(render); return; }

      // Sync size of trail canvas
      if (trailCanvas.width !== w || trailCanvas.height !== h) {
        trailCanvas.width = w;
        trailCanvas.height = h;
      }

      const now = performance.now();

      const dpr = window.devicePixelRatio || 1;
      const logicalW = w / dpr;
      const logicalH = h / dpr;

      // Reinit pool on significant canvas size change
      if (!poolReadyRef.current ||
          Math.abs(w - canvasSizeRef.current.w) > 30 ||
          Math.abs(h - canvasSizeRef.current.h) > 30) {
        initPool(w, h);
        canvasSizeRef.current = { w, h };
        lastActiveRef.current = false;
        targetTextRef.current = '';
      }

      const ael = audioElement as any;
      if (ael && ael.__tsukiyoAudioContext && ael.__tsukiyoAudioContext.state === 'suspended' && isPlaying) {
        ael.__tsukiyoAudioContext.resume().catch(() => {});
      }

      let vol = 0;
      let bassVal = 0;
      if (analyserRef.current) {
        const d = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(d);
        let s = 0; for (let i = 0; i < d.length; i++) s += d[i];
        vol = s / d.length;

        // Isolate bass frequency bins (first 4 bins)
        let bassSum = 0;
        const bassCount = Math.min(4, d.length);
        for (let i = 0; i < bassCount; i++) {
          bassSum += d[i];
        }
        bassVal = bassSum / bassCount;
      }
      if (vol < 5 && isPlaying) {
        vol = (Math.sin((now / 1000) * 2.5 * Math.PI) * 0.5 + 0.5) * 50;
        bassVal = vol;
      }

      currentVolRef.current = vol;

      const active = !!(text && text.trim().length > 0 &&
        (!isPlaying || text === '<HEART>' ||
         (currentTime !== undefined && sectionStart !== undefined && sectionEnd !== undefined &&
          currentTime >= sectionStart && currentTime <= sectionEnd)));

      const pool = particlesRef.current;

      // ---- LAYER 1: PORTRAIT (Centered 16:9 viewport contain-fit, logical coordinates) ----
      const shouldRenderPortrait = !!imgRef.current && imgLoadedRef.current && !!imageSrc && text !== '<HEART>';
      let dx = 0, dy = 0, dw = 0, dh = 0;
      let viewW = 0, viewH = 0, viewX = 0, viewY = 0;
      let bufferKey = '';

      if (shouldRenderPortrait) {
        const img = imgRef.current!;
        const imgAspect = img.naturalWidth / img.naturalHeight;

        const targetAspect = 16 / 9;
        viewW = logicalW;
        viewH = logicalH;
        if (logicalW / logicalH > targetAspect) {
          viewW = logicalH * targetAspect;
        } else {
          viewH = logicalW / targetAspect;
        }
        viewX = (logicalW - viewW) / 2;
        viewY = (logicalH - viewH) / 2;

        const safeW = viewW * 0.88;
        const safeH = viewH * 0.88;
        if (imgAspect > safeW / safeH) {
          dw = safeW;
          dh = safeW / imgAspect;
        } else {
          dh = safeH;
          dw = safeH * imgAspect;
        }

        dw *= cropZoom;
        dh *= cropZoom;

        const dw_editor = 384;
        const dh_editor = 216;

        const scaleX = (dw / cropZoom) / dw_editor;
        const scaleY = (dh / cropZoom) / dh_editor;
        const scaledOffsetX = cropOffsetX * scaleX;
        const scaledOffsetY = cropOffsetY * scaleY;

        dx = viewX + (viewW - dw) / 2 + scaledOffsetX;
        dy = viewY + (viewH - dh) / 2 + scaledOffsetY;

        // Compile or update offscreen portrait buffer for color mapping
        bufferKey = `${w}_${h}_${imageSrc}_${cropZoom}_${cropOffsetX}_${cropOffsetY}_${brightness}_${contrast}_${dpr}`;
        const keyChanged = lastBufferKeyRef.current !== bufferKey;
        if (keyChanged) {
          if (!portraitBufferCanvasRef.current) {
            portraitBufferCanvasRef.current = document.createElement('canvas');
          }
          const pCanvas = portraitBufferCanvasRef.current;
          pCanvas.width = w;
          pCanvas.height = h;
          const pCtx = pCanvas.getContext('2d');
          if (pCtx) {
            pCtx.clearRect(0, 0, w, h);
            pCtx.save();
            pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            pCtx.filter = `brightness(${(brightness + 100) / 100}) contrast(${contrast}) saturate(1.1)`;
            pCtx.drawImage(img, dx, dy, dw, dh);
            pCtx.restore();
            try {
              portraitImageDataRef.current = pCtx.getImageData(0, 0, w, h);
              lastBufferKeyRef.current = bufferKey;
            } catch (e) {
              console.error("Failed to read image data from portrait canvas:", e);
              portraitImageDataRef.current = null;
            }
          }
        }

        // Dynamically re-sample particle target colors if image crop coordinates modified
        if (keyChanged && active && portraitImageDataRef.current) {
          const imgData = portraitImageDataRef.current;
          for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            if (p.targetX !== null && p.targetY !== null) {
              const px = p.targetX;
              const py = p.targetY;
              const idx = (Math.floor(py) * imgData.width + Math.floor(px)) * 4;
              if (idx >= 0 && idx < imgData.data.length - 3) {
                const alpha = imgData.data[idx + 3];
                if (alpha > 30) {
                  p.targetR = imgData.data[idx];
                  p.targetG = imgData.data[idx+1];
                  p.targetB = imgData.data[idx+2];
                }
              }
            }
          }
        }
      } else {
        portraitImageDataRef.current = null;
        lastBufferKeyRef.current = '';
      }

      // ---- STATE TRANSITION INTERCEPTOR (Glitch trigger) ----
      const isTextOrActiveChanged = (active !== lastActiveRef.current || (active && targetTextRef.current !== text));
      if (isTextOrActiveChanged && transitionStateRef.current.type === 'none') {
        transitionStateRef.current = {
          type: 'glitch',
          startTime: now,
          nextText: text,
          nextActive: active,
        };
      }

      if (transitionStateRef.current.type === 'glitch') {
        if (now - transitionStateRef.current.startTime >= 50) {
          const { nextText, nextActive } = transitionStateRef.current;
          targetTextRef.current = nextText;
          lastActiveRef.current = nextActive;
          transitionStateRef.current.type = 'none';

          if (nextActive) {
            formWord(nextText, w, h);
          } else {
            scatterParticles();
          }
        }
      }

      // RENDER
      const pulse = 1 + Math.sin(now / 400) * 0.04 + (vol / 255) * 0.08;
      ctx.clearRect(0, 0, w, h);

      // Draw Main Background Gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#03040a');
      bg.addColorStop(0.5, '#0a0813');
      bg.addColorStop(1, '#020206');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Draw Ambient Glow
      const glowColor = stylePreset === 'anime_vignette' ? 'rgba(212, 197, 161, 0.12)' : 'rgba(255, 0, 127, 0.16)';
      const aura = ctx.createRadialGradient(w * 0.5, h * 0.2, 20, w * 0.5, h * 0.2, w * 0.8);
      aura.addColorStop(0, glowColor);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, w, h);

      if (shouldRenderPortrait) {
        ctx.save();
        ctx.globalAlpha = 0.72 + (vol / 255) * 0.08;
        ctx.filter = `brightness(${(brightness + 100) / 100}) contrast(${contrast}) saturate(1.1)`;
        ctx.drawImage(imgRef.current!, dx, dy, dw, dh);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = stylePreset === 'anime_vignette' ? 'rgba(212, 197, 161, 0.3)' : 'rgba(255, 0, 127, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX + viewW * 0.06, viewY + viewH * 0.06, viewW * 0.88, viewH * 0.88);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${active ? 0.30 : 0.12})`;
        ctx.fillRect(0, 0, logicalW, logicalH);
        ctx.restore();
      }

      // ---- LAYER 2: PARTICLE PHYSICS UPDATE & TRAIL RENDER ----
      if (trailCtx) {
        trailCtx.save();
        trailCtx.globalCompositeOperation = 'destination-out';
        trailCtx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        trailCtx.fillRect(0, 0, w, h);
        trailCtx.restore();

        const SPRING = 0.08;
        const FRICTION = 0.75;

        // Context state cache registry
        let lastAlpha = -1.0;
        let lastFill = '';
        let lastFont = '';
        let lastShadowBlur = -1;
        let lastShadowColor = '';

        // Reset default shadow properties initially to prevent leaks
        trailCtx.shadowBlur = 0;

        // Draw and update particles to trailCtx
        for (let i = 0; i < pool.length; i++) {
          const p = pool[i];

          // 1. Mouse/pointer Repulsion
          let repulseX = 0;
          let repulseY = 0;
          if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const dxVal = p.x - mx;
            const dyVal = p.y - my;
            const dist = Math.sqrt(dxVal * dxVal + dyVal * dyVal);
            const R = 90 * dpr;
            if (dist < R) {
              const force = (R - dist) / R;
              const angle = Math.atan2(dyVal, dxVal);
              repulseX = Math.cos(angle) * force * 6 * dpr;
              repulseY = Math.sin(angle) * force * 6 * dpr;
            }
          }

          // 2. Color interpolation
          p.r += (p.targetR - p.r) * 0.12;
          p.g += (p.targetG - p.g) * 0.12;
          p.b += (p.targetB - p.b) * 0.12;
          const currentRgb = `rgb(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)})`;

          // 3. Physics Updates
          if (p.targetX !== null && p.targetY !== null && p.targetZ !== null) {
            let dxVal = p.targetX - p.x;
            let dyVal = p.targetY - p.y;
            let dzVal = p.targetZ - p.z;
            p.vx += dxVal * SPRING;
            p.vy += dyVal * SPRING;
            p.vz += dzVal * SPRING;
            p.vx *= FRICTION;
            p.vy *= FRICTION;
            p.vz *= FRICTION;
            
            p.x += p.vx + repulseX;
            p.y += p.vy + repulseY;
            p.z += p.vz;
          } else {
            if (Math.random() < 0.04) {
              p.char = chars[Math.floor(Math.random() * chars.length)];
            }
            if (p.vx !== 0 || p.vy !== 0 || p.vz !== 0) {
              p.x += p.vx + repulseX;
              p.y += p.vy + repulseY;
              p.z += p.vz;
              p.vx *= 0.92;
              p.vy *= 0.92;
              p.vz *= 0.92;
              if (Math.abs(p.vx) < 0.05) p.vx = 0;
              if (Math.abs(p.vy) < 0.05) p.vy = 0;
              if (Math.abs(p.vz) < 0.05) p.vz = 0;
            } else {
              p.y += p.speed * (0.9 + pulse * 0.18) + repulseY;
              p.x += repulseX;
              p.z += (p.baseZ - p.z) * 0.05;
              if (p.y > h) {
                p.y = -10;
                p.x = Math.random() * w;
                p.z = p.baseZ;
                p.vx = 0;
                p.vy = p.speed;
                p.vz = 0;
              }
            }
          }

          // 4. Projection & Parallax Shift
          const centerX = w / 2;
          const centerY = h / 2;
          const fov = 400;
          const scale = fov / (fov + p.z);
          
          const parallaxX = tiltRef.current.x * p.z * 0.35 * dpr;
          const parallaxY = tiltRef.current.y * p.z * 0.35 * dpr;

          let projX = centerX + (p.x - centerX) * scale + parallaxX;
          let projY = centerY + (p.y - centerY) * scale + parallaxY;

          // 5. Chromatic glitch tearing
          let drawColor = currentRgb;
          let shadowColor = currentRgb;
          let shadowBlurVal = p.targetX !== null ? (10 + (bassVal / 255) * 20) : 0;

          if (transitionStateRef.current.type === 'glitch') {
            const glitchAge = now - transitionStateRef.current.startTime;
            const glitchOffset = Math.sin(glitchAge * 0.5) * 25 * dpr;
            const bandHeight = h / 5;
            const bandIndex = Math.floor(projY / bandHeight);
            if (bandIndex === 1 || bandIndex === 4) projX += glitchOffset;
            if (bandIndex === 2) projX -= glitchOffset;

            const rand = Math.random();
            if (rand < 0.4) {
              drawColor = '#00ffff';
              shadowColor = '#00ffff';
            } else if (rand < 0.8) {
              drawColor = '#ff0000';
              shadowColor = '#ff0000';
            } else {
              drawColor = '#ffffff';
              shadowColor = '#ffffff';
            }
            shadowBlurVal = 15;
          }

          // 6. Alpha scaling & rendering
          let opacity = p.alpha;
          if (p.targetX !== null) {
            opacity = 1.0;
          } else {
            opacity = p.alpha * (stylePreset === 'anime_vignette' ? 0.35 : 0.65);
            if (p.z < 0) {
              opacity *= Math.max(0, (200 + p.z) / 200);
            } else if (p.z > 300) {
              opacity *= Math.max(0, (500 - p.z) / 200);
            }
          }

          // Apply globalAlpha if changed
          if (opacity !== lastAlpha) {
            trailCtx.globalAlpha = opacity;
            lastAlpha = opacity;
          }

          // Apply shadow properties if changed
          if (shadowBlurVal !== lastShadowBlur) {
            trailCtx.shadowBlur = shadowBlurVal;
            lastShadowBlur = shadowBlurVal;
          }
          if (shadowBlurVal > 0 && shadowColor !== lastShadowColor) {
            trailCtx.shadowColor = shadowColor;
            lastShadowColor = shadowColor;
          }

          // Apply fillStyle if changed
          if (drawColor !== lastFill) {
            trailCtx.fillStyle = drawColor;
            lastFill = drawColor;
          }

          // Calculate size, round to integer to hit browser font glyph cache!
          const drawSize = Math.round(Math.max(2, (p.targetX !== null ? 8 : p.size) * scale));
          const fontStr = `bold ${drawSize}px monospace`;
          if (fontStr !== lastFont) {
            trailCtx.font = fontStr;
            lastFont = fontStr;
          }

          trailCtx.fillText(p.char, projX, projY);
        }

        // Reset context shadow properties after the loop to prevent pollution
        if (lastShadowBlur > 0) {
          trailCtx.shadowBlur = 0;
        }
        trailCtx.globalAlpha = 1.0;

        // Draw offscreen trails canvas onto main canvas at 1:1 physical pixels
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(trailCanvas, 0, 0);
        ctx.restore();
      }

      // ---- LAYER 3: DIRECT TEXT RENDERING (for heart only) ----
      if (active && text === '<HEART>') {
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff007f';
        ctx.fillText('♥', logicalW / 2, logicalH / 2);
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(render);
    };

    // Size canvas to fill its container using 100% of viewport
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const dpr = window.devicePixelRatio || 1;
      const width = p.offsetWidth || window.innerWidth;
      const height = p.offsetHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Mouse, Touch & Orientation Event Listeners
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = (e.clientY - rect.top) * dpr;
    };
    const handlePointerLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };
    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = (e.clientY - rect.top) * dpr;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const tiltX = e.gamma ? e.gamma / 30 : 0;
      const tiltY = e.beta ? (e.beta - 45) / 30 : 0;
      tiltRef.current.x = Math.max(-1, Math.min(1, tiltX));
      tiltRef.current.y = Math.max(-1, Math.min(1, tiltY));
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerLeave);
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('resize', resize);
    render();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerLeave);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isDissolved, stylePreset, isPlaying, currentTime, sectionStart, sectionEnd, text, imageSrc, cropZoom, cropOffsetX, cropOffsetY, brightness, contrast]);

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-transparent"
      style={{ width: '100%', height: '100%' }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
