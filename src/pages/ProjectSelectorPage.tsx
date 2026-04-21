import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useAllProjectsHealth } from "@/hooks/useProjectHealth";
import { useLastProjectAccess, markProjectAccessed } from "@/hooks/useLastProjectAccess";
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
  ShieldCheck, LogOut, Globe, Search, Loader2, ArrowRight,
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

// Deterministic colour from a string (hue 0-359). Always the same for a given input.
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

  /* ── Auth gate ─────────────────────────────────────────────────────── */
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  /* ── Auto-skip when only 1 active project ──────────────────────────── */
  useEffect(() => {
    if (projectsLoading) return;
    const visible = projects.filter(
      (p) => p.status !== "archived" && p.status !== "inactive",
    );
    if (visible.length === 1) {
      setActiveProject(visible[0]);
      markProjectAccessed(visible[0].id);
      navigate("/", { replace: true });
    }
  }, [projects, projectsLoading, setActiveProject, navigate]);

  /* ── Fetch role per project (parallel, lightweight) ────────────────── */
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

  /* ── ⌘K / Ctrl+K → focus search ────────────────────────────────────── */
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

  /* ── Greeting based on local time ──────────────────────────────────── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("projectSelector.greetingMorning");
    if (h < 19) return t("projectSelector.greetingAfternoon");
    return t("projectSelector.greetingEvening");
  }, [t, i18n.language]);

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
    // Last accessed first, then alphabetical by name
    list.sort((a, b) => {
      if (a.id === lastAccessedId) return -1;
      if (b.id === lastAccessedId) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [projects, query, statusFilter, lastAccessedId]);

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
    setActiveProject(project);
    navigate("/");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  /* ── Loading state (full page) ─────────────────────────────────────── */
  const showInitialLoader = authLoading || projectsLoading;

  return (
    <div className="relative min-h-screen overflow-hidden text-white"
         style={{ background: "hsl(215 45% 11%)" }}>
      {/* ── Ambient background — extremely subtle ────────────────────── */}
      <BackgroundLayer />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] ring-1 ring-white/10 backdrop-blur">
            <ShieldCheck className="h-4.5 w-4.5 text-white/90" strokeWidth={1.6} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-[0.32em] uppercase text-white/95">
              {t("common.appName")}
            </span>
            <span className="text-[9px] tracking-[0.28em] uppercase text-white/40">
              {t("projectSelector.qmsLabel")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language */}
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

          {/* Logout — icon only, with tooltip via title */}
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
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-4 sm:px-10 sm:pt-8">
        {/* Hero — greeting */}
        <section className="mb-10 sm:mb-14 max-w-3xl">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.36em] uppercase text-white/35">
            {t("projectSelector.eyebrow")}
          </p>
          <h1 className="text-[2rem] sm:text-[2.6rem] font-light leading-[1.05] tracking-tight text-white">
            {greeting}
            {userName ? <span className="text-white/55">, {userName}</span> : ""}.
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/55 max-w-xl">
            {t("projectSelector.subtitle")}
          </p>
        </section>

        {/* Toolbar — search + filter */}
        {!showInitialLoader && projects.length > 0 && (
          <section className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("projectSelector.searchPlaceholder")}
                className="h-10 border-white/10 bg-white/[0.04] pl-9 pr-16 text-sm text-white placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-0"
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
            {filtered.map((project, i) => (
              <li
                key={project.id}
                className="opacity-0"
                style={{
                  animation: "psFadeIn 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                  animationDelay: `${Math.min(i, 12) * 55}ms`,
                }}
              >
                <ProjectCard
                  project={project}
                  isLast={project.id === lastAccessedId}
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

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-5 sm:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 text-[10px] tracking-[0.18em] uppercase text-white/30 sm:flex-row">
          <span>Atlas QMS · v1.0</span>
          <span>Asch Infraestructuras y Servicios · Quality Management</span>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes psFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes psPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0 hsl(155 65% 50% / 0.55); }
          70%      { transform: scale(1.1); box-shadow: 0 0 0 6px hsl(155 65% 50% / 0); }
        }
        @keyframes psDrift {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(20px, -16px); }
        }
        .ps-pulse { animation: psPulse 2.4s ease-in-out infinite; }
        .ps-drift { animation: psDrift 18s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Background — extremely subtle ambient layer
   ───────────────────────────────────────────────────────────────────────── */

function BackgroundLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Top vignette glow — navy-blue */}
      <div
        className="ps-drift absolute -top-40 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "hsl(215 70% 30% / 0.35)" }}
      />
      {/* Bottom-right emerald breath */}
      <div
        className="ps-drift absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "hsl(160 55% 35% / 0.18)", animationDelay: "6s" }}
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
      {/* Vignette bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-64"
        style={{ background: "linear-gradient(180deg, transparent, hsl(215 50% 7%) 95%)" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Filter Pill
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
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-white/[0.10] text-white"
          : "text-white/55 hover:text-white/85",
      )}
    >
      {label}
      <span className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-mono",
        active ? "bg-white/[0.12] text-white/80" : "bg-white/[0.04] text-white/40",
      )}>
        {count}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Project Card
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
        "group relative flex h-full w-full flex-col overflow-hidden rounded-xl text-left transition-all duration-200",
        "border bg-white/[0.025] backdrop-blur-sm",
        "border-white/[0.07] hover:border-white/[0.18]",
        "hover:bg-white/[0.045] hover:shadow-[0_24px_60px_-30px_hsl(215_60%_3%/0.9)]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
        isLast && "ring-1 ring-white/[0.18]",
      )}
    >
      {/* Last-accessed accent line */}
      {isLast && (
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, hsl(200 90% 70% / 0.6), transparent)" }}
        />
      )}

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        {/* Top row: badge + role */}
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

        {/* Identity row: monogram + name + location */}
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
            <h2 className="truncate text-[17px] font-semibold leading-tight tracking-tight text-white">
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

        {/* Mini-KPIs */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-4">
          <Kpi
            icon={AlertTriangle}
            value={ncOpen}
            label={t("projectSelector.kpi.nc")}
            tone={ncOpen > 0 ? "warn" : "neutral"}
          />
          <Kpi
            icon={ClipboardCheck}
            value={ppiPending}
            label={t("projectSelector.kpi.ppi")}
            tone={ppiPending > 0 ? "info" : "neutral"}
          />
          <Kpi
            icon={FlaskConical}
            value={testsPending}
            label={t("projectSelector.kpi.tests")}
            tone={testsPending > 0 ? "info" : "neutral"}
          />
        </div>

        {/* Footer row: last access + arrow */}
        <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-4 text-[11px] text-white/40">
          <span className="inline-flex items-center gap-1.5">
            {isLast ? (
              <>
                <Sparkles className="h-3 w-3 text-white/60" />
                <span className="text-white/65">{t("projectSelector.lastAccess")}</span>
                {lastAccess && <span>· {formatRelative(lastAccess, lang)}</span>}
              </>
            ) : lastAccess ? (
              <>
                <Clock className="h-3 w-3" />
                <span>{formatRelative(lastAccess, lang)}</span>
              </>
            ) : (
              <span className="text-white/30">{t("projectSelector.neverOpened")}</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-white/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/85">
            {t("projectSelector.open")}
            <ArrowRight className="h-3.5 w-3.5" />
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

function Kpi({
  icon: Icon, value, label, tone,
}: {
  icon: typeof AlertTriangle;
  value: number;
  label: string;
  tone: "neutral" | "warn" | "info";
}) {
  const valueColour =
    tone === "warn" ? "text-amber-300/95" :
    tone === "info" ? "text-white" :
    "text-white/40";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5">
        <Icon className={cn("h-3 w-3", tone === "neutral" ? "text-white/30" : "text-white/55")} />
        <span className={cn("text-base font-semibold tabular-nums leading-none", valueColour)}>
          {value}
        </span>
      </div>
      <span className="text-[9px] font-medium uppercase tracking-wider text-white/35">
        {label}
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
