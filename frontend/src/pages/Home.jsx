import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Music, Palette, Gamepad2, ArrowRightLeft, Shield } from 'lucide-react';

const HERO_IMAGES = [
  '/s1.jpg',
  '/s2.jpg',
  '/s3.jpg',
  '/s4.jpg',
  '/s5.jpg',
  '/s6.webp',
  '/s7.jpg',
  '/s8.jpg',
  '/s9.webp',
  '/s10.jpg',
  '/s11.jpg',
  '/s12.jpg',
  '/s13.jpg',
  '/s14.jpg',
  '/s15.jpg',
  '/s16.jpg',
];

const IMAGE_POSITIONS = [
  { top: '2%', left: '1%', width: 140, height: 200 },
  { top: '1%', left: '18%', width: 180, height: 140 },
  { top: '4%', left: '42%', width: 160, height: 200 },
  { top: '2%', right: '18%', width: 170, height: 160 },
  { top: '1%', right: '2%', width: 150, height: 190 },
  { top: '28%', left: '0%', width: 160, height: 180 },
  { top: '35%', left: '25%', width: 190, height: 140 },
  { top: '22%', right: '28%', width: 170, height: 200 },
  { top: '30%', right: '0%', width: 150, height: 160 },
  { bottom: '32%', left: '2%', width: 180, height: 170 },
  { bottom: '28%', left: '22%', width: 160, height: 200 },
  { bottom: '35%', left: 'calc(50% - 70px)', width: 140, height: 180 },
  { bottom: '30%', right: '20%', width: 170, height: 160 },
  { bottom: '28%', right: '0%', width: 180, height: 190 },
  { bottom: '2%', left: '8%', width: 160, height: 200 },
  { bottom: '4%', right: '10%', width: 200, height: 170 },
];

/* Slide 0 = hero text, 1-5 = features, 6 = CTA */
const SLIDES = [
  {
    isHero: true,
    dotColor: 'bg-primary-300',
  },
  {
    icon: Shield,
    title: 'Backed by XRP',
    desc: 'Every NFT can be backed by real XRP locked in escrow. The asset can never go to zero — burn it anytime to redeem the guaranteed floor value.',
    accentColor: '#ffc2ca',
    iconGradient: 'from-primary-400 to-primary-600',
    dotColor: 'bg-pink-300',
  },
  {
    icon: Music,
    title: 'Revenue Shares',
    desc: 'Musicians and creators can sell shares of their revenue streams — songs, content, royalties. Fans invest directly in the work they love and earn as it grows.',
    accentColor: '#ffc2ca',
    iconGradient: 'from-primary-400 to-primary-600',
    dotColor: 'bg-primary-300',
  },
  {
    icon: Gamepad2,
    title: 'Digital Goods',
    desc: 'Game skins, virtual items, in-app assets — put them on the blockchain and let them live beyond any single platform. Owned by users, traded freely.',
    accentColor: '#ffc2ca',
    iconGradient: 'from-primary-400 to-primary-600',
    dotColor: 'bg-primary-300',
  },
  {
    icon: Palette,
    title: 'Art & Collectibles',
    desc: 'Artists list original work with guaranteed floor value. Provable ownership, transparent pricing, and a global marketplace with no gatekeepers.',
    accentColor: '#ffc2ca',
    iconGradient: 'from-primary-400 to-primary-600',
    dotColor: 'bg-primary-300',
  },
  {
    icon: ArrowRightLeft,
    title: 'Open Trading',
    desc: 'Every asset lives on the XRP Ledger. Buy, sell, and trade outside the original system — a truly open secondary market where you set the price.',
    accentColor: '#ffc2ca',
    iconGradient: 'from-primary-400 to-primary-600',
    dotColor: 'bg-primary-300',
  },
  {
    isCta: true,
    dotColor: 'bg-primary-300',
  },
];

const TRANSITION_MS = 700;

export default function Home() {
  const gridRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = up, 0 = idle, 1 = down
  const lockRef = useRef(false);
  const total = SLIDES.length;

  // ── Go to a specific slide ──
  const goTo = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(idx, total - 1));
    if (clamped === active || lockRef.current) return;
    lockRef.current = true;
    setDirection(clamped > active ? 1 : -1);
    setActive(clamped);
    setTimeout(() => {
      lockRef.current = false;
      setDirection(0);
    }, TRANSITION_MS);
  }, [active, total]);

  // ── Wheel handler: one slide per scroll gesture ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      if (lockRef.current) return;
      if (Math.abs(e.deltaY) < 5) return; // ignore tiny trackpad noise
      if (e.deltaY > 0) goTo(active + 1);
      else goTo(active - 1);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [active, goTo]);

  // ── Keyboard: arrow up/down ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goTo(active + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goTo(active - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  // ── Touch swipe support ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startY = 0;

    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 40) return; // ignore small taps
      if (dy > 0) goTo(active + 1);
      else goTo(active - 1);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [active, goTo]);

  // ── Parallax for background images ──
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };

    const animate = () => {
      currentRef.current.x += (mouseRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (mouseRef.current.y - currentRef.current.y) * 0.05;

      const grid = gridRef.current;
      if (grid) {
        const items = grid.querySelectorAll('.grid-item');
        items.forEach((item, index) => {
          const speed = 0.5 + (index % 3) * 0.3;
          const x = currentRef.current.x * 15 * speed;
          const y = -currentRef.current.y * 15 * speed;
          item.style.transform = `translate(${x}px, ${y}px)`;
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Prevent body scroll while on homepage
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-black z-40"
    >
      {/* Background: parallax image grid (always visible) */}
      <div
        ref={gridRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.35 }}
      >
        {HERO_IMAGES.map((src, i) => (
          <div key={i} className="grid-item" style={{
            position: 'absolute',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 20px rgba(255,255,255,0.02)',
            ...IMAGE_POSITIONS[i],
          }}>
            <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
          </div>
        ))}
      </div>

      {/* ── Slide content layers ── */}
      {SLIDES.map((slide, i) => {
        const Icon = slide.icon;
        const isActive = i === active;

        // Determine enter/exit animation
        let opacity = 0;
        let transform = 'translateY(40px)';

        if (isActive) {
          opacity = 1;
          transform = 'translateY(0)';
        }

        return (
          <div
            key={i}
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{
              opacity,
              transform,
              transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            {slide.isHero ? (
              <>
                <h1 className="text-white font-bold tracking-[-3px] leading-[1.1] mb-8"
                    style={{ fontSize: 'clamp(2.5rem, 10vw, 96px)' }}>
                  Make
                  <br />
                  Anything
                  <br />
                  Valuable
                </h1>
                <p className="text-xl text-white/80 mb-12 font-light max-w-xl">
                  The only NFT marketplace where every asset has guaranteed value — backed by XRP escrow, traded on an open market.
                </p>
                <Link
                  to="/marketplace"
                  className="relative overflow-hidden bg-primary-300 text-black px-12 py-4 rounded-[28px] text-base font-semibold border border-primary-200/30 backdrop-blur-lg tracking-wide hover:scale-105 hover:bg-primary-200 hover:shadow-[0_10px_40px_rgba(255,173,184,0.25)] transition-all"
                >
                  Shop Now
                </Link>
              </>
            ) : slide.isCta ? (
              <>
                <h2 className="text-4xl md:text-6xl font-bold mb-4 text-white tracking-tight">
                  Your asset. Your market.
                </h2>
                <p className="text-lg text-surface-400 mb-12 max-w-lg font-light">
                  Tokenize what you create, lock XRP as a guaranteed floor, and let the world decide what it's worth.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link to="/dashboard" className="px-8 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-all text-white">
                    Start Creating
                  </Link>
                  <Link to="/marketplace" className="px-8 py-3 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl font-semibold transition-all text-white">
                    Browse Marketplace
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${slide.iconGradient} flex items-center justify-center mb-8 shadow-lg`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <h2
                  className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
                  style={{ color: slide.accentColor }}
                >
                  {slide.title}
                </h2>
                <p className="text-lg md:text-xl text-surface-400 max-w-2xl leading-relaxed font-light">
                  {slide.desc}
                </p>
              </>
            )}
          </div>
        );
      })}

      {/* Progress dots (right side) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-50">
        {SLIDES.map((slide, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? `w-2.5 h-8 ${slide.dotColor}`
                : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Scroll hint on first slide */}
      {active === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-pulse z-50">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-white/20" />
        </div>
      )}
    </div>
  );
}
