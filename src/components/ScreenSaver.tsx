import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  /** Minutos de inactividade antes de activar. Default: 3 */
  idleMinutes?: number;
  /** Texto secundário opcional (ex: nome do projecto) */
  projectLabel?: string;
}

const METRICS = [
  { text: "PPI Aprovado",    col: "#34d399" },
  { text: "HP Confirmado",   col: "#60a5fa" },
  { text: "NC Encerrada",    col: "#34d399" },
  { text: "PAME Aprovado",   col: "#fbbf24" },
  { text: "Ensaio Conforme", col: "#34d399" },
  { text: "0 NCs Abertas",   col: "#34d399" },
  { text: "GR Assinada",     col: "#a78bfa" },
  { text: "EME Calibrado",   col: "#60a5fa" },
];

const ORBS = [
  { xr: 0.15, yr: 0.22, col: "#3b82f6", sz: 60 },
  { xr: 0.88, yr: 0.18, col: "#6366f1", sz: 48 },
  { xr: 0.12, yr: 0.78, col: "#0d9488", sz: 40 },
  { xr: 0.85, yr: 0.82, col: "#7c3aed", sz: 52 },
];

export function ScreenSaver({ idleMinutes = 3, projectLabel }: Props) {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();
  const frameRef  = useRef(0);
  const floatsRef = useRef<any[]>([]);
  const lastSpawnRef = useRef(0);

  const dismiss = useCallback(() => setActive(false), []);

  // Idle detection
  useEffect(() => {
    const IDLE_MS = idleMinutes * 60 * 1000;
    const reset = () => {
      clearTimeout(timerRef.current);
      if (active) setActive(false);
      timerRef.current = setTimeout(() => setActive(true), IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [idleMinutes, active]);

  // Canvas animation
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      frameRef.current = 0;
      floatsRef.current = [];
      lastSpawnRef.current = 0;
      return;
    }

    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      cv.width  = window.innerWidth  * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Particles
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * 1400,
      y: Math.random() * 900,
      r: Math.random() * 1.8 + 0.3,
      vx: (Math.random() - .5) * .22,
      vy: (Math.random() - .5) * .22,
      a: Math.random() * .35 + .08,
      col: Math.random() > .5 ? "#60a5fa" : "#34d399",
    }));

    function grid(alpha: number) {
      ctx.save();
      ctx.strokeStyle = `rgba(59,130,246,${alpha * .055})`;
      ctx.lineWidth = .5;
      for (let x = 0; x < W(); x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke(); }
      for (let y = 0; y < H(); y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W(), y); ctx.stroke(); }
      ctx.restore();
    }

    function orbs(ti: number) {
      const oa = Math.min(1, (ti - 10) / 40);
      if (oa <= 0) return;
      ORBS.forEach((o, i) => {
        const drift = Math.sin(ti * .012 + i * 1.5) * .014;
        const ox = W() * (o.xr + drift), oy = H() * (o.yr + drift * .5);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.sz);
        g.addColorStop(0, o.col + "2a"); g.addColorStop(1, o.col + "00");
        ctx.save(); ctx.globalAlpha = oa;
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, o.sz, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    function drawShield(ox: number, oy: number, sz: number, ti: number) {
      ctx.save();
      const pulse = 1 + Math.sin(ti * .018) * .04;
      const s = sz * pulse;
      ctx.beginPath();
      ctx.moveTo(ox, oy - s);
      ctx.bezierCurveTo(ox + s * .72, oy - s * .82, ox + s * .92, oy - s * .28, ox + s * .92, oy + s * .12);
      ctx.bezierCurveTo(ox + s * .92, oy + s * .62, ox, oy + s, ox, oy + s);
      ctx.bezierCurveTo(ox, oy + s, ox - s * .92, oy + s * .62, ox - s * .92, oy + s * .12);
      ctx.bezierCurveTo(ox - s * .92, oy - s * .28, ox - s * .72, oy - s * .82, ox, oy - s);
      ctx.fillStyle = "rgba(15,40,100,.42)";
      ctx.fill();
      ctx.strokeStyle = `rgba(96,165,250,${.55 + Math.sin(ti * .025) * .18})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      const cs = s * .42;
      ctx.beginPath();
      ctx.moveTo(ox - cs * .7, oy + cs * .05);
      ctx.lineTo(ox - cs * .05, oy + cs * .72);
      ctx.lineTo(ox + cs * .82, oy - cs * .52);
      ctx.strokeStyle = `rgba(52,211,153,${.78 + Math.sin(ti * .03) * .18})`;
      ctx.lineWidth = s * .065;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }

    function label(ti: number) {
      const a = Math.min(1, (ti - 25) / 55);
      if (a <= 0) return;
      ctx.save();
      ctx.textAlign = "center";
      const lx = W() / 2, ly = H() * .73;
      ctx.font = "500 32px system-ui, sans-serif";
      ctx.fillStyle = `rgba(248,250,252,${a * .9})`;
      ctx.fillText("ATLAS QMS", lx, ly);
      ctx.font = "400 13px system-ui, sans-serif";
      ctx.fillStyle = `rgba(148,163,184,${a * .55})`;
      const sub = projectLabel ?? "SISTEMA DE GESTÃO DA QUALIDADE";
      ctx.fillText(sub, lx, ly + 26);
      ctx.font = "400 11px system-ui, sans-serif";
      ctx.fillStyle = `rgba(100,116,139,${a * .35})`;
      ctx.fillText("Clique ou mova o rato para continuar", lx, ly + 52);
      ctx.restore();
    }

    function railway(ti: number) {
      const prog = Math.min(1, (ti - 30) / 110);
      if (prog <= 0) return;
      const ry = H() * .87, sx = W() * .08, ex = W() * .92;
      const cx2 = sx + (ex - sx) * prog;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(sx, ry);
      for (let x = sx; x <= cx2; x += 2) {
        const w = Math.sin(x * .014 + ti * .008) * 5;
        ctx.lineTo(x, ry + w);
      }
      ctx.strokeStyle = "rgba(96,165,250,.17)"; ctx.lineWidth = 1; ctx.stroke();
      const nd = 9;
      for (let i = 0; i < nd; i++) {
        const dp = i / (nd - 1); if (dp > prog) break;
        const dx = sx + (ex - sx) * dp;
        const dw = Math.sin(dx * .014 + ti * .008) * 5;
        const da = .38 + Math.sin(ti * .06 + i * 1.1) * .28;
        ctx.fillStyle = `rgba(52,211,153,${da})`;
        ctx.beginPath(); ctx.arc(dx, ry + dw, 4, 0, Math.PI * 2); ctx.fill();
        if (da > .45) {
          ctx.strokeStyle = `rgba(52,211,153,${da * .35})`;
          ctx.lineWidth = .5;
          ctx.beginPath(); ctx.arc(dx, ry + dw, 10, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(100,116,139,.3)";
      ctx.font = "400 10px system-ui, sans-serif";
      ctx.textAlign = "left";
      if (prog > .05) ctx.fillText("PK 29+730", sx, ry + 22);
      if (prog > .95) { ctx.textAlign = "right"; ctx.fillText("PK 33+700", ex, ry + 22); }
      ctx.restore();
    }

    function floaters() {
      const f = floatsRef.current;
      f.forEach((item: any) => {
        item.y -= .4; item.life++;
        item.a = item.life < 30 ? item.life / 30 : item.life > item.max - 30 ? (item.max - item.life) / 30 : 1;
        ctx.save(); ctx.globalAlpha = item.a * .88;
        ctx.font = "500 12px system-ui, sans-serif"; ctx.textAlign = "left";
        const tw = ctx.measureText(item.text).width;
        const pw = tw + 34, ph = 24, pr = 12;
        ctx.fillStyle = "rgba(10,22,40,.82)";
        ctx.beginPath(); (ctx as any).roundRect(item.x - 2, item.y - ph * .7, pw, ph, pr); ctx.fill();
        ctx.strokeStyle = item.col + "55"; ctx.lineWidth = .6; ctx.stroke();
        ctx.fillStyle = item.col;
        ctx.beginPath(); ctx.arc(item.x + 11, item.y - ph * .7 + ph / 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(226,232,240,.9)";
        ctx.fillText(item.text, item.x + 22, item.y - ph * .7 + ph * .67);
        ctx.restore();
      });
      floatsRef.current = f.filter((i: any) => i.life < i.max);
    }

    function particles() {
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W(); if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H(); if (p.y > H()) p.y = 0;
        ctx.save(); ctx.globalAlpha = p.a;
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    function tick() {
      const ti = frameRef.current;
      ctx.fillStyle = "#080f1e";
      ctx.fillRect(0, 0, W(), H());
      grid(Math.min(1, ti / 60));
      orbs(ti);
      particles();
      const sa = Math.min(1, (ti - 15) / 50);
      if (sa > 0) {
        ctx.save(); ctx.globalAlpha = sa;
        drawShield(W() / 2, H() * .4, Math.min(W(), H()) * .17, ti);
        ctx.restore();
      }
      label(ti);
      railway(ti);
      floaters();
      if (ti > 80 && ti - lastSpawnRef.current > 72) {
        const m = METRICS[Math.floor(Math.random() * METRICS.length)];
        floatsRef.current.push({
          text: m.text, col: m.col,
          x: Math.random() * (W() - 220) + 110,
          y: H() + 30, a: 0, life: 0,
          max: 200 + Math.random() * 120,
        });
        lastSpawnRef.current = ti;
      }
      frameRef.current++;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, projectLabel]);

  if (!active) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "none" }}
      onClick={dismiss}
      onMouseMove={dismiss}
      onKeyDown={dismiss}
      tabIndex={-1}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
