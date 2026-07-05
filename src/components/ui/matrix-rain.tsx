import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  opacity?: number;
  stylePreset?: 'matrix_rain' | 'anime_vignette';
}

export const MatrixRain: React.FC<MatrixRainProps> = ({ 
  opacity = 0.25,
  stylePreset = 'matrix_rain'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Setup characters
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ';
    const fontSize = 12;
    const columns = Math.floor(width / fontSize) + 1;
    const yPositions = Array(columns).fill(0).map(() => Math.random() * -height);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      if (stylePreset === 'anime_vignette') {
        ctx.clearRect(0, 0, width, height);

        // Cinematic Vignette Overlay
        const vign = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.45,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.85
        );
        vign.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vign.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
        ctx.fillStyle = vign;
        ctx.fillRect(0, 0, width, height);

        // Animated Film Grain
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.03})`;
        for (let g = 0; g < 15; g++) {
          ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
        }
      } else {
        // Digital Matrix Rain Backdrop
        ctx.fillStyle = `rgba(19, 19, 19, 0.08)`;
        ctx.fillRect(0, 0, width, height);

        ctx.font = `bold ${fontSize}px monospace`;
        ctx.shadowBlur = 0;

        for (let i = 0; i < yPositions.length; i++) {
          const x = i * fontSize;
          const y = yPositions[i];
          const char = charset[Math.floor(Math.random() * charset.length)];

          let charColor = 'rgba(255, 0, 127, 0.4)'; // Neon Pink/Magenta
          
          if (Math.random() < 0.15) {
            charColor = 'rgba(255, 105, 180, 0.7)'; // Hot Pink
          } else if (Math.random() < 0.02) {
            charColor = 'rgba(255, 255, 255, 0.9)'; // Glitch White
          }

          ctx.fillStyle = charColor;
          ctx.fillText(char, x, y);

          // Reset drops
          yPositions[i] += fontSize * (0.6 + Math.random() * 0.4);
          if (yPositions[i] > height && Math.random() > 0.975) {
            yPositions[i] = -fontSize;
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [stylePreset]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity }}
    />
  );
};
