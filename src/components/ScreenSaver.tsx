import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  /** Minutos de inactividade antes de activar. Default: 3 */
  idleMinutes?: number;
  /** Texto secundário opcional (ex: nome do projecto activo) */
  projectLabel?: string;
}

/**
 * Premium screensaver — agnostic, international (PT + EN), Atlas QMS branded.
 * Cinematic canvas with: deep nebula bg, parallax constellation, animated KPI
 * tickers, breathing shield mark, soft type lockup, ambient signal pulses.
 */

// Bilingual achievement tags (PT · EN). Universal QMS vocabulary.
const SIGNALS = [
  { pt: "PPI Aprovado",        en: "ITP Approved",        col: "#34d399", icon: "check" },
  { pt: "HP Confirmado",       en: "Hold Point Cleared",  col: "#60a5fa", icon: "shield" },
  { pt: "NC Encerrada",        en: "NCR Closed",          col: "#34d399", icon: "check" },
  { pt: "Lote Conforme",       en: "Lot Conforming",      col: "#a78bfa", icon: "check" },
  { pt: "Ensaio Conforme",     en: "Test Pass",           col: "#34d399", icon: "spark" },
  { pt: "EME Calibrado",       en: "Equipment Calibrated", col: "#60a5fa", icon: "spark" },
  { pt: "Documento Aprovado",  en: "Document Approved",   col: "#fbbf24", icon: "check" },
  { pt: "Auditoria OK",        en: "Audit Cleared",       col: "#34d399", icon: "shield" },
  { pt: "Material Recepcionado", en: "Material Received", col: "#a78bfa", icon: "spark" },
  { pt: "RFI Respondido",      en: "RFI Answered",        col: "#60a5fa", icon: "check" },
  { pt: "Soldadura Conforme",  en: "Weld Conforming",     col: "#34d399", icon: "spark" },
  { pt: "Compactação OK",      en: "Compaction Pass",     col: "#34d399", icon: "check" },
];

// Soft glow orbs (parallax depth field)
const ORBS = [
  { xr: 0.14, yr: 0.20, col: "#3b82f6", sz: 220, speed: 0.6 },
  { xr: 0.86, yr: 0.16, col: "#6366f1", sz: 180, speed: 0.8 },
  { xr: 0.10, yr: 0.80, col: "#0d9488", sz: 200, speed: 0.5 },
  { xr: 0.88, yr: 0.84, col: "#7c3aed", sz: 240, speed: 0.7 },
  { xr: 0.50, yr: 0.50, col: "#1e40af", sz: 320, speed: 0.3 },
];

// Tagline rotation (PT · EN)
const TAGLINES = [
  { pt: "Sistema de Gestão da Qualidade",   en: "Quality Management System" },
  { pt: "Inspecção · Conformidade · Rastreabilidade", en: "Inspection · Compliance · Traceability" },
  { pt: "Construção monitorizada em tempo real", en: "Construction monitored in real time" },
  { pt: "Cada ponto crítico, sob controlo",  en: "Every critical point, under control" },
];

export function ScreenSaver({ idleMinutes = 3, projectLabel }: Props) {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();
  const frameRef  = useRef(0);
  const floatsRef = useRef<any[]>([]);
  const lastSpawnRef = useRef(0);
  const taglineIdxRef = useRef(0);

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
      taglineIdxRef.current = 0;
      return;
    }

    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      cv.width  = window.innerWidth  * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Stardust particles (constellation)
    const pts = Array.from({ length: 140 }, () => ({
      x: Math.random() * 1800,
      y: Math.random() * 1100,
      r: Math.random() * 1.6 + 0.2,
      vx: (Math.random() - .5) * .18,
      vy: (Math.random() - .5) * .18,
      a: Math.random() * .4 + .1,
      tw: Math.random() * Math.PI * 2,
      twSpeed: Math.random() * .04 + .01,
      col: Math.random() > .65 ? "#60a5fa" : Math.random() > .5 ? "#34d399" : "#a78bfa",
    }));

    // Vignette + nebula background
    function background(ti: number) {
      // Deep base
      const bg = ctx.createLinearGradient(0, 0, 0, H());
      bg.addColorStop(0,    "#040816");
      bg.addColorStop(0.55, "#070f24");
      bg.addColorStop(1,    "#030611");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W(), H());

      // Subtle nebula sweep
      const sweep = ctx.createRadialGradient(
        W() * (0.5 + Math.sin(ti * .003) * .1),
        H() * (0.45 + Math.cos(ti * .002) * .08),
        0,
        W() * 0.5, H() * 0.5,
        Math.max(W(), H()) * 0.7
      );
      sweep.addColorStop(0,   "rgba(59,130,246,0.08)");
      sweep.addColorStop(0.5, "rgba(124,58,237,0.04)");
      sweep.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, W(), H());
    }

    function grid(alpha: number) {
      ctx.save();
      ctx.strokeStyle = `rgba(96,165,250,${alpha * .04})`;
      ctx.lineWidth = .5;
      const step = 56;
      for (let x = 0; x < W(); x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke(); }
      for (let y = 0; y < H(); y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W(), y); ctx.stroke(); }
      ctx.restore();
    }

    function orbs(ti: number) {
      const oa = Math.min(1, (ti - 10) / 50);
      if (oa <= 0) return;
      ORBS.forEach((o, i) => {
        const drift = Math.sin(ti * .008 * o.speed + i * 1.7) * .025;
        const drift2 = Math.cos(ti * .006 * o.speed + i * 0.9) * .018;
        const ox = W() * (o.xr + drift), oy = H() * (o.yr + drift2);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.sz);
        g.addColorStop(0, o.col + "33");
        g.addColorStop(0.5, o.col + "11");
        g.addColorStop(1, o.col + "00");
        ctx.save(); ctx.globalAlpha = oa * 0.85;
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, o.sz, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }

    function constellation() {
      // Star field with twinkle
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.tw += p.twSpeed;
        if (p.x < 0) p.x = W(); if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H(); if (p.y > H()) p.y = 0;
        const tw = (Math.sin(p.tw) + 1) / 2;
        ctx.save();
        ctx.globalAlpha = p.a * (0.5 + tw * 0.5);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        if (p.r > 1.2 && tw > 0.7) {
          ctx.globalAlpha = p.a * 0.3;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
      // Light constellation lines for nearby points
      ctx.save();
      ctx.strokeStyle = "rgba(96,165,250,0.05)";
      ctx.lineWidth = 0.4;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            ctx.globalAlpha = (1 - d2 / 11000) * 0.25;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    function shield(cx: number, cy: number, sz: number, ti: number) {
      ctx.save();
      const pulse = 1 + Math.sin(ti * .02) * .03;
      const s = sz * pulse;

      // Outer ambient glow
      const glow = ctx.createRadialGradient(cx, cy, s * 0.3, cx, cy, s * 1.8);
      glow.addColorStop(0, "rgba(59,130,246,0.18)");
      glow.addColorStop(0.5, "rgba(52,211,153,0.06)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, s * 1.8, 0, Math.PI * 2); ctx.fill();

      // Rotating ring
      ctx.translate(cx, cy);
      ctx.rotate(ti * 0.003);
      ctx.strokeStyle = `rgba(96,165,250,${0.18 + Math.sin(ti * .02) * .08})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(0, 0, s * 1.25, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.rotate(-ti * 0.003);
      ctx.translate(-cx, -cy);

      // Shield silhouette (soft fill + crisp stroke)
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.bezierCurveTo(cx + s * .72, cy - s * .82, cx + s * .94, cy - s * .28, cx + s * .94, cy + s * .12);
      ctx.bezierCurveTo(cx + s * .94, cy + s * .64, cx, cy + s * 1.02, cx, cy + s * 1.02);
      ctx.bezierCurveTo(cx, cy + s * 1.02, cx - s * .94, cy + s * .64, cx - s * .94, cy + s * .12);
      ctx.bezierCurveTo(cx - s * .94, cy - s * .28, cx - s * .72, cy - s * .82, cx, cy - s);

      const shieldGrad = ctx.createLinearGradient(cx, cy - s, cx, cy + s);
      shieldGrad.addColorStop(0, "rgba(30,64,175,0.55)");
      shieldGrad.addColorStop(1, "rgba(15,23,42,0.65)");
      ctx.fillStyle = shieldGrad;
      ctx.fill();

      ctx.strokeStyle = `rgba(96,165,250,${.55 + Math.sin(ti * .025) * .18})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Check mark
      const cs = s * .42;
      ctx.beginPath();
      ctx.moveTo(cx - cs * .7, cy + cs * .05);
      ctx.lineTo(cx - cs * .05, cy + cs * .72);
      ctx.lineTo(cx + cs * .82, cy - cs * .52);
      ctx.strokeStyle = `rgba(52,211,153,${.85 + Math.sin(ti * .04) * .12})`;
      ctx.lineWidth = s * .07;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.stroke();

      // Inner check glow
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(52,211,153,0.6)";
      ctx.stroke();
      ctx.restore();
    }

    function lockup(ti: number) {
      const a = Math.min(1, (ti - 25) / 60);
      if (a <= 0) return;
      ctx.save();
      ctx.textAlign = "left";
      const ly = H() * .72;

      // Measure both words to center the lockup as a single unit
      ctx.font = "300 56px 'Plus Jakarta Sans', system-ui, sans-serif";
      const wAtlas = ctx.measureText("ATLAS").width;
      const wGap = 16;
      const wQms = ctx.measureText("QMS").width;
      const totalW = wAtlas + wGap + wQms;
      const startX = W() / 2 - totalW / 2;

      // ATLAS (white) + QMS (accent blue)
      ctx.fillStyle = `rgba(248,250,252,${a * .96})`;
      ctx.fillText("ATLAS", startX, ly);
      ctx.fillStyle = `rgba(96,165,250,${a * .96})`;
      ctx.fillText("QMS", startX + wAtlas + wGap, ly);

      // Divider line under lockup
      ctx.textAlign = "center";
      const lx = W() / 2;
      ctx.strokeStyle = `rgba(96,165,250,${a * .35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx - 90, ly + 22);
      ctx.lineTo(lx + 90, ly + 22);
      ctx.stroke();

      // Tagline (rotates every ~6s)
      const tagPhase = Math.floor(ti / 180) % TAGLINES.length;
      taglineIdxRef.current = tagPhase;
      const tagPos = (ti % 180) / 180;
      const tagAlpha = tagPos < 0.1 ? tagPos / 0.1 : tagPos > 0.9 ? (1 - tagPos) / 0.1 : 1;
      const tagline = TAGLINES[tagPhase];
      ctx.font = "400 13px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillStyle = `rgba(148,163,184,${a * tagAlpha * .85})`;
      ctx.fillText(`${tagline.pt}  ·  ${tagline.en}`, lx, ly + 48);

      // Project label (if provided) — bottom right corner instead of center
      if (projectLabel) {
        ctx.textAlign = "right";
        ctx.font = "400 11px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.fillStyle = `rgba(100,116,139,${a * .55})`;
        ctx.fillText(projectLabel.toUpperCase(), W() - 36, H() - 32);
      }

      // Dismiss hint
      ctx.textAlign = "center";
      ctx.font = "400 10.5px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillStyle = `rgba(100,116,139,${a * .4})`;
      ctx.fillText("MOVE  ·  CLICK  ·  PRESS ANY KEY", lx, ly + 78);
      ctx.restore();
    }

    function clock(ti: number) {
      const a = Math.min(1, (ti - 35) / 50);
      if (a <= 0) return;
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
      ctx.save();
      ctx.textAlign = "left";
      ctx.font = "200 14px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillStyle = `rgba(148,163,184,${a * .55})`;
      ctx.fillText(date.toUpperCase(), 36, 40);
      ctx.font = "200 13px 'JetBrains Mono', 'SF Mono', monospace";
      ctx.fillStyle = `rgba(96,165,250,${a * .7})`;
      ctx.fillText(`${hh}:${mm}:${ss}`, 36, 60);
      ctx.restore();
    }

    function corner(ti: number) {
      const a = Math.min(1, (ti - 40) / 50);
      if (a <= 0) return;
      ctx.save();
      ctx.textAlign = "right";
      ctx.font = "300 11px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillStyle = `rgba(148,163,184,${a * .45})`;
      ctx.fillText("STAND-BY MODE", W() - 36, 40);
      ctx.font = "200 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = `rgba(52,211,153,${a * .6})`;
      ctx.fillText("● SECURE SESSION ACTIVE", W() - 36, 60);
      ctx.restore();
    }

    function drawIcon(kind: string, x: number, y: number, col: string) {
      ctx.save();
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (kind === "check") {
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x - 1, y + 3);
        ctx.lineTo(x + 4, y - 3);
        ctx.stroke();
      } else if (kind === "shield") {
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 4, y - 2);
        ctx.lineTo(x + 4, y + 1);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x - 4, y + 1);
        ctx.lineTo(x - 4, y - 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function signals() {
      const f = floatsRef.current;
      f.forEach((item: any) => {
        item.y -= .35; item.life++;
        item.a = item.life < 30 ? item.life / 30 : item.life > item.max - 35 ? (item.max - item.life) / 35 : 1;

        ctx.save();
        ctx.globalAlpha = item.a * .92;
        ctx.font = "500 12px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.textAlign = "left";

        const label = `${item.pt}  ·  ${item.en}`;
        const tw = ctx.measureText(label).width;
        const pw = tw + 44, ph = 28, pr = 14;
        const px = item.x - 2, py = item.y - ph * .7;

        // Pill background with subtle gradient
        const grd = ctx.createLinearGradient(px, py, px, py + ph);
        grd.addColorStop(0, "rgba(15,28,52,0.92)");
        grd.addColorStop(1, "rgba(8,18,38,0.88)");
        ctx.fillStyle = grd;
        ctx.beginPath(); (ctx as any).roundRect(px, py, pw, ph, pr); ctx.fill();

        // Border with item color tint
        ctx.strokeStyle = item.col + "55";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Inner left dot + icon
        ctx.fillStyle = item.col;
        ctx.beginPath(); ctx.arc(px + 13, py + ph / 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 8; ctx.shadowColor = item.col;
        ctx.fill(); ctx.shadowBlur = 0;

        // Bilingual label
        ctx.fillStyle = "rgba(226,232,240,0.94)";
        ctx.fillText(label, px + 26, py + ph * .68);

        ctx.restore();
      });
      floatsRef.current = f.filter((i: any) => i.life < i.max);
    }

    function tick() {
      const ti = frameRef.current;
      background(ti);
      grid(Math.min(1, ti / 80));
      orbs(ti);
      constellation();

      const sa = Math.min(1, (ti - 15) / 55);
      if (sa > 0) {
        ctx.save(); ctx.globalAlpha = sa;
        shield(W() / 2, H() * .42, Math.min(W(), H()) * .12, ti);
        ctx.restore();
      }

      lockup(ti);
      clock(ti);
      corner(ti);
      signals();

      // Spawn signal pills
      if (ti > 90 && ti - lastSpawnRef.current > 95) {
        const m = SIGNALS[Math.floor(Math.random() * SIGNALS.length)];
        floatsRef.current.push({
          pt: m.pt, en: m.en, col: m.col, icon: m.icon,
          x: Math.random() * (W() - 320) + 160,
          y: H() + 30, a: 0, life: 0,
          max: 240 + Math.random() * 140,
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
      style={{ position: "fixed", inset: 0, zIndex: 9999, cursor: "none", background: "#040816" }}
      onClick={dismiss}
      onMouseMove={dismiss}
      onKeyDown={dismiss}
      tabIndex={-1}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
