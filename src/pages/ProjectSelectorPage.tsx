import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useAllProjectsHealth } from "@/hooks/useProjectHealth";
import { useLastProjectAccess, markProjectAccessed } from "@/hooks/useLastProjectAccess";
import { useCountUp } from "@/hooks/useCountUp";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, LogOut, Globe, Search, ArrowRight,
  Building2, MapPin, Briefcase, Clock, AlertTriangle, ClipboardCheck,
  FlaskConical, Sparkles, Mail,
} from "lucide-react";
import type { Project } from "@/lib/services/projectService";

const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "es", label: "ES" },
];

const ADMIN_CONTACT = "support@aschquality.com";

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(date: Date | null, lang: string): string | null {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return lang === "es" ? "ahora" : "agora";
  if (diffMin < 60) return lang === "es" ? `hace ${diffMin} min` : `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return lang === "es" ? `hace ${diffH} h` : `há ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return lang === "es" ? `hace ${diffD} d` : `há ${diffD} d`;
  return date.toLocaleDateString(lang === "es" ? "es-ES" : "pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatLongDate(lang: string): string {
  const locale = lang === "es" ? "es-ES" : "pt-PT";
  const formatted = new Date().toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

type StatusFilter = "active" | "archived";

export default function ProjectSelectorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { projects, setActiveProject, loading: projectsLoading } = useProject();
  const { healthMap } = useAllProjectsHealth();
  const { getLastAccess, lastAccessedId } = useLastProjectAccess();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [roleByProject, setRoleByProject] = useState<Record<string, string | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  /* ── Auto-skip when only 1 active project ──────────────────────────── */
  useEffect(() => {
    if (projectsLoading) return;
    const visible = projects.filter(
      (p) => p.status !== "archived" && p.status !== "inactive",
    );
    if (visible.length === 1) {
      setActiveProject(visible[0]);
      markProjectAccessed(visible[0].id);
      sessionStorage.setItem("atlas_session_project_chosen", "1");
      navigate("/", { replace: true });
    }
  }, [projects, projectsLoading, setActiveProject, navigate]);

  /* ── Fetch role per project ────────────────────────────────────────── */
  useEffect(() => {
    if (!user || projects.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const { data } = await supabase.rpc("get_project_role", {
              _user_id: user.id,
              _project_id: p.id,
            });
            return [p.id, (data as string) ?? null] as const;
          } catch {
            return [p.id, null] as const;
          }
        }),
      );
      if (!cancelled) {
        setRoleByProject(Object.fromEntries(entries));
      }
    })();
    return () => { cancelled = true; };
  }, [user, projects]);

  /* ── ⌘K → focus search ─────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── Greeting + date ───────────────────────────────────────────────── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("projectSelector.greetingMorning");
    if (h < 19) return t("projectSelector.greetingAfternoon");
    return t("projectSelector.greetingEvening");
  }, [t, i18n.language]);

  const longDate = useMemo(() => formatLongDate(i18n.language), [i18n.language]);

  const userName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    return meta.full_name || meta.name || user?.email?.split("@")[0] || "";
  }, [user]);

  /* ── Filter + sort projects ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter((p) => {
      const isArchived = p.status === "archived" || p.status === "inactive";
      if (statusFilter === "active" && isArchived) return false;
      if (statusFilter === "archived" && !isArchived) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.client?.toLowerCase().includes(q) ?? false) ||
        (p.location?.toLowerCase().includes(q) ?? false) ||
        (p.contractor?.toLowerCase().includes(q) ?? false)
      );
    });
    list.sort((a, b) => {
      if (a.id === lastAccessedId) return -1;
      if (b.id === lastAccessedId) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [projects, query, statusFilter, lastAccessedId]);

  /* ── Hero project (last accessed, only when no filter applied) ─────── */
  const heroProject = useMemo(() => {
    if (query.trim() || statusFilter !== "active") return null;
    return filtered.find((p) => p.id === lastAccessedId) ?? null;
  }, [filtered, query, statusFilter, lastAccessedId]);

  const restProjects = useMemo(
    () => (heroProject ? filtered.filter((p) => p.id !== heroProject.id) : filtered),
    [filtered, heroProject],
  );

  const counts = useMemo(() => {
    let active = 0, archived = 0;
    for (const p of projects) {
      if (p.status === "archived" || p.status === "inactive") archived++;
      else active++;
    }
    return { active, archived };
  }, [projects]);

  const handleSelect = (project: Project) => {
    markProjectAccessed(project.id);
    sessionStorage.setItem("atlas_session_project_chosen", "1");
    setActiveProject(project);
    navigate("/");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const showInitialLoader = authLoading || projectsLoading;

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background: "hsl(215 45% 11%)",
        fontFeatureSettings: '"ss01", "cv11", "rlig" 1, "calt" 1',
      }}
    >
      <BackgroundLayer />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] ring-1 ring-white/10 backdrop-blur">
            <ShieldCheck className="h-4.5 w-4.5 text-white/90" strokeWidth={1.6} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/95">
              {t("common.appName")}
            </span>
            <span className="text-[9px] tracking-[0.24em] uppercase text-white/40">
              {t("projectSelector.qmsLabel")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <Globe className="h-3.5 w-3.5" />
                {LANGUAGES.find((l) => l.code === i18n.language)?.label ?? "PT"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-28">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={cn("text-sm", i18n.language === lang.code && "font-semibold text-primary")}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:bg-white/[0.06] hover:text-white"
            onClick={handleSignOut}
            title={t("topbar.signOut")}
            aria-label={t("topbar.signOut")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-4 sm:px-10 sm:pt-10">
        {/* Hero — greeting (refinamento #1 + #5) */}
        <section className="mb-12 sm:mb-16 max-w-3xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/40">
              {t("projectSelector.eyebrow")}
            </span>
            <span className="h-3 w-px bg-white/15" aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-[0.18em] uppercase text-white/35">
              {longDate}
            </span>
          </div>
          <h1
            className="font-light text-white"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: "1.02",
              letterSpacing: "-0.035em",
            }}
          >
            {greeting}
            {userName ? <span className="text-white/55">, {userName}</span> : ""}.
          </h1>
          <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-white/55 max-w-xl">
            {t("projectSelector.subtitle")}
          </p>
        </section>

        {/* Toolbar — search + filter (refinamento #7) */}
        {!showInitialLoader && projects.length > 0 && (
          <section className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm group/search">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35 transition-colors group-focus-within/search:text-white/70" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("projectSelector.searchPlaceholder")}
                style={{
                  backgroundColor: "hsl(215 40% 16%)",
                  color: "rgb(255 255 255)",
                  borderColor: "hsl(0 0% 100% / 0.12)",
                  caretColor: "rgb(255 255 255)",
                }}
                className="h-11 pl-10 pr-16 text-sm font-medium placeholder:text-white/40 placeholder:font-normal transition-all focus-visible:!border-white/35 focus-visible:!shadow-[0_0_0_3px_hsl(199_89%_48%/0.18)]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-white/45 sm:inline-flex">
                ⌘K
              </kbd>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] p-0.5 self-start sm:self-auto">
              <FilterPill
                active={statusFilter === "active"}
                onClick={() => setStatusFilter("active")}
                label={t("projectSelector.filterActive")}
                count={counts.active}
              />
              <FilterPill
                active={statusFilter === "archived"}
                onClick={() => setStatusFilter("archived")}
                label={t("projectSelector.filterArchived")}
                count={counts.archived}
                disabled={counts.archived === 0}
              />
            </div>
          </section>
        )}

        {/* Grid */}
        {showInitialLoader ? (
          <SkeletonGrid />
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoMatchState query={query} onClear={() => setQuery("")} />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* Hero card — span 2 (refinamento #2) */}
            {heroProject && (
              <li
                key={heroProject.id}
                className="opacity-0 md:col-span-2 xl:col-span-2"
                style={{
                  animation: "psFadeIn 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              >
                <HeroProjectCard
                  project={heroProject}
                  lastAccess={getLastAccess(heroProject.id)}
                  health={healthMap.find((h) => h.project_id === heroProject.id)}
                  role={roleByProject[heroProject.id] ?? null}
                  onSelect={() => handleSelect(heroProject)}
                  lang={i18n.language}
                />
              </li>
            )}

            {restProjects.map((project, i) => (
              <li
                key={project.id}
                className="opacity-0"
                style={{
                  animation: "psFadeIn 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                  animationDelay: `${Math.min(i + (heroProject ? 1 : 0), 12) * 55}ms`,
                }}
              >
                <ProjectCard
                  project={project}
                  isLast={false}
                  lastAccess={getLastAccess(project.id)}
                  health={healthMap.find((h) => h.project_id === project.id)}
                  role={roleByProject[project.id] ?? null}
                  onSelect={() => handleSelect(project)}
                  lang={i18n.language}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* ── Footer (refinamento #6) ──────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-5 sm:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 text-[10px] tracking-[0.18em] uppercase text-white/30 sm:flex-row">
          <span>
            Atlas QMS <span className="text-white/15">·</span> v1.0 <span className="text-white/15">·</span> Asch Infraestructuras y Servicios
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400/60 ps-pulse-soft" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-white/45">{t("projectSelector.systemsOperational")}</span>
          </span>
        </div>
      </footer>

      {/* Animations + grain (refinamento #3) */}
      <style>{`
        @keyframes psFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes psPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0 hsl(155 65% 50% / 0.55); }
          70%      { transform: scale(1.1); box-shadow: 0 0 0 6px hsl(155 65% 50% / 0); }
        }
        @keyframes psPulseSoft {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0; transform: scale(2.4); }
        }
        @keyframes psDrift {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(20px, -16px); }
        }
        @keyframes psDriftSlow {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-24px, 18px); }
        }
        @keyframes psShimmer {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        .ps-pulse { animation: psPulse 2.4s ease-in-out infinite; }
        .ps-pulse-soft { animation: psPulseSoft 2.6s ease-in-out infinite; }
        .ps-drift { animation: psDrift 22s ease-in-out infinite; }
        .ps-drift-slow { animation: psDriftSlow 28s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Background — refinamento #3 (grain + 3 orbs)
   ───────────────────────────────────────────────────────────────────────── */

function BackgroundLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Top vignette glow — navy */}
      <div
        className="ps-drift absolute -top-40 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "hsl(215 70% 30% / 0.35)" }}
      />
      {/* Bottom-right emerald breath */}
      <div
        className="ps-drift-slow absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "hsl(160 55% 35% / 0.18)" }}
      />
      {/* Left violet whisper (NEW — refinamento #3) */}
      <div
        className="ps-drift-slow absolute top-1/3 -left-32 h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{ background: "hsl(255 50% 45% / 0.12)", animationDelay: "9s" }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 1) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, black 0%, transparent 70%)",
        }}
      />

      {/* Grain noise overlay (NEW — refinamento #3) */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: "160px 160px",
        }}
      />

      {/* Vignette bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-64"
        style={{ background: "linear-gradient(180deg, transparent, hsl(215 50% 7%) 95%)" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Filter Pill — refinamento #7 (mais presente quando activo)
   ───────────────────────────────────────────────────────────────────────── */

function FilterPill({
  active, onClick, label, count, disabled,
}: { active: boolean; onClick: () => void; label: string; count: number; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-white/[0.10] text-white font-semibold shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.08)]"
          : "font-medium text-white/55 hover:text-white/85",
      )}
    >
      {label}
      <span className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-mono",
        active ? "bg-white/[0.14] text-white/85" : "bg-white/[0.04] text-white/40",
      )}>
        {count}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Hero Project Card — refinamento #2 (último projecto destacado)
   ───────────────────────────────────────────────────────────────────────── */

function HeroProjectCard({
  project, lastAccess, health, role, onSelect, lang,
}: {
  project: Project;
  lastAccess: Date | null;
  health: { total_nc_open: number; total_ppi_pending: number; total_tests_pending: number; health_status: string } | undefined;
  role: string | null;
  onSelect: () => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const hue = hueFromString(project.code || project.name);

  const ncOpen = health?.total_nc_open ?? 0;
  const ppiPending = health?.total_ppi_pending ?? 0;
  const testsPending = health?.total_tests_pending ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-xl text-left transition-all duration-300",
        "border bg-white/[0.035] backdrop-blur-sm",
        "border-white/[0.12] hover:border-white/[0.22]",
        "hover:shadow-[0_30px_80px_-30px_hsl(215_70%_3%/0.95)]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
      )}
      style={{
        boxShadow: `0 0 0 1px hsl(${hue} 60% 50% / 0.08), 0 24px 60px -30px hsl(${hue} 60% 20% / 0.6)`,
      }}
    >
      {/* Animated diagonal gradient on hover (refinamento #4) */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(125deg, transparent 30%, hsl(${hue} 70% 55% / 0.08) 50%, transparent 70%)`,
        }}
      />
      {/* Top accent line (personalised colour) */}
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, hsl(${hue} 80% 65% / 0.7), transparent)`,
        }}
      />

      <div className="relative flex flex-1 flex-col gap-6 p-6 sm:p-8">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-200/90">
              <Sparkles className="h-3 w-3" />
              {t("projectSelector.lastAccess")}
            </span>
            <span className="inline-flex items-center rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-white/55">
              {project.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {role && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/45">
                {role.replace("_", " ")}
              </span>
            )}
            <StatusDot archived={false} status={health?.health_status} />
          </div>
        </div>

        {/* Identity row */}
        <div className="flex items-start gap-5">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold tracking-wide ring-1 ring-white/15 shadow-lg"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 50% 38%) 0%, hsl(${(hue + 30) % 360} 55% 26%) 100%)`,
              color: "hsl(0 0% 98%)",
              boxShadow: `0 8px 24px -8px hsl(${hue} 60% 25% / 0.7)`,
            }}
            aria-hidden="true"
          >
            {initials(project.name)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2
              className="truncate text-xl sm:text-2xl font-semibold leading-tight text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              {project.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/50">
              {project.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{project.location}</span>
                </span>
              )}
              {project.client && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="truncate">{project.client}</span>
                </span>
              )}
              {lastAccess && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatRelative(lastAccess, lang)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Big KPIs */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-5">
          <KpiBig icon={AlertTriangle} value={ncOpen} label={t("projectSelector.kpi.nc")} tone={ncOpen > 0 ? "warn" : "neutral"} delay={120} />
          <KpiBig icon={ClipboardCheck} value={ppiPending} label={t("projectSelector.kpi.ppi")} tone={ppiPending > 0 ? "info" : "neutral"} delay={220} />
          <KpiBig icon={FlaskConical} value={testsPending} label={t("projectSelector.kpi.tests")} tone={testsPending > 0 ? "info" : "neutral"} delay={320} />
        </div>

        {/* CTA */}
        <div className="mt-auto flex items-center justify-end pt-2">
          <span
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/[0.12]"
            style={{
              boxShadow: `0 0 0 0 hsl(${hue} 70% 55% / 0)`,
            }}
          >
            {t("projectSelector.continueWorking")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Project Card (standard) — refinamentos #4 + #5
   ───────────────────────────────────────────────────────────────────────── */

function ProjectCard({
  project, isLast, lastAccess, health, role, onSelect, lang,
}: {
  project: Project;
  isLast: boolean;
  lastAccess: Date | null;
  health: { total_nc_open: number; total_ppi_pending: number; total_tests_pending: number; health_status: string } | undefined;
  role: string | null;
  onSelect: () => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const isArchived = project.status === "archived" || project.status === "inactive";
  const hue = hueFromString(project.code || project.name);

  const ncOpen = health?.total_nc_open ?? 0;
  const ppiPending = health?.total_ppi_pending ?? 0;
  const testsPending = health?.total_tests_pending ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-xl text-left transition-all duration-300",
        "border bg-white/[0.025] backdrop-blur-sm",
        "border-white/[0.07]",
        "hover:bg-white/[0.045]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
        isLast && "ring-1 ring-white/[0.18]",
      )}
      style={{
        // Personalised glow on hover via CSS variable trick
        ["--card-hue" as string]: String(hue),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `hsl(${hue} 70% 55% / 0.35)`;
        e.currentTarget.style.boxShadow = `0 24px 60px -30px hsl(${hue} 70% 15% / 0.85), 0 0 0 1px hsl(${hue} 70% 55% / 0.15)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Animated diagonal sheen on hover (refinamento #4) */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(125deg, transparent 35%, hsl(${hue} 80% 60% / 0.07) 50%, transparent 65%)`,
        }}
      />

      {isLast && (
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, hsl(${hue} 80% 65% / 0.6), transparent)` }}
        />
      )}

      <div className="relative flex flex-1 flex-col gap-5 p-5 sm:p-6">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-white/55">
            {project.code}
          </span>
          <div className="flex items-center gap-2">
            {role && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/45">
                {role.replace("_", " ")}
              </span>
            )}
            <StatusDot archived={isArchived} status={health?.health_status} />
          </div>
        </div>

        {/* Identity row */}
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-bold tracking-wide ring-1 ring-white/10"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 45% 35%) 0%, hsl(${(hue + 30) % 360} 50% 25%) 100%)`,
              color: "hsl(0 0% 98%)",
            }}
            aria-hidden="true"
          >
            {initials(project.name)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2
              className="truncate text-[18px] font-semibold leading-tight text-white"
              style={{ letterSpacing: "-0.012em" }}
            >
              {project.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-white/45">
              {project.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{project.location}</span>
                </span>
              )}
              {project.client && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span className="truncate">{project.client}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mini-KPIs (count-up — refinamento #7/8a) */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-4">
          <Kpi icon={AlertTriangle} value={ncOpen} label={t("projectSelector.kpi.nc")} tone={ncOpen > 0 ? "warn" : "neutral"} delay={150} />
          <Kpi icon={ClipboardCheck} value={ppiPending} label={t("projectSelector.kpi.ppi")} tone={ppiPending > 0 ? "info" : "neutral"} delay={250} />
          <Kpi icon={FlaskConical} value={testsPending} label={t("projectSelector.kpi.tests")} tone={testsPending > 0 ? "info" : "neutral"} delay={350} />
        </div>

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-4 text-[11px] text-white/40">
          <span className="inline-flex items-center gap-1.5">
            {lastAccess ? (
              <>
                <Clock className="h-3 w-3" />
                <span>{formatRelative(lastAccess, lang)}</span>
              </>
            ) : (
              <span className="text-white/30">{t("projectSelector.neverOpened")}</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-white/40 transition-all duration-300 group-hover:gap-2.5 group-hover:text-white/90">
            {t("projectSelector.open")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  );
}

function StatusDot({ archived, status }: { archived: boolean; status?: string }) {
  if (archived) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/35">
        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        ARCH.
      </span>
    );
  }
  const colour =
    status === "critical" ? "hsl(0 75% 60%)" :
    status === "attention" ? "hsl(38 90% 55%)" :
    "hsl(155 65% 50%)";
  return (
    <span className="inline-flex items-center" title={status ?? "active"}>
      <span
        className="ps-pulse h-1.5 w-1.5 rounded-full"
        style={{ background: colour }}
      />
    </span>
  );
}

/* ── KPIs com count-up (refinamento #7/8a) ─────────────────────────── */

function Kpi({
  icon: Icon, value, label, tone, delay,
}: {
  icon: typeof AlertTriangle;
  value: number;
  label: string;
  tone: "neutral" | "warn" | "info";
  delay?: number;
}) {
  const animated = useCountUp(value, { duration: 900, delay });
  const valueColour =
    tone === "warn" ? "text-amber-300/95" :
    tone === "info" ? "text-white" :
    "text-white/40";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5">
        <Icon className={cn("h-3 w-3", tone === "neutral" ? "text-white/30" : "text-white/55")} />
        <span className={cn("text-base font-semibold tabular-nums leading-none", valueColour)}>
          {animated}
        </span>
      </div>
      <span className="text-[9px] font-medium uppercase tracking-wider text-white/35">
        {label}
      </span>
    </div>
  );
}

function KpiBig({
  icon: Icon, value, label, tone, delay,
}: {
  icon: typeof AlertTriangle;
  value: number;
  label: string;
  tone: "neutral" | "warn" | "info";
  delay?: number;
}) {
  const animated = useCountUp(value, { duration: 1000, delay });
  const valueColour =
    tone === "warn" ? "text-amber-300" :
    tone === "info" ? "text-white" :
    "text-white/45";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", tone === "neutral" ? "text-white/30" : "text-white/60")} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
          {label}
        </span>
      </div>
      <span
        className={cn("text-3xl font-light tabular-nums leading-none", valueColour)}
        style={{ letterSpacing: "-0.02em" }}
      >
        {animated}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Skeleton, Empty, NoMatch states
   ───────────────────────────────────────────────────────────────────────── */

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-[220px] rounded-xl border border-white/[0.06] bg-white/[0.02]"
          style={{ animation: `psFadeIn 600ms ease-out ${i * 60}ms both` }}
        >
          <div className="flex h-full flex-col gap-4 p-6">
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="mt-auto h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Building2 className="h-5 w-5 text-white/45" />
      </div>
      <h2 className="text-lg font-medium text-white">
        {t("projectSelector.noProjects")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        {t("projectSelector.noProjectsDesc")}
      </p>
      <a
        href={`mailto:${ADMIN_CONTACT}`}
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <Mail className="h-3.5 w-3.5" />
        {t("projectSelector.contactAdmin")}
      </a>
    </div>
  );
}

function NoMatchState({ query, onClear }: { query: string; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Search className="h-5 w-5 text-white/45" />
      </div>
      <h2 className="text-lg font-medium text-white">
        {t("projectSelector.noMatch")}
      </h2>
      <p className="mt-2 text-sm text-white/50">
        {t("projectSelector.noMatchDesc", { query })}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        {t("projectSelector.clearSearch")}
      </button>
    </div>
  );
}
