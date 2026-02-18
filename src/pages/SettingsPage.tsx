import { useTranslation } from "react-i18next";
import {
  Settings,
  Users,
  ShieldCheck,
  Sliders,
  Globe,
  Bell,
  Lock,
  Building2,
  Mail,
  UserCheck,
  Key,
  Database,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Module color map (semantic tokens, no direct colors in JSX) ───────────────
const MOD = {
  documents:     "hsl(215, 70%, 38%)",
  tests:         "hsl(252, 55%, 45%)",
  nc:            "hsl(2, 60%, 44%)",
  suppliers:     "hsl(158, 45%, 32%)",
  plans:         "hsl(188, 55%, 32%)",
  projects:      "hsl(221, 50%, 40%)",
  muted:         "hsl(215, 15%, 65%)",
} as const;

// Role → color mapping (no labels here — labels come from i18n)
const ROLE_COLOR: Record<string, string> = {
  super_admin:     MOD.nc,
  tenant_admin:    MOD.documents,
  project_manager: MOD.plans,
  quality_manager: MOD.suppliers,
  technician:      MOD.tests,
  viewer:          MOD.muted,
};

// Role display labels — only non-translated ones stay (proper nouns)
const ROLE_LABELS: Record<string, string> = {
  super_admin:     "Super Admin",
  tenant_admin:    "Admin",
  project_manager: "Project Manager",
  quality_manager: "Quality Manager",
};

// ── Section block ─────────────────────────────────────────────────────────────
interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  badge?: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, subtitle, color, badge, children }: SettingsSectionProps) {
  return (
    <Card className="border bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: `${color}14`, border: `1px solid ${color}22` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[13px] font-bold tracking-tight text-foreground">{title}</CardTitle>
              {badge && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide border"
                  style={{ color, borderColor: `${color}30`, background: `${color}0e` }}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">{children}</CardContent>
    </Card>
  );
}

// ── Settings row item ─────────────────────────────────────────────────────────
function SettingsRow({
  label,
  description,
  value,
  icon: Icon,
  comingSoon = false,
  comingSoonLabel,
}: {
  label: string;
  description?: string;
  value?: string;
  icon?: React.ElementType;
  comingSoon?: boolean;
  comingSoonLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b border-border/50 last:border-0",
        comingSoon
          ? "opacity-50"
          : "hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150 cursor-default"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-foreground leading-none">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {comingSoon ? (
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full border border-border text-muted-foreground">
            {comingSoonLabel}
          </span>
        ) : (
          <>
            {value && <span className="text-[11px] text-muted-foreground">{value}</span>}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const userEmail = user?.email ?? "—";
  const userRole  = (user as any)?.role ?? "viewer";
  const roleColor = ROLE_COLOR[userRole] ?? MOD.muted;

  // Role label: proper nouns stay as-is; translated roles use i18n
  const roleLabel =
    ROLE_LABELS[userRole] ??
    (userRole === "technician" || userRole === "viewer"
      ? t(`pages.settings.roles.${userRole}`, userRole)
      : userRole);

  const cs = t("pages.settings.comingSoon");
  const s  = (key: string) => t(`pages.settings.sections.${key}`);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("pages.settings.system")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-none">
            {t("pages.settings.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("pages.settings.subtitle")}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card shadow-card px-4 py-2.5">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("pages.settings.version")}
          </span>
        </div>
      </div>

      {/* ── 1. Project Settings ──────────────────────────────────────── */}
      <SettingsSection
        icon={Building2}
        title={s("project.title")}
        subtitle={s("project.subtitle")}
        color={MOD.projects}
        badge={activeProject ? s("project.badgeActive") : undefined}
      >
        <SettingsRow
          label={s("project.activeProject")}
          description={activeProject?.name ?? s("project.noProject")}
          value={activeProject?.code}
          icon={Building2}
        />
        <SettingsRow
          label={s("project.location")}
          description={activeProject?.location ?? "—"}
          icon={Globe}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("project.notifications")}
          description={s("project.notificationsDesc")}
          icon={Bell}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("project.exportData")}
          description={s("project.exportDataDesc")}
          icon={Database}
          comingSoon
          comingSoonLabel={cs}
        />
      </SettingsSection>

      {/* ── 2. User Profile ──────────────────────────────────────────── */}
      <SettingsSection
        icon={UserCheck}
        title={s("profile.title")}
        subtitle={s("profile.subtitle")}
        color={MOD.documents}
      >
        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold flex-shrink-0"
            style={{
              background: `${MOD.documents}18`,
              color: MOD.documents,
              border: `1px solid ${MOD.documents}28`,
            }}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold text-foreground leading-none">{userEmail}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide border"
                style={{
                  color: roleColor,
                  borderColor: `${roleColor}30`,
                  background: `${roleColor}0e`,
                }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
        <SettingsRow
          label={s("profile.changeEmail")}
          description={s("profile.changeEmailDesc")}
          icon={Mail}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("profile.changePassword")}
          description={s("profile.changePasswordDesc")}
          icon={Key}
          comingSoon
          comingSoonLabel={cs}
        />
      </SettingsSection>

      {/* ── 3. User Management ───────────────────────────────────────── */}
      <SettingsSection
        icon={Users}
        title={s("users.title")}
        subtitle={s("users.subtitle")}
        color={MOD.plans}
      >
        <SettingsRow
          label={s("users.invite")}
          description={s("users.inviteDesc")}
          icon={Mail}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("users.members")}
          description={s("users.membersDesc")}
          icon={Users}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("users.removeAccess")}
          description={s("users.removeAccessDesc")}
          icon={Lock}
          comingSoon
          comingSoonLabel={cs}
        />
      </SettingsSection>

      {/* ── 4. Profiles & Permissions ────────────────────────────────── */}
      <SettingsSection
        icon={ShieldCheck}
        title={s("permissions.title")}
        subtitle={s("permissions.subtitle")}
        color={MOD.suppliers}
      >
        <div className="space-y-1.5 pt-1">
          {(Object.entries(ROLE_COLOR) as [string, string][]).map(([key, color]) => {
            const label =
              ROLE_LABELS[key] ??
              (key === "technician" || key === "viewer"
                ? t(`pages.settings.roles.${key}`, key)
                : key);
            return (
              <div key={key} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border w-[110px] justify-center"
                  style={{ color, borderColor: `${color}30`, background: `${color}0e` }}
                >
                  {label}
                </span>
                <p className="text-[11.5px] text-muted-foreground leading-snug flex-1">
                  {t(`pages.settings.sections.permissions.roles.${key}`)}
                </p>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── 5. Preferences ───────────────────────────────────────────── */}
      <SettingsSection
        icon={Sliders}
        title={s("preferences.title")}
        subtitle={s("preferences.subtitle")}
        color={MOD.tests}
      >
        <SettingsRow
          label={s("preferences.language")}
          description={s("preferences.languageDesc")}
          value={s("preferences.languageValue")}
          icon={Globe}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("preferences.timezone")}
          description={s("preferences.timezoneDesc")}
          icon={Sliders}
          comingSoon
          comingSoonLabel={cs}
        />
        <SettingsRow
          label={s("preferences.theme")}
          description={s("preferences.themeDesc")}
          icon={Settings}
          comingSoon
          comingSoonLabel={cs}
        />
      </SettingsSection>

    </div>
  );
}
