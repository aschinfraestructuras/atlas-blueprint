import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ClipboardCheck, FlaskConical, FileText,
  Package, Crosshair, Users, FolderKanban, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleShortcut {
  labelKey: string;
  icon: React.ElementType;
  route: string;
  colorVar: string; // CSS variable name e.g. "--module-nc"
}

const MODULES: ModuleShortcut[] = [
  { labelKey: "nav.nonConformities", icon: AlertTriangle,  route: "/non-conformities", colorVar: "--module-nc" },
  { labelKey: "nav.ppiInstances",    icon: ClipboardCheck,  route: "/ppi",              colorVar: "--module-plans" },
  { labelKey: "nav.tests",           icon: FlaskConical,    route: "/tests",            colorVar: "--module-tests" },
  { labelKey: "nav.documents",       icon: FileText,        route: "/documents",        colorVar: "--module-documents" },
  { labelKey: "nav.materials",       icon: Package,         route: "/materials",         colorVar: "--module-suppliers" },
  { labelKey: "nav.topography",      icon: Crosshair,       route: "/topography",       colorVar: "--module-projects" },
  { labelKey: "nav.suppliers",       icon: Users,           route: "/suppliers",         colorVar: "--module-subcontractors" },
  { labelKey: "nav.planning",        icon: FolderKanban,    route: "/planning",          colorVar: "--chart-1" },
];

export function ModuleShortcuts() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        return (
          <button
            key={mod.route}
            onClick={() => navigate(mod.route)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-3",
              "bg-card border border-transparent shadow-card",
              "hover:shadow-card-hover hover:border-border",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {/* Icon container with subtle colored background */}
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-transform duration-200 group-hover:scale-110"
              style={{
                backgroundColor: `hsl(var(${mod.colorVar}) / 0.08)`,
              }}
            >
              <Icon
                className="h-4 w-4 transition-colors"
                style={{ color: `hsl(var(${mod.colorVar}))` }}
              />
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground text-center leading-tight line-clamp-2 group-hover:text-foreground transition-colors">
              {t(mod.labelKey)}
            </span>
            {/* Hover arrow indicator */}
            <ArrowUpRight
              className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all"
            />
          </button>
        );
      })}
    </div>
  );
}
