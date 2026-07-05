import React, { useEffect, useRef, useState } from 'react';
import type { UploadedImage, LyricSection, StitchStyle } from './dashboard';

interface WaveformTimelineProps {
  audioUrl: string;
  masterCropStart: number;
  masterCropEnd: number;
  duration: number;
  currentTime: number;
  sections: LyricSection[];
  images: UploadedImage[];
  activeSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSections: (sections: LyricSection[]) => void;
  onChangeCropStart?: (val: number) => void;
  onChangeCropEnd?: (val: number) => void;
  onDragEnd?: () => void;
  analyser?: AnalyserNode | null;
  stylePreset?: StitchStyle;
  audioElement?: HTMLAudioElement | null;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  audioUrl,
  masterCropStart,
  masterCropEnd,
  duration,
  currentTime,
  sections,
  images,
  activeSectionId,
  onSelectSection,
  onUpdateSections,
  onChangeCropStart,
  onChangeCropEnd,
  onDragEnd,
  analyser,
  stylePreset = 'matrix_rain',
  audioElement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const transientPeaksRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Dragging state
  const [dragInfo, setDragInfo] = useState<{
    type: 'left' | 'right' | 'move' | 'crop_start' | 'crop_end';
    sectionId?: string;
    startX: number;
    startVal: number;
    endVal?: number;
  } | null>(null);

  const themeAccent = stylePreset === 'matrix_rain' ? '#ff007f' : '#d4c5a1';

  // Parse audio file into peaks and detect transient peaks
  useEffect(() => {
    const parseAudio = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 180;
        const blockSize = Math.floor(rawData.length / samples);
        const extracted = [];
        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          extracted.push(sum / blockSize);
        }
        setPeaks(extracted);

        // Detect transient drum hits/peaks in the track
        const transients: number[] = [];
        const average = extracted.reduce((a, b) => a + b, 0) / extracted.length;
        const threshold = average * 1.35;
        for (let i = 1; i < extracted.length - 1; i++) {
          if (extracted[i] > extracted[i - 1] && extracted[i] > extracted[i + 1] && extracted[i] > threshold) {
            const t = (i / extracted.length) * audioBuffer.duration;
            transients.push(parseFloat(t.toFixed(2)));
          }
        }
        transientPeaksRef.current = transients;
      } catch (err) {
        // Fallback synthetic wave generator
        const synth = [];
        for (let i = 0; i < 180; i++) {
          synth.push(0.12 + 0.38 * Math.sin(i * 0.08) * Math.cos(i * 0.035) + 0.08 * Math.random());
        }
        setPeaks(synth);
        
        // Synthetic transients
        const transients: number[] = [];
        for (let i = 5; i < 180; i += 15) {
          transients.push((i / 180) * (duration || 60));
        }
        transientPeaksRef.current = transients;
      }
    };

    parseAudio();
  }, [audioUrl]);

  // Snapping function
  const SNAP_THRESHOLD = 0.25; // 250ms snap window
  const getSnappedValue = (val: number, excludeId?: string): number => {
    const targets: number[] = [];
    
    // Add other block boundaries (starts and ends)
    sections.forEach(s => {
      if (s.id !== excludeId) {
        targets.push(s.start);
        targets.push(s.end);
      }
    });

    // Add transient peaks in relative time
    transientPeaksRef.current.forEach(pt => {
      const relPt = pt - masterCropStart;
      if (relPt >= 0 && relPt <= (masterCropEnd - masterCropStart)) {
        targets.push(relPt);
      }
    });

    let closest = val;
    let minDiff = SNAP_THRESHOLD;
    for (const t of targets) {
      const diff = Math.abs(val - t);
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    }

    if (closest !== val) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10); // subtle snap haptic feedback tick
      }
    }
    return closest;
  };

  // Continuous 60fps canvas render loop for smooth playhead & reactive glow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 120);

      ctx.clearRect(0, 0, w, h);

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(75, 70, 60, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += w / 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Query real-time bass energy from the Web Audio analyser
      let bassGlow = 0;
      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let bassSum = 0;
        const count = Math.min(4, dataArray.length);
        for (let i = 0; i < count; i++) {
          bassSum += dataArray[i];
        }
        bassGlow = bassSum / count;
      }

      // Read smooth, unthrottled playback time directly from HTML5 audio element
      let smoothTime = currentTime;
      if (audioElement && !audioElement.paused) {
        const isSnippet = audioElement.duration <= 35;
        smoothTime = isSnippet ? (masterCropStart + audioElement.currentTime) : audioElement.currentTime;
      }

      // Draw waveform bars
      const barWidth = w / peaks.length;
      const maxVal = Math.max(...peaks) || 1.0;

      for (let i = 0; i < peaks.length; i++) {
        const barH = (peaks[i] / maxVal) * (h * 0.75);
        const x = i * barWidth;
        const y = (h - barH) / 2;

        const barTime = (i / peaks.length) * (duration || 60);
        const isPastPlayhead = barTime < smoothTime;

        if (barTime >= masterCropStart && barTime <= masterCropEnd) {
          const isSelectedTheme = stylePreset === 'matrix_rain';
          ctx.save();
          if (isPastPlayhead) {
            ctx.shadowBlur = (bassGlow / 255) * 12;
            ctx.shadowColor = themeAccent;
            ctx.fillStyle = isSelectedTheme ? 'rgba(255, 0, 127, 0.85)' : 'rgba(212, 197, 161, 0.85)';
          } else {
            ctx.fillStyle = isSelectedTheme ? 'rgba(255, 0, 127, 0.25)' : 'rgba(212, 197, 161, 0.25)';
          }
          ctx.fillRect(x + 1, y, barWidth - 1, barH);
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(75, 70, 60, 0.1)';
          ctx.fillRect(x + 1, y, barWidth - 1, barH);
        }
      }

      // Draw Current Audio Playhead Line (smooth & pulsing to bass)
      if (duration > 0) {
        const playheadX = (smoothTime / duration) * w;
        ctx.save();
        ctx.shadowBlur = 10 + (bassGlow / 255) * 15;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2 + (bassGlow / 255) * 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, h);
        ctx.stroke();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [peaks, currentTime, duration, masterCropStart, masterCropEnd, analyser, stylePreset, themeAccent, audioElement]);

  // Handle Dragging Events
  useEffect(() => {
    if (!dragInfo || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragInfo.startX;
      const dSecs = (dx / rect.width) * (duration || 60);

      if (dragInfo.type === 'crop_start') {
        let newStart = dragInfo.startVal + dSecs;
        newStart = Math.max(0, Math.min(newStart, masterCropEnd - 1.0));
        onChangeCropStart?.(parseFloat(newStart.toFixed(1)));
        return;
      }

      if (dragInfo.type === 'crop_end') {
        let newEnd = dragInfo.startVal + dSecs;
        newEnd = Math.max(masterCropStart + 1.0, Math.min(newEnd, duration));
        onChangeCropEnd?.(parseFloat(newEnd.toFixed(1)));
        return;
      }

      const targetSec = sections.find(s => s.id === dragInfo.sectionId);
      if (!targetSec) return;

      const sorted = [...sections].sort((a, b) => a.start - b.start);
      const idx = sorted.findIndex(s => s.id === dragInfo.sectionId);
      
      const prevSec = idx > 0 ? sorted[idx - 1] : null;
      const nextSec = idx < sorted.length - 1 ? sorted[idx + 1] : null;

      const minBound = prevSec ? prevSec.end : 0;
      const maxBound = nextSec ? nextSec.start : (masterCropEnd - masterCropStart);

      if (dragInfo.type === 'left') {
        let newStart = dragInfo.startVal + dSecs;
        newStart = getSnappedValue(newStart, dragInfo.sectionId);
        newStart = Math.max(minBound, Math.min(newStart, (dragInfo.endVal as number) - 0.5));
        onUpdateSections(sections.map(s => s.id === dragInfo.sectionId ? { ...s, start: parseFloat(newStart.toFixed(1)) } : s));
      } else if (dragInfo.type === 'right') {
        let newEnd = (dragInfo.endVal as number) + dSecs;
        newEnd = getSnappedValue(newEnd, dragInfo.sectionId);
        newEnd = Math.max(dragInfo.startVal + 0.5, Math.min(newEnd, maxBound));
        onUpdateSections(sections.map(s => s.id === dragInfo.sectionId ? { ...s, end: parseFloat(newEnd.toFixed(1)) } : s));
      } else if (dragInfo.type === 'move') {
        const length = (dragInfo.endVal as number) - dragInfo.startVal;
        let newStart = dragInfo.startVal + dSecs;
        newStart = getSnappedValue(newStart, dragInfo.sectionId);
        let newEnd = newStart + length;

        if (newStart < minBound) {
          newStart = minBound;
          newEnd = newStart + length;
        }
        if (newEnd > maxBound) {
          newEnd = maxBound;
          newStart = newEnd - length;
        }

        onUpdateSections(sections.map(s => s.id === dragInfo.sectionId ? { 
          ...s, 
          start: parseFloat(newStart.toFixed(1)), 
          end: parseFloat(newEnd.toFixed(1)) 
        } : s));
      }
    };

    const handleMouseUp = () => {
      setDragInfo(null);
      onDragEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, duration, sections, masterCropStart, masterCropEnd]);

  // Click on empty space to add new segment
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || dragInfo) return;

    const target = e.target as HTMLElement;
    if (target.closest('.lyric-block-overlay') || target.closest('.drag-handle')) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * (duration || 60);

    if (clickTime < masterCropStart || clickTime > masterCropEnd) return;

    let isColliding = false;
    sections.forEach(s => {
      const absStart = s.start + masterCropStart;
      const absEnd = s.end + masterCropStart;
      if (clickTime >= absStart && clickTime <= absEnd) {
        isColliding = true;
      }
    });

    if (isColliding) return;

    const sorted = [...sections].sort((a, b) => a.start - b.start);
    let minBound = masterCropStart;
    let maxBound = masterCropEnd;

    for (let i = 0; i < sorted.length; i++) {
      const absEnd = sorted[i].end + masterCropStart;
      const absStart = sorted[i].start + masterCropStart;
      if (absEnd <= clickTime) {
        minBound = absEnd;
      }
      if (absStart >= clickTime) {
        maxBound = absStart;
        break;
      }
    }

    let newStart = clickTime - 1.5;
    let newEnd = clickTime + 1.5;

    if (newEnd - newStart > (maxBound - minBound)) {
      newStart = minBound;
      newEnd = maxBound;
    } else {
      if (newStart < minBound) {
        newStart = minBound;
        newEnd = newStart + 3.0;
      }
      if (newEnd > maxBound) {
        newEnd = maxBound;
        newStart = newEnd - 3.0;
      }
    }

    if (newEnd - newStart >= 0.5) {
      const defaultImageId = images.length > 0 ? images[0].id : '';
      const relativeStart = newStart - masterCropStart;
      const relativeEnd = newEnd - masterCropStart;

      const newSec: LyricSection = {
        id: `sec-${Date.now()}`,
        start: parseFloat(relativeStart.toFixed(1)),
        end: parseFloat(relativeEnd.toFixed(1)),
        text: 'NEW SEGMENT',
        imageId: defaultImageId,
        style: 'matrix_rain',
        scrollSpeed: 1.0
      };

      const updated = [...sections, newSec].sort((a, b) => a.start - b.start);
      onUpdateSections(updated);
      onSelectSection(newSec.id);
      onDragEnd?.(); // commit to history
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
        <span>Timeline visual cropper</span>
        <span>Click empty space to add segment</span>
      </div>

      <div
        ref={containerRef}
        onClick={handleTimelineClick}
        className="w-full h-[120px] bg-black/40 border border-[#4b463c]/30 rounded-lg overflow-hidden relative cursor-crosshair select-none"
      >
        {/* Waveform Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

        {/* Gray Out-Of-Bounds Crop Overlay */}
        {duration > 0 && (
          <>
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/75 z-10 pointer-events-none border-r border-red-900/40"
              style={{ width: `${(masterCropStart / duration) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/75 z-10 pointer-events-none border-l border-red-900/40"
              style={{ left: `${(masterCropEnd / duration) * 100}%`, right: 0 }}
            />

            {/* Draggable Crop Window Handles */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragInfo({
                  type: 'crop_start',
                  startX: e.clientX,
                  startVal: masterCropStart,
                });
              }}
              className="absolute top-0 bottom-0 z-35 w-4 cursor-col-resize flex items-center justify-start group"
              style={{ left: `${(masterCropStart / duration) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-[5px] h-full bg-[#d4c5a1] group-hover:bg-white transition-all shadow-[0_0_10px_rgba(212,197,161,0.6)] rounded-l-md" style={{ backgroundColor: themeAccent }} />
            </div>

            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragInfo({
                  type: 'crop_end',
                  startX: e.clientX,
                  startVal: masterCropEnd,
                });
              }}
              className="absolute top-0 bottom-0 z-35 w-4 cursor-col-resize flex items-center justify-end group"
              style={{ left: `${(masterCropEnd / duration) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-[5px] h-full bg-[#d4c5a1] group-hover:bg-white transition-all shadow-[0_0_10px_rgba(212,197,161,0.6)] rounded-r-md" style={{ backgroundColor: themeAccent }} />
            </div>
          </>
        )}

        {/* Lyric Sections Bounding Blocks – sections stored in relative time, offset by masterCropStart */}
        {duration > 0 && sections.map((sec) => {
          const absStart = sec.start + masterCropStart;
          const absEnd   = sec.end   + masterCropStart;
          const leftPct  = (absStart / duration) * 100;
          const widthPct = ((absEnd - absStart) / duration) * 100;
          const isActive = activeSectionId === sec.id;

          const linkedImg = images.find(img => img.id === sec.imageId);

          return (
            <div
              key={sec.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSection(sec.id);
              }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('.drag-handle')) return;
                setDragInfo({
                  type: 'move',
                  sectionId: sec.id,
                  startX: e.clientX,
                  startVal: sec.start,
                  endVal: sec.end,
                });
              }}
              className={`absolute top-2 bottom-2 z-20 rounded border lyric-block-overlay cursor-move flex flex-col justify-between p-1.5 transition-all ${
                isActive
                  ? 'bg-black/40 shadow-[0_0_15px_rgba(212,197,161,0.25)]'
                  : 'bg-black/50 border-[#4b463c]/50 hover:border-[#d4c5a1]/40'
              }`}
              style={{ 
                left: `${leftPct}%`, 
                width: `${widthPct}%`, 
                borderColor: isActive ? themeAccent : undefined,
                boxShadow: isActive ? `0 0 15px ${themeAccent}40` : undefined
              }}
            >
              {/* Top Details */}
              <div className="flex justify-between items-center text-[8px] font-mono text-gray-400 pointer-events-none">
                <span className="truncate">{sec.text || 'EMPTY'}</span>
              </div>

              {/* Linked image preview thumbnail */}
              {linkedImg && (
                <div className="w-5 h-5 rounded overflow-hidden bg-black/40 border border-[#4b463c]/30 pointer-events-none self-center">
                  <img src={linkedImg.src} alt="" className="w-full h-full object-cover grayscale" />
                </div>
              )}

              {/* Timeline segment label */}
              <div className="text-[7px] font-mono text-gray-500 pointer-events-none text-center">
                {absStart.toFixed(1)}s - {absEnd.toFixed(1)}s
              </div>

              {/* Drag handles */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragInfo({
                    type: 'left',
                    sectionId: sec.id,
                    startX: e.clientX,
                    startVal: sec.start,
                    endVal: sec.end,
                  });
                }}
                className="absolute top-0 bottom-0 left-0 w-2 cursor-col-resize drag-handle hover:bg-[#d4c5a1]/40 flex items-center justify-center"
              >
                <div className="w-[1.5px] h-3 bg-[#4b463c]/80 rounded" />
              </div>
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragInfo({
                    type: 'right',
                    sectionId: sec.id,
                    startX: e.clientX,
                    startVal: sec.start,
                    endVal: sec.end,
                  });
                }}
                className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize drag-handle hover:bg-[#d4c5a1]/40 flex items-center justify-center"
              >
                <div className="w-[1.5px] h-3 bg-[#4b463c]/80 rounded" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
