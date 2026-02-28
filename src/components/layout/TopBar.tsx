import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useTheme } from "@/components/theme/ThemeProvider";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import {
  LogOut,
  User,
  Globe,
  Menu,
  ChevronDown,
  Building2,
  Check,
  Loader2,
  Search,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "pt", label: "PT", name: "Português" },
  { code: "es", label: "ES", name: "Español" },
];

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

export function TopBar({ onMobileMenuOpen }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { projects, activeProject, setActiveProject, loading: projectsLoading } = useProject();
  const { role } = useProjectRole();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Only show active (non-archived) projects in the selector
  const activeProjects = projects.filter((p) => p.status !== "archived");

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "—";

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <header className="h-14 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 flex-shrink-0 shadow-[0_1px_12px_hsl(var(--foreground)/0.06)] z-10">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuOpen}
        className="lg:hidden h-8 w-8 flex-shrink-0 text-muted-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Project selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 max-w-[240px] font-normal text-sm border-border/70"
            disabled={projectsLoading}
          >
            {projectsLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <span className="truncate text-foreground">
              {projectsLoading
                ? t("common.loading")
                : activeProject
                ? activeProject.name
                : t("topbar.projectSelector.placeholder")}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
            {t("topbar.projectSelector.label")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {activeProjects.length === 0 ? (
            <DropdownMenuItem disabled className="text-sm text-muted-foreground">
              {t("topbar.projectSelector.noProjects")}
            </DropdownMenuItem>
          ) : (
            activeProjects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setActiveProject(project)}
                className="gap-2 text-sm"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                </div>
                {activeProject?.id === project.id && (
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role badge */}
      {role && (
        <span className="hidden md:inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {role.replace('_', ' ')}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global search */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 h-8 text-xs text-muted-foreground px-2.5"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("common.search")}</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : theme === "light" ? <Sun className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("topbar.theme", { defaultValue: "Tema" })}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 text-sm">
            <Sun className="h-3.5 w-3.5" /> {t("topbar.themeLight", { defaultValue: "Claro" })}
            {theme === "light" && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 text-sm">
            <Moon className="h-3.5 w-3.5" /> {t("topbar.themeDark", { defaultValue: "Escuro" })}
            {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 text-sm">
            <Monitor className="h-3.5 w-3.5" /> {t("topbar.themeSystem", { defaultValue: "Sistema" })}
            {theme === "system" && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Language switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs font-semibold tracking-wider text-muted-foreground px-2.5"
          >
            <Globe className="h-3.5 w-3.5" />
            {currentLang.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t("topbar.language")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className="gap-2.5 text-sm"
            >
              <span
                className={cn(
                  "w-6 text-xs font-bold",
                  i18n.language === lang.code ? "text-primary" : "text-muted-foreground"
                )}
              >
                {lang.label}
              </span>
              <span>{lang.name}</span>
              {i18n.language === lang.code && (
                <Check className="h-3.5 w-3.5 text-primary ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label={t("topbar.profile")}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {initials}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={signOut}
            className="gap-2 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("topbar.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
