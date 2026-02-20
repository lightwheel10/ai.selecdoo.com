"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Scan,
  LayoutGrid,
  TrendingDown,
  Sparkles,
  Search,
  Copy,
  Send,
  CheckCircle2,
  Eye,
  Tag,
  FileText,
  Zap,
  Package,
  ArrowUp,
  RefreshCw,
  Trash2,
  BarChart3,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════ */

export type VideoTexts = {
  sceneScrape: string;
  sceneCatalog: string;
  sceneMonitor: string;
  sceneAI: string;
};

type Phase = {
  duration: number;
  cursor: [number, number]; // [x%, y%] relative to video area
  click?: boolean;
};

type FlatPhase = Phase & {
  sceneIdx: number;
  startTime: number;
};

const SCENE_META = [
  { icon: Scan, key: "sceneScrape" as const },
  { icon: LayoutGrid, key: "sceneCatalog" as const },
  { icon: TrendingDown, key: "sceneMonitor" as const },
  { icon: Sparkles, key: "sceneAI" as const },
];

/* ─── Cursor timeline per scene ─── */
/* Coordinates are [x%, y%] relative to the video area (sidebar + content).
   Sidebar is w-10 (40px). Content area starts at ~5.5% x.
   Each phase's `step` index (0,1,2...) is passed to scene components
   so they can react visually to clicks. */
const PHASES: Phase[][] = [
  // Scene 0: Scrape
  [
    { duration: 600, cursor: [50, 50] },              // 0: start center
    { duration: 700, cursor: [48, 14] },              // 1: move to URL input
    { duration: 250, cursor: [48, 14], click: true }, // 2: click URL input → focus border
    { duration: 1800, cursor: [58, 14] },             // 3: watch typing
    { duration: 600, cursor: [92, 14] },              // 4: move to scrape button
    { duration: 250, cursor: [92, 14], click: true }, // 5: click scrape → button pressed
    { duration: 2200, cursor: [55, 50] },             // 6: watch progress fill
    { duration: 600, cursor: [2, 16] },               // 7: move to Catalog sidebar
  ],
  // Scene 1: Catalog
  [
    { duration: 400, cursor: [2, 16], click: true },  // 0: click Catalog sidebar
    { duration: 700, cursor: [40, 8] },               // 1: look at filter bar
    { duration: 400, cursor: [57, 8] },               // 2: move to "In Stock" filter
    { duration: 250, cursor: [57, 8], click: true },  // 3: click "In Stock" → highlight
    { duration: 1200, cursor: [15, 50] },             // 4: look at first product
    { duration: 250, cursor: [15, 50], click: true }, // 5: click product → select border
    { duration: 1500, cursor: [65, 50] },             // 6: browse more products
    { duration: 800, cursor: [80, 90] },              // 7: look at pagination
    { duration: 600, cursor: [2, 25] },               // 8: move to Monitor sidebar
  ],
  // Scene 2: Monitor
  [
    { duration: 400, cursor: [2, 25], click: true },  // 0: click Monitor sidebar
    { duration: 1000, cursor: [50, 18] },             // 1: look at metrics
    { duration: 500, cursor: [55, 44] },              // 2: move to first change row
    { duration: 250, cursor: [55, 44], click: true }, // 3: click row → highlight
    { duration: 1500, cursor: [60, 55] },             // 4: scan more changes
    { duration: 1000, cursor: [65, 80] },             // 5: look at stock changes
    { duration: 600, cursor: [2, 34] },               // 6: move to AI sidebar
  ],
  // Scene 3: AI Content
  // Sidebar=40px, content pad=16px. On ~900px container:
  // "Social Post" toggle center ≈ 20% x, 27% y
  // "Copy" button center ≈ 21% x, 92% y
  // "Send" button center (ml-auto right) ≈ 91% x, 92% y
  // Deal Post text: last line visible at ~3.1s from scene start
  [
    { duration: 400, cursor: [2, 34], click: true },  // 0: click AI sidebar
    { duration: 600, cursor: [50, 13] },              // 1: look at product header
    { duration: 1800, cursor: [50, 55] },             // 2: watch Deal Post text generate (~2.2s for all lines)
    { duration: 500, cursor: [20, 27] },              // 3: move to "Social Post" toggle
    { duration: 250, cursor: [20, 27], click: true }, // 4: click → toggle switches
    { duration: 2000, cursor: [50, 55] },             // 5: watch Social Post text generate
    { duration: 400, cursor: [21, 92] },              // 6: move to Copy button
    { duration: 250, cursor: [21, 92], click: true }, // 7: click Copy → "Copied!"
    { duration: 500, cursor: [91, 92] },              // 8: move to Send
    { duration: 250, cursor: [91, 92], click: true }, // 9: click Send → "Sent!"
    { duration: 1000, cursor: [91, 92] },             // 10: hold on Send — let user see "Sent!"
    { duration: 800, cursor: [50, 50] },              // 11: cursor drifts to center, then loop
  ],
];

/* Flatten to a single timeline */
const TIMELINE: FlatPhase[] = [];
let _t = 0;
PHASES.forEach((phases, sceneIdx) => {
  phases.forEach((phase) => {
    TIMELINE.push({ ...phase, sceneIdx, startTime: _t });
    _t += phase.duration;
  });
});
const TOTAL_DURATION = _t;

/* Precompute where each scene starts in the flat timeline */
const SCENE_START_IDX: number[] = [];
{
  let idx = 0;
  PHASES.forEach((phases) => {
    SCENE_START_IDX.push(idx);
    idx += phases.length;
  });
}

function getCurrentPhase(elapsed: number): FlatPhase {
  for (let i = TIMELINE.length - 1; i >= 0; i--) {
    if (elapsed >= TIMELINE[i].startTime) return TIMELINE[i];
  }
  return TIMELINE[0];
}

function getPhaseIndex(elapsed: number): number {
  for (let i = TIMELINE.length - 1; i >= 0; i--) {
    if (elapsed >= TIMELINE[i].startTime) return i;
  }
  return 0;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ─── Images (real product images from Supabase v2 DB) ─── */
const IMG = {
  snackBox: "https://cdn.shopify.com/s/files/1/0149/5462/7120/files/BestsellerSparsetHundehappen.png?v=1765271632",
  magenDarmSet: "https://cdn.shopify.com/s/files/1/0149/5462/7120/files/Sparsets_1_160082c4-75e8-4e1a-91f6-44906d46b02a.png?v=1748602187",
  zahnMaul: "https://cdn.shopify.com/s/files/1/0149/5462/7120/files/59.png?v=1734442773",
  hautFell: "https://cdn.shopify.com/s/files/1/0149/5462/7120/files/Sparsets_2_a69e7342-bf18-4196-8668-eececec8dd9c.png?v=1741168448",
  vitalSet: "https://cdn.shopify.com/s/files/1/0149/5462/7120/files/Sparsets_0380ff08-46df-4151-8e85-4b299eb5d576.png?v=1748864071",
  spicyBox: "https://cdn.shopify.com/s/files/1/0598/8781/2786/files/Spicy_Big_Box.png?v=1762520624",
  wheyProtein: "https://cdn.shopify.com/s/files/1/0508/5803/3301/files/Whey_zutaten_standard4-min.jpg?v=1717175542",
};

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export function ProductDemoVideo({ texts }: { texts: VideoTexts }) {
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const paused = !isPlaying || (hasStarted && isHovered);

  /* Preload images */
  useEffect(() => {
    Object.values(IMG).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  /* Auto-play when scrolled into view */
  useEffect(() => {
    if (hasStarted) return; // only trigger once
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsPlaying(true);
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  /* Timer — 20fps state updates, Motion handles smooth interpolation */
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setElapsed((prev) => (prev + 50) % TOTAL_DURATION);
    }, 50);
    return () => clearInterval(interval);
  }, [paused]);

  /* Derive state from elapsed */
  const phase = getCurrentPhase(elapsed);
  const scene = phase.sceneIdx;
  const cursorX = phase.cursor[0];
  const cursorY = phase.cursor[1];
  const progress = (elapsed / TOTAL_DURATION) * 100;

  /* Phase tracking */
  const phaseIdx = useMemo(() => getPhaseIndex(elapsed), [elapsed]);
  const sceneStep = phaseIdx - SCENE_START_IDX[scene];
  const [ripple, setRipple] = useState<{ key: number; x: number; y: number } | null>(null);
  const prevPhaseIdx = useRef(-1);

  useEffect(() => {
    if (phaseIdx !== prevPhaseIdx.current) {
      prevPhaseIdx.current = phaseIdx;
      const p = TIMELINE[phaseIdx];
      if (p?.click) {
        setRipple({ key: Date.now(), x: p.cursor[0], y: p.cursor[1] });
      }
    }
  }, [phaseIdx]);

  useEffect(() => {
    if (!ripple) return;
    const t = setTimeout(() => setRipple(null), 600);
    return () => clearTimeout(t);
  }, [ripple]);

  const handlePlayClick = () => {
    setIsPlaying(true);
    setHasStarted(true);
  };

  return (
    <div
      ref={containerRef}
      className="border-2 overflow-hidden relative"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ─── Play overlay (before video starts) ─── */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            className="absolute inset-0 z-[60] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handlePlayClick}
          >
            <motion.div
              className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2"
              style={{
                backgroundColor: "var(--primary)",
                borderColor: "var(--primary)",
                boxShadow: "4px 4px 0px var(--primary-foreground)",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95, x: 2, y: 2, boxShadow: "0px 0px 0px var(--primary-foreground)" }}
            >
              <Play
                className="w-7 h-7 sm:w-9 sm:h-9"
                style={{ color: "var(--primary-foreground)", marginLeft: 3 }}
                fill="var(--primary-foreground)"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Browser chrome ─── */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b-2"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex gap-1.5">
          {[0.25, 0.2, 0.15].map((op, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "var(--muted-foreground)", opacity: op }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div
            className="w-5 h-5 flex items-center justify-center text-[7px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            MF
          </div>
          <span
            className="text-[10px] font-bold tracking-tight hidden sm:inline"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            MarketForce One
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div
            className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
            style={{ backgroundColor: paused ? "var(--muted-foreground)" : "#22c55e" }}
          />
          <span
            className="text-[8px] font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
          >
            {paused ? "Paused" : "Live"}
          </span>
        </div>
      </div>

      {/* ─── Video area: Sidebar + Content + Cursor ─── */}
      <div className="relative flex h-[310px] sm:h-[390px]">
        {/* Mini sidebar */}
        <div
          className="w-10 border-r-2 flex flex-col items-center pt-3 gap-2 shrink-0"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}
        >
          {SCENE_META.map((s, i) => (
            <div
              key={s.key}
              className="w-7 h-7 flex items-center justify-center transition-colors duration-200"
              style={{
                backgroundColor: scene === i ? "var(--primary-muted)" : "transparent",
                borderLeft: scene === i ? "2px solid var(--primary)" : "2px solid transparent",
              }}
            >
              <s.icon
                className="w-3.5 h-3.5"
                style={{
                  color: scene === i ? "var(--primary-text)" : "var(--muted-foreground)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* CSS keyframes must live here (not inside a scene) so they persist across AnimatePresence transitions */}
          <style>{`
            @keyframes dv-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
            @keyframes dv-left{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
            @keyframes dv-fill{from{width:0}to{width:100%}}
            @keyframes dv-pop{0%{opacity:0;transform:scale(.85)}60%{opacity:1;transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
            @keyframes dv-blink{0%,100%{opacity:1}50%{opacity:0}}
            @keyframes dv-type{from{width:0}to{width:15ch}}
          `}</style>
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              className="absolute inset-0 p-3 sm:p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                animationPlayState: paused ? "paused" : "running",
              }}
            >
              {scene === 0 && <SceneScrape paused={paused} step={sceneStep} />}
              {scene === 1 && <SceneCatalog paused={paused} step={sceneStep} />}
              {scene === 2 && <SceneMonitor paused={paused} step={sceneStep} />}
              {scene === 3 && <SceneAI paused={paused} step={sceneStep} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Animated cursor overlay */}
        <motion.div
          className="absolute pointer-events-none z-50"
          animate={{ left: `${cursorX}%`, top: `${cursorY}%` }}
          transition={{ type: "spring", damping: 28, stiffness: 180, mass: 0.8 }}
        >
          <CursorArrow />
        </motion.div>

        {/* Click ripple */}
        <AnimatePresence>
          {ripple && (
            <motion.div
              key={ripple.key}
              className="absolute rounded-full pointer-events-none z-40"
              style={{
                left: `${ripple.x}%`,
                top: `${ripple.y}%`,
                width: 28,
                height: 28,
                x: -14,
                y: -14,
                border: "2px solid var(--primary)",
              }}
              initial={{ scale: 0.3, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ─── Video controls ─── */}
      <div
        className="flex items-center gap-3 px-3 sm:px-4 py-2 border-t-2"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="w-6 h-6 flex items-center justify-center border-2 shrink-0 transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--foreground)",
            backgroundColor: "transparent",
          }}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" style={{ marginLeft: 1 }} />
          )}
        </button>

        {/* Scrubber bar with scene segments */}
        <div
          className="flex-1 h-1.5 relative overflow-hidden cursor-pointer"
          style={{ backgroundColor: "var(--border)" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setElapsed(pct * TOTAL_DURATION);
          }}
        >
          {/* Scene segment markers */}
          {(() => {
            let t = 0;
            return PHASES.map((phases, i) => {
              const start = t;
              phases.forEach((p) => (t += p.duration));
              if (i === 0) return null;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${(start / TOTAL_DURATION) * 100}%`,
                    backgroundColor: "var(--muted-foreground)",
                    opacity: 0.3,
                  }}
                />
              );
            });
          })()}
          {/* Progress fill */}
          <motion.div
            className="h-full"
            style={{ backgroundColor: "var(--primary)", width: `${progress}%` }}
          />
        </div>

        {/* Time display */}
        <span
          className="text-[9px] font-bold tabular-nums shrink-0"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
        >
          {formatTime(elapsed)}
          <span style={{ opacity: 0.4 }}> / {formatTime(TOTAL_DURATION)}</span>
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Cursor SVG
   ═══════════════════════════════════════════════════════════ */

function CursorArrow() {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M1.5 1L14.5 10L8.5 11.2L5.5 18.5L1.5 1Z"
        fill="white"
        stroke="black"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════ */

function ProductThumb({ src, fallback, className = "" }: { src: string; fallback: string; className?: string }) {
  return (
    <div className={`overflow-hidden relative ${className}`} style={{ background: fallback }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

const mono = { fontFamily: "var(--font-mono)" };

function A({ d, children, className = "", style = {} }: { d: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        opacity: 0,
        animation: `dv-up .4s ease-out ${d}s both`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ALeft({ d, children, className = "", style = {} }: { d: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        opacity: 0,
        animation: `dv-left .4s ease-out ${d}s both`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Scene 0: Scrape
   ═══════════════════════════════════════════════════════════ */

const STORES = [
  { name: "Hunderunde", letter: "H", color: "#FF9F0A" },
  { name: "Escapure", letter: "E", color: "#22C55E" },
  { name: "Fairnatural", letter: "F", color: "#5AC8FA" },
  { name: "SCOOPER", letter: "S", color: "#AF52DE" },
];

function SceneScrape({ paused, step }: { paused: boolean; step: number }) {
  const ps = paused ? "paused" : "running";
  return (
    <div className="flex flex-col gap-2 h-full" style={{ ["--ps" as string]: ps }}>
      <A d={0.2} className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ ...mono, color: "var(--primary-text)" }}>
        Scrape Store
      </A>

      {/* URL input row */}
      <A d={0.5}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-2.5 py-2 border-2 transition-colors duration-200"
            style={{
              borderColor: step >= 2 ? "var(--primary)" : "var(--border)",
              backgroundColor: "var(--background)",
              boxShadow: step >= 2 ? "0 0 0 1px var(--primary)" : "none",
            }}
          >
            <Search className="w-3 h-3 shrink-0" style={{ color: "var(--muted-foreground)" }} />
            <span
              className="text-[11px] overflow-hidden whitespace-nowrap"
              style={{
                ...mono,
                color: "var(--foreground)",
                width: 0,
                animation: `dv-type 1.5s steps(15, end) 1.5s both`,
                animationPlayState: ps,
              }}
            >
              hunderunde.shop
            </span>
            <span
              className="w-[2px] h-3.5 inline-block shrink-0"
              style={{
                backgroundColor: "var(--primary)",
                animation: "dv-blink 1s step-end infinite",
                animationPlayState: ps,
              }}
            />
          </div>
          <div
            className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] border-2 whitespace-nowrap transition-all duration-150"
            style={{
              ...mono,
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              borderColor: "var(--primary)",
              transform: step >= 5 ? "translate(2px, 2px)" : "none",
              boxShadow: step >= 5 ? "none" : "3px 3px 0px var(--primary-foreground)",
              opacity: step >= 5 ? 0.85 : 1,
            }}
          >
            {step >= 5 ? "Scraping..." : "Start Scrape"}
          </div>
        </div>
      </A>

      {/* Quick re-scrape */}
      <A d={0.8} className="flex items-center gap-1.5">
        <span className="text-[8px] shrink-0" style={{ ...mono, color: "var(--muted-foreground)" }}>Quick:</span>
        {STORES.map((s) => (
          <div key={s.name} className="flex items-center gap-1 px-2 py-1 border-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
            <div className="w-3.5 h-3.5 flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: s.color, color: "#fff", ...mono }}>{s.letter}</div>
            <span className="text-[8px] font-bold hidden sm:inline" style={{ ...mono, color: "var(--foreground)" }}>{s.name}</span>
          </div>
        ))}
      </A>

      {/* Progress + Job status */}
      <A d={3.5} className="border-2 p-2.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ ...mono, color: "var(--foreground)" }}>Job #4821</span>
          <span className="text-[8px]" style={{ ...mono, color: "var(--muted-foreground)" }}>Elapsed: 00:42</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden mb-1.5" style={{ backgroundColor: "var(--border)" }}>
          <div className="h-full" style={{ backgroundColor: "var(--primary)", animation: "dv-fill 2s ease-in-out 3.8s both", animationPlayState: ps }} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px]" style={{ ...mono, color: "var(--muted-foreground)" }}>Pages: <b style={{ color: "var(--foreground)" }}>23/24</b></span>
          <span className="text-[8px]" style={{ ...mono, color: "var(--muted-foreground)" }}>Products: <b style={{ color: "var(--foreground)" }}>847</b></span>
          <span className="text-[8px]" style={{ ...mono, color: "var(--muted-foreground)" }}>New: <b style={{ color: "#22c55e" }}>12</b></span>
        </div>
      </A>

      {/* Results grid */}
      <div className="grid grid-cols-5 gap-1.5 flex-1 min-h-0">
        {[
          { img: IMG.snackBox, name: "Snack Probierbox", price: "9,99 €", grad: "linear-gradient(135deg, #8B6F47, #A0845C)" },
          { img: IMG.magenDarmSet, name: "Magen & Darm", price: "59,90 €", grad: "linear-gradient(135deg, #9B8B6F, #BFA98A)" },
          { img: IMG.zahnMaul, name: "Zahn & Maul", price: "29,90 €", grad: "linear-gradient(135deg, #6B8E9B, #8BAAB5)" },
          { img: IMG.hautFell, name: "Haut & Fell-Set", price: "54,90 €", grad: "linear-gradient(135deg, #8B5E3C, #A67B5B)" },
          { img: IMG.vitalSet, name: "Vitalitäts-Set", price: "89,90 €", grad: "linear-gradient(135deg, #9B8B6F, #C4A97D)" },
        ].map((p, i) => (
          <A key={i} d={4.8 + i * 0.1} className="border-2 overflow-hidden flex flex-col" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
            <ProductThumb src={p.img} fallback={p.grad} className="h-10 sm:h-14 w-full" />
            <div className="p-1 sm:p-1.5 flex-1 flex flex-col">
              <p className="text-[7px] sm:text-[8px] font-bold leading-tight truncate" style={{ ...mono, color: "var(--foreground)" }}>{p.name}</p>
              <p className="text-[7px] sm:text-[8px] font-bold mt-auto" style={{ ...mono, color: "var(--primary-text)" }}>{p.price}</p>
            </div>
          </A>
        ))}
      </div>

      {/* Success card */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-2"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "var(--primary-muted)",
          opacity: 0,
          animation: "dv-pop .5s ease-out 5.5s both",
          animationPlayState: ps,
        }}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary-text)" }} />
        <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ ...mono, color: "var(--primary-text)" }}>
          Scrape Complete — 847 products found
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Scene 1: Catalog
   ═══════════════════════════════════════════════════════════ */

const PRODUCTS = [
  { name: "Snack Probierbox", brand: "Hunderunde", price: "9,99 €", oldPrice: "13,99 €", discount: "-29%", inStock: true, gradient: "linear-gradient(135deg, #8B6F47, #A0845C)", image: IMG.snackBox, storeColor: "#FF9F0A" },
  { name: "Magen & Darm-Set", brand: "Hunderunde", price: "59,90 €", oldPrice: "92,90 €", discount: "-36%", inStock: true, gradient: "linear-gradient(135deg, #9B8B6F, #BFA98A)", image: IMG.magenDarmSet, storeColor: "#FF9F0A" },
  { name: "Futtertopping Zahn & Maul", brand: "Hunderunde", price: "29,90 €", oldPrice: null, discount: null, inStock: true, gradient: "linear-gradient(135deg, #6B8E9B, #8BAAB5)", image: IMG.zahnMaul, storeColor: "#FF9F0A" },
  { name: "Haut & Fell-Pflegeset", brand: "Hunderunde", price: "54,90 €", oldPrice: "72,90 €", discount: "-25%", inStock: true, gradient: "linear-gradient(135deg, #8B5E3C, #A67B5B)", image: IMG.hautFell, storeColor: "#FF9F0A" },
  { name: "Vitalitäts-Set Haut & Gelenke", brand: "Hunderunde", price: "89,90 €", oldPrice: "134,90 €", discount: "-33%", inStock: true, gradient: "linear-gradient(135deg, #9B8B6F, #C4A97D)", image: IMG.vitalSet, storeColor: "#FF9F0A" },
];

function SceneCatalog({ paused, step }: { paused: boolean; step: number }) {
  void paused;
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Filter toolbar */}
      <A d={0.3} className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-2 flex-1 min-w-0" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)", maxWidth: 180 }}>
          <Search className="w-3 h-3 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          <span className="text-[9px] truncate" style={{ ...mono, color: "var(--muted-foreground)" }}>Search products...</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 border-2" style={{ ...mono, borderColor: "var(--primary)", backgroundColor: "var(--primary-muted)", color: "var(--primary-text)" }}>
          <div className="w-3 h-3 flex items-center justify-center text-[6px] font-bold" style={{ backgroundColor: "#FF9F0A", color: "#fff" }}>H</div>
          <span className="text-[8px] font-bold uppercase tracking-[0.1em]">Hunderunde</span>
        </div>
        <div
          className="px-2 py-1.5 border-2 text-[8px] font-bold uppercase tracking-[0.1em] hidden sm:block transition-all duration-200"
          style={{
            ...mono,
            borderColor: step >= 3 ? "var(--primary)" : "var(--border)",
            backgroundColor: step >= 3 ? "var(--primary-muted)" : "transparent",
            color: step >= 3 ? "var(--primary-text)" : "var(--muted-foreground)",
          }}
        >
          In Stock
        </div>
        <div className="px-2 py-1.5 border-2 text-[8px] font-bold uppercase tracking-[0.1em] hidden sm:block" style={{ ...mono, borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Discount</div>
        <span className="text-[9px] ml-auto shrink-0" style={{ ...mono, color: "var(--muted-foreground)" }}>{step >= 3 ? "612 products" : "847 products"}</span>
      </A>

      {/* Product grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 flex-1 min-h-0">
        {PRODUCTS.map((p, i) => (
          <A
            key={p.name}
            d={0.6 + i * 0.15}
            className="border-2 flex flex-col overflow-hidden transition-all duration-200"
            style={{
              borderColor: (step >= 5 && i === 0) ? "var(--primary)" : "var(--border)",
              backgroundColor: (step >= 5 && i === 0) ? "var(--primary-muted)" : "var(--card)",
              boxShadow: (step >= 5 && i === 0) ? "0 0 0 1px var(--primary)" : "none",
            }}
          >
            <div className="relative">
              <ProductThumb src={p.image} fallback={p.gradient} className="h-14 sm:h-[80px] w-full" />
              {p.discount && (
                <span className="absolute top-1 left-1 text-[7px] font-bold px-1 py-0.5" style={{ ...mono, backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>{p.discount}</span>
              )}
              {!p.inStock && (
                <span className="absolute top-1 right-1 text-[6px] font-bold px-1 py-0.5" style={{ ...mono, backgroundColor: "#ef4444", color: "#fff" }}>OUT</span>
              )}
            </div>
            <div className="p-1.5 flex flex-col gap-0.5 flex-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 flex items-center justify-center text-[6px] font-bold shrink-0" style={{ backgroundColor: p.storeColor, color: "#fff", ...mono }}>H</div>
                <span className="text-[7px] truncate" style={{ ...mono, color: "var(--muted-foreground)" }}>{p.brand}</span>
              </div>
              <p className="text-[8px] font-bold leading-tight line-clamp-2" style={{ ...mono, color: "var(--foreground)" }}>{p.name}</p>
              <div className="flex items-center gap-1 mt-auto">
                <span className="text-[9px] font-bold" style={{ ...mono, color: "var(--foreground)" }}>{p.price}</span>
                {p.oldPrice && <span className="text-[7px] line-through" style={{ ...mono, color: "var(--muted-foreground)" }}>{p.oldPrice}</span>}
                <span className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ backgroundColor: p.inStock ? "#22c55e" : "var(--muted-foreground)" }} />
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <span className="flex items-center gap-0.5 px-1 py-0.5 border text-[6px] font-bold" style={{ ...mono, borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                  <Eye className="w-2 h-2" /><span className="hidden sm:inline">View</span>
                </span>
                <span className="flex items-center px-1 py-0.5 border text-[6px] font-bold" style={{ ...mono, borderColor: "#22c55e33", color: "#22c55e" }}><Tag className="w-2 h-2" /></span>
                <span className="flex items-center px-1 py-0.5 border text-[6px] font-bold" style={{ ...mono, borderColor: "#5AC8FA33", color: "#5AC8FA" }}><FileText className="w-2 h-2" /></span>
              </div>
            </div>
          </A>
        ))}
      </div>

      {/* Pagination */}
      <A d={1.8} className="flex items-center justify-between">
        <span className="text-[8px]" style={{ ...mono, color: "var(--muted-foreground)" }}>Showing 1–24 of 847</span>
        <div className="flex gap-1">
          {["1", "2", "3", "..."].map((n) => (
            <span key={n} className="w-5 h-5 flex items-center justify-center text-[8px] font-bold border" style={{ ...mono, borderColor: n === "1" ? "var(--primary)" : "var(--border)", backgroundColor: n === "1" ? "var(--primary-muted)" : "transparent", color: n === "1" ? "var(--primary-text)" : "var(--muted-foreground)" }}>{n}</span>
          ))}
        </div>
      </A>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Scene 2: Monitor
   ═══════════════════════════════════════════════════════════ */

const METRICS = [
  { icon: TrendingDown, label: "Price", value: "23", color: "#FF9F0A" },
  { icon: Package, label: "Stock", value: "8", color: "#FF453A" },
  { icon: RefreshCw, label: "Fields", value: "41", color: "#AF52DE" },
  { icon: ArrowUp, label: "New", value: "12", color: "#22C55E" },
  { icon: Trash2, label: "Removed", value: "3", color: "#FF6961" },
  { icon: BarChart3, label: "Total", value: "87", color: "#5AC8FA" },
];

const CHANGES = [
  { name: "Snack Probierbox", store: "hunderunde.shop", oldPrice: "13,99 €", newPrice: "9,99 €", pct: "-29%", color: "#22c55e", time: "2h", image: IMG.snackBox, gradient: "linear-gradient(135deg, #8B6F47, #A0845C)" },
  { name: "Magen & Darm-Set", store: "hunderunde.shop", oldPrice: "92,90 €", newPrice: "59,90 €", pct: "-36%", color: "#22c55e", time: "5h", image: IMG.magenDarmSet, gradient: "linear-gradient(135deg, #9B8B6F, #BFA98A)" },
  { name: "Spicy Big Box (12 Dosen)", store: "scooper.energy", oldPrice: "84,99 €", newPrice: "34,90 €", pct: "-59%", color: "#22c55e", time: "8h", image: IMG.spicyBox, gradient: "linear-gradient(135deg, #AF52DE, #C87DFF)" },
  { name: "Bio Whey Protein Mango", store: "fairnatural.de", oldPrice: "24,99 €", newPrice: "29,99 €", pct: "+20%", color: "#ef4444", time: "1d", image: IMG.wheyProtein, gradient: "linear-gradient(135deg, #6B8E9B, #8BAAB5)" },
];

const STOCK_CHANGES = [
  { name: "Senior Wild Trockenfutter", from: "In Stock", to: "Out of Stock", time: "3h" },
  { name: "OatBreak 12er Box", from: "Out of Stock", to: "In Stock", time: "6h" },
];

function SceneMonitor({ paused, step }: { paused: boolean; step: number }) {
  void paused;
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Status bar */}
      <A d={0.2} className="flex items-center gap-2 border-2 px-3 py-1.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
        <Zap className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
        <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ ...mono, color: "var(--foreground)" }}>Monitoring Active</span>
        <span className="text-[7px] font-bold px-1.5 py-0.5" style={{ ...mono, backgroundColor: "#22c55e", color: "#fff" }}>LIVE</span>
        <span className="text-[8px] ml-auto" style={{ ...mono, color: "var(--muted-foreground)" }}>Last: 2 min ago</span>
      </A>

      {/* Metric cards */}
      <A d={0.4} className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {METRICS.map((m) => (
          <div key={m.label} className="border-2 px-2 py-1.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
            <div className="flex items-center gap-1 mb-0.5">
              <div className="w-4 h-4 flex items-center justify-center" style={{ backgroundColor: m.color + "20" }}>
                <m.icon className="w-2.5 h-2.5" style={{ color: m.color }} />
              </div>
              <span className="text-[7px] font-bold uppercase" style={{ ...mono, color: "var(--muted-foreground)" }}>{m.label}</span>
            </div>
            <p className="text-sm sm:text-base font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{m.value}</p>
          </div>
        ))}
      </A>

      {/* Price Changes */}
      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
        <A d={0.8} className="flex items-center gap-2">
          <TrendingDown className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ ...mono, color: "var(--primary-text)" }}>Price Changes</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5" style={{ ...mono, backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>{CHANGES.length}</span>
        </A>

        <div className="flex flex-col gap-1">
          {CHANGES.map((c, i) => (
            <ALeft
              key={c.name}
              d={1.0 + i * 0.15}
              className="flex items-center gap-2 px-2 py-1.5 border-2 transition-all duration-200"
              style={{
                borderColor: (step >= 3 && i === 0) ? "var(--primary)" : "var(--border)",
                backgroundColor: (step >= 3 && i === 0) ? "var(--primary-muted)" : "var(--background)",
              }}
            >
              <ProductThumb src={c.image} fallback={c.gradient} className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 border" />
              <div className="flex-1 min-w-0">
                <p className="text-[8px] sm:text-[9px] font-bold truncate" style={{ ...mono, color: "var(--foreground)" }}>{c.name}</p>
                <p className="text-[7px]" style={{ ...mono, color: "var(--muted-foreground)" }}>{c.store}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] line-through hidden sm:inline" style={{ ...mono, color: "var(--muted-foreground)" }}>{c.oldPrice}</span>
                <span className="text-[9px] font-bold" style={{ ...mono, color: "var(--foreground)" }}>{c.newPrice}</span>
                <span className="text-[7px] sm:text-[8px] font-bold px-1 py-0.5" style={{ ...mono, backgroundColor: c.color, color: "#fff" }}>{c.pct}</span>
              </div>
              <span className="text-[7px] shrink-0 hidden sm:inline" style={{ ...mono, color: "var(--muted-foreground)" }}>{c.time}</span>
            </ALeft>
          ))}
        </div>

        {/* Stock Changes */}
        <A d={2.2} className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" style={{ color: "#FF453A" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ ...mono, color: "#FF453A" }}>Stock Changes</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5" style={{ ...mono, backgroundColor: "#FF453A", color: "#fff" }}>{STOCK_CHANGES.length}</span>
        </A>
        <div className="flex flex-col gap-1">
          {STOCK_CHANGES.map((s, i) => (
            <ALeft key={s.name} d={2.4 + i * 0.15} className="flex items-center gap-2 px-2 py-1 border-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
              <Package className="w-3 h-3 shrink-0" style={{ color: "#FF453A" }} />
              <span className="text-[8px] font-bold flex-1 truncate" style={{ ...mono, color: "var(--foreground)" }}>{s.name}</span>
              <span className="text-[7px] line-through hidden sm:inline" style={{ ...mono, color: "var(--muted-foreground)" }}>{s.from}</span>
              <span className="text-[7px]" style={{ ...mono, color: "var(--muted-foreground)" }}>→</span>
              <span className="text-[7px] font-bold px-1 py-0.5" style={{ ...mono, backgroundColor: s.to === "In Stock" ? "#22c55e" : "#ef4444", color: "#fff" }}>{s.to}</span>
              <span className="text-[7px] shrink-0" style={{ ...mono, color: "var(--muted-foreground)" }}>{s.time}</span>
            </ALeft>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Scene 3: AI Content
   ═══════════════════════════════════════════════════════════ */

const DEAL_LINES = [
  "\u{1F525} DEAL: Magen & Darm-Set",
  "von Hunderunde jetzt nur 59,90 \u20AC",
  "statt 92,90 \u20AC!",
  "",
  "\u2705 36% Rabatt auf das Komplett-Set",
  "\u2705 Spezial-Futtertopping f\u00FCr sensible Hunde",
  "\u2705 Alles f\u00FCr eine gesunde Verdauung",
  "",
  "\u{1F449} Jetzt zuschlagen!",
];

const SOCIAL_LINES = [
  "\u{1F436} Top-Angebot f\u00FCr empfindliche Hunde!",
  "",
  "Magen & Darm-Set von Hunderunde",
  "\u2192 Spezial-Futtertopping f\u00FCr sensible M\u00E4gen",
  "\u2192 Komplettes Pflege-Paket",
  "\u2192 Jetzt zum Aktionspreis: 59,90 \u20AC",
  "",
  "#Hundefutter #Hunderunde #DarmGesundheit",
];

function SceneAI({ paused, step }: { paused: boolean; step: number }) {
  const ps = paused ? "paused" : "running";
  const isSocial = step >= 4;  // step 4: click "Social Post"
  const isCopied = step >= 7;  // step 7: click Copy
  const isSent = step >= 9;    // step 9: click Send
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Product header */}
      <A d={0.3} className="flex items-center gap-3 border-2 p-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
        <ProductThumb src={IMG.magenDarmSet} fallback="linear-gradient(135deg, #9B8B6F, #BFA98A)" className="w-11 h-11 sm:w-13 sm:h-13 shrink-0 border-2" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-3 h-3 flex items-center justify-center text-[6px] font-bold" style={{ backgroundColor: "#FF9F0A", color: "#fff", ...mono }}>H</div>
            <span className="text-[7px]" style={{ ...mono, color: "var(--muted-foreground)" }}>Hunderunde</span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold leading-tight truncate" style={{ ...mono, color: "var(--foreground)" }}>Magen &amp; Darm-Set</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold" style={{ ...mono, color: "var(--foreground)" }}>59,90 &euro;</span>
            <span className="text-[8px] line-through" style={{ ...mono, color: "var(--muted-foreground)" }}>92,90 &euro;</span>
            <span className="text-[7px] font-bold px-1 py-0.5" style={{ ...mono, backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>-36%</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          </div>
        </div>
      </A>

      {/* Content type toggles — react to cursor click */}
      <A d={0.5} className="flex items-center gap-1">
        <span
          className="text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border-2 transition-all duration-200"
          style={{
            ...mono,
            borderColor: isSocial ? "var(--border)" : "var(--primary)",
            backgroundColor: isSocial ? "transparent" : "var(--primary-muted)",
            color: isSocial ? "var(--muted-foreground)" : "var(--primary-text)",
          }}
        >
          Deal Post
        </span>
        <span
          className="text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border-2 transition-all duration-200"
          style={{
            ...mono,
            borderColor: isSocial ? "var(--primary)" : "var(--border)",
            backgroundColor: isSocial ? "var(--primary-muted)" : "transparent",
            color: isSocial ? "var(--primary-text)" : "var(--muted-foreground)",
          }}
        >
          Social Post
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border-2" style={{ ...mono, borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Product Desc</span>
      </A>

      {/* Content card */}
      <div className="flex-1 border-2 flex flex-col overflow-hidden min-h-0" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
        <A d={0.7} className="flex items-center gap-1.5 px-2.5 py-1.5 border-b-2" style={{ borderColor: "var(--border)" }}>
          <Sparkles className="w-3 h-3" style={{ color: "var(--primary-text)" }} />
          <span className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ ...mono, color: "var(--primary-text)" }}>AI Generated</span>
          <span className="text-[7px] ml-auto" style={{ ...mono, color: "var(--muted-foreground)" }}>claude-sonnet-4-5 &middot; {isSocial ? "0.8s" : "1.2s"}</span>
        </A>
        <div className="p-2.5 flex-1 overflow-hidden">
          {(isSocial ? SOCIAL_LINES : DEAL_LINES).map((line, i) => (
            <p
              key={`${isSocial ? "s" : "d"}-${i}`}
              className="text-[9px] sm:text-[10px] leading-relaxed"
              style={{
                ...mono,
                color: line ? "var(--foreground)" : "transparent",
                opacity: 0,
                animation: `dv-up .28s ease-out ${isSocial ? 0.1 + i * 0.1 : 0.7 + i * 0.15}s both`,
                animationPlayState: ps,
                minHeight: line ? undefined : "0.5rem",
              }}
            >
              {line || "\u00A0"}
            </p>
          ))}
        </div>
        <A d={isSocial ? 1.5 : 2.0} className="flex items-center gap-2 px-2.5 py-1.5 border-t-2" style={{ borderColor: "var(--border)" }}>
          <span className="text-[7px]" style={{ ...mono, color: "var(--muted-foreground)" }}>Generated just now</span>
          <span className="text-[7px] px-1 py-0.5" style={{ ...mono, backgroundColor: "#22c55e20", color: "#22c55e" }}>{isSocial ? "186 chars" : "289 chars"}</span>
        </A>
      </div>

      {/* Action buttons — react to cursor clicks */}
      <A d={isSocial ? 2.0 : 2.3} className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 border-2 cursor-default" style={{ ...mono, borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          <RefreshCw className="w-3 h-3" />Regenerate
        </span>
        <span
          className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 border-2 cursor-default transition-all duration-200"
          style={{
            ...mono,
            borderColor: isCopied ? "#22c55e" : "var(--border)",
            backgroundColor: isCopied ? "#22c55e20" : "transparent",
            color: isCopied ? "#22c55e" : "var(--muted-foreground)",
          }}
        >
          {isCopied ? <><CheckCircle2 className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
        </span>
        <span
          className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 border-2 cursor-default ml-auto transition-all duration-200"
          style={{
            ...mono,
            backgroundColor: isSent ? "#22c55e" : "var(--primary)",
            color: isSent ? "#fff" : "var(--primary-foreground)",
            borderColor: isSent ? "#22c55e" : "var(--primary)",
            transform: isSent ? "translate(2px, 2px)" : "none",
          }}
        >
          {isSent ? <><CheckCircle2 className="w-3 h-3" />Sent!</> : <><Send className="w-3 h-3" />Send to Socials</>}
        </span>
      </A>
    </div>
  );
}
