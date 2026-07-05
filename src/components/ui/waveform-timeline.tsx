import React, { useEffect, useRef, useState } from 'react';
import type { StitchStyle } from './dashboard';

interface WaveformTimelineProps {
  audioUrl: string;
  masterCropStart: number;
  masterCropEnd: number;
  duration: number;
  currentTime: number;
  onChangeCropStart?: (val: number) => void;
  onChangeCropEnd?: (val: number) => void;
  onDragEnd?: () => void;
  analyser?: AnalyserNode | null;
  stylePreset?: StitchStyle;
  audioElement?: HTMLAudioElement | null;
  masterLyrics?: { absoluteStart: number; text: string }[];
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  audioUrl,
  masterCropStart,
  masterCropEnd,
  duration,
  currentTime,
  onChangeCropStart,
  onChangeCropEnd,
  onDragEnd,
  analyser,
  stylePreset = 'matrix_rain',
  audioElement,
  masterLyrics = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Dragging state
  const [dragInfo, setDragInfo] = useState<{
    type: 'move';
    startX: number;
    startVal: number;
  } | null>(null);

  const themeAccent = stylePreset === 'matrix_rain' ? '#ff007f' : '#d4c5a1';

  // Parse audio file into peaks
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
      } catch (err) {
        // Fallback synthetic wave generator
        const synth = [];
        for (let i = 0; i < 180; i++) {
          synth.push(0.12 + 0.38 * Math.sin(i * 0.08) * Math.cos(i * 0.035) + 0.08 * Math.random());
        }
        setPeaks(synth);
      }
    };

    parseAudio();
  }, [audioUrl]);

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
      ctx.strokeStyle = 'rgba(75, 70, 60, 0.1)';
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
        const barH = (peaks[i] / maxVal) * (h * 0.6);
        const x = i * barWidth;
        const y = (h - barH) / 2;

        const barTime = (i / peaks.length) * (duration || 60);
        const isInsideCrop = barTime >= masterCropStart && barTime <= masterCropEnd;
        const isPastPlayhead = barTime < smoothTime;

        ctx.save();
        if (isInsideCrop) {
          if (isPastPlayhead) {
            ctx.shadowBlur = (bassGlow / 255) * 12;
            ctx.shadowColor = themeAccent;
            ctx.fillStyle = stylePreset === 'matrix_rain' ? 'rgba(255, 0, 127, 0.85)' : 'rgba(212, 197, 161, 0.85)';
          } else {
            ctx.fillStyle = stylePreset === 'matrix_rain' ? 'rgba(255, 0, 127, 0.4)' : 'rgba(212, 197, 161, 0.4)';
          }
        } else {
          ctx.fillStyle = 'rgba(75, 70, 60, 0.2)'; // low-opacity base waveform
        }
        ctx.fillRect(x + 1, y, barWidth - 1, barH);
        ctx.restore();
      }

      // Draw lyric cluster tick marks (pink/gold dots)
      if (masterLyrics && masterLyrics.length > 0) {
        masterLyrics.forEach((lyric) => {
          const x = (lyric.absoluteStart / duration) * w;
          const isInsideCrop = lyric.absoluteStart >= masterCropStart && lyric.absoluteStart <= masterCropEnd;

          ctx.save();
          ctx.shadowBlur = isInsideCrop ? 6 : 0;
          ctx.shadowColor = themeAccent;
          ctx.fillStyle = isInsideCrop 
            ? themeAccent 
            : 'rgba(255, 255, 255, 0.2)';
          
          ctx.beginPath();
          ctx.arc(x, h - 8, isInsideCrop ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
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
  }, [peaks, currentTime, duration, masterCropStart, masterCropEnd, analyser, stylePreset, themeAccent, audioElement, masterLyrics]);

  // Handle Dragging Events (Instagram-style sliding frame)
  useEffect(() => {
    if (!dragInfo || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragInfo.startX;
      const dSecs = (dx / rect.width) * (duration || 60);

      const cropWidth = masterCropEnd - masterCropStart;
      let newStart = dragInfo.startVal + dSecs;
      newStart = Math.max(0, Math.min(newStart, duration - cropWidth));
      const newEnd = newStart + cropWidth;

      onChangeCropStart?.(parseFloat(newStart.toFixed(1)));
      onChangeCropEnd?.(parseFloat(newEnd.toFixed(1)));
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
  }, [dragInfo, duration, masterCropStart, masterCropEnd]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
        <span>Timeline Audio Cropper</span>
        <span>Drag the bounding box left or right to select a segment</span>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[120px] bg-black/40 border border-[#4b463c]/30 rounded-lg overflow-hidden relative select-none"
      >
        {/* Waveform Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

        {/* Highlighted Draggable Bounding Box Slider */}
        {duration > 0 && (
          <div
            onMouseDown={(e) => {
              setDragInfo({
                type: 'move',
                startX: e.clientX,
                startVal: masterCropStart,
              });
            }}
            className="absolute top-0 bottom-0 z-30 cursor-grab active:cursor-grabbing hover:bg-white/[0.02] transition-colors border-2 group rounded"
            style={{
              left: `${(masterCropStart / duration) * 100}%`,
              width: `${((masterCropEnd - masterCropStart) / duration) * 100}%`,
              borderColor: themeAccent,
              boxShadow: `0 0 20px ${themeAccent}30, inset 0 0 15px ${themeAccent}10`,
            }}
          >
            {/* Center handle indicator */}
            <div className="absolute inset-y-0 left-1/2 w-3 flex items-center justify-center -translate-x-1/2 pointer-events-none opacity-40 group-hover:opacity-85 transition-opacity gap-[2px]">
              <div className="w-[1.5px] h-7 bg-white rounded-full" />
              <div className="w-[1.5px] h-7 bg-white rounded-full" />
              <div className="w-[1.5px] h-7 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
