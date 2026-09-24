import { useEffect, useRef } from 'react';

// Full-screen confetti and fireworks over the page; clicks pass through.
export function Celebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const confetti: Confetto[] = [];
    const sparks: Spark[] = [];

    confetti.push(...cannon(0, height, 1, 120), ...cannon(width, height, -1, 120));

    let last = performance.now();
    let nextFirework = last + 600;
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (now >= nextFirework) {
        sparks.push(...firework(width * (0.15 + Math.random() * 0.7), height * (0.1 + Math.random() * 0.35)));
        nextFirework = now + 700 + Math.random() * 900;
      }
      if (confetti.length < 150 && Math.random() < 0.5) confetti.push(rainDrop(width));

      ctx.clearRect(0, 0, width, height);

      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.vx *= 0.99;
        c.vy = Math.min(c.vy + 400 * dt, 140);
        c.x += (c.vx + Math.sin(now / 400 + c.phase) * 30) * dt;
        c.y += c.vy * dt;
        c.spin += c.spinSpeed * dt;
        if (c.y > height + 20) {
          confetti.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.spin);
        ctx.scale(1, Math.cos(c.spin * 2));
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        ctx.restore();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= 0.97;
        s.vy = s.vy * 0.97 + 120 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(s.life, 1);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="celebration" />;
}

const COLORS = ['#009246', '#ffffff', '#ce2b37', '#f4c542', '#4fa3e0', '#e86fb0'];

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  spin: number;
  spinSpeed: number;
  phase: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

function cannon(x: number, y: number, direction: 1 | -1, count: number): Confetto[] {
  return Array.from({ length: count }, () => {
    const angle = (-60 - Math.random() * 25) * (Math.PI / 180);
    const speed = 700 + Math.random() * 600;
    return confetto(x, y, Math.cos(angle) * speed * direction, Math.sin(angle) * speed);
  });
}

function rainDrop(width: number): Confetto {
  return confetto(Math.random() * width, -20, 0, 60 + Math.random() * 60);
}

function confetto(x: number, y: number, vx: number, vy: number): Confetto {
  return {
    x,
    y,
    vx,
    vy,
    size: 8 + Math.random() * 8,
    color: pick(COLORS),
    spin: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() - 0.5) * 10,
    phase: Math.random() * Math.PI * 2,
  };
}

function firework(x: number, y: number): Spark[] {
  const color = pick(COLORS);
  const count = 60;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const speed = 150 + Math.random() * 120;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: Math.random() < 0.2 ? '#ffffff' : color,
      life: 1 + Math.random() * 0.6,
    };
  });
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
