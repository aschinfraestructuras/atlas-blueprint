import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  User,
  Globe,
  Menu,
  ChevronDown,
  Building2,
  Check,
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

// Mock projects — replace with real data when Projects module is built
const MOCK_PROJECTS = [
  { id: "p1", code: "OBR-001", name: "Obra Norte A2" },
  { id: "p2", code: "OBR-002", name: "Viaduto Sul" },
  { id: "p3", code: "OBR-003", name: "Edifício Central" },
];

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

export function TopBar({ onMobileMenuOpen }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [activeProject, setActiveProject] = useState(MOCK_PROJECTS[0]);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "—";

  return (
    <header className="h-14 flex items-center gap-3 border-b border-border bg-background px-4 flex-shrink-0">
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
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-foreground">{activeProject.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
            {t("topbar.projectSelector.label")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MOCK_PROJECTS.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => setActiveProject(project)}
              className="gap-2 text-sm"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.code}</span>
              </div>
              {activeProject.id === project.id && (
                <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Spacer */}
      <div className="flex-1" />

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
