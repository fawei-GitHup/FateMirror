'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export function StarryBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx!.scale(dpr, dpr);
      initStars();
    }

    function initStars() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const count = Math.floor((w * h) / 6000); // density based on screen size
      stars = [];

      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 1.8 + 0.3,
          opacity: Math.random() * 0.6 + 0.1,
          speed: Math.random() * 0.15 + 0.02, // slow upward drift
          drift: (Math.random() - 0.5) * 0.08, // slight horizontal drift
          twinkleSpeed: Math.random() * 0.008 + 0.003,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    let time = 0;

    function animate() {
      if (!canvas || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      time += 1;

      for (const star of stars) {
        // Move star
        star.y -= star.speed;
        star.x += star.drift;

        // Wrap around
        if (star.y < -5) {
          star.y = h + 5;
          star.x = Math.random() * w;
        }
        if (star.x < -5) star.x = w + 5;
        if (star.x > w + 5) star.x = -5;

        // Twinkle
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const currentOpacity = star.opacity * (0.5 + 0.5 * twinkle);

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();

        // Larger stars get a subtle glow
        if (star.size > 1.2) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139, 130, 246, ${currentOpacity * 0.15})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(animate);
    }

    resize();
    animate();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
