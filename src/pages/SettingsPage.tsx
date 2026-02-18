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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";

// ── Module color map (kept consistent with Dashboard) ────────────────────────
const MOD = {
  documents: "hsl(215, 70%, 38%)",
  tests:     "hsl(252, 55%, 45%)",
  nc:        "hsl(2, 60%, 44%)",
  suppliers: "hsl(158, 45%, 32%)",
  plans:     "hsl(188, 55%, 32%)",
  projects:  "hsl(221, 50%, 40%)",
  muted:     "hsl(215, 15%, 65%)",
} as const;

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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[13px] font-bold tracking-tight text-foreground">{title}</CardTitle>
              {badge && (
                <span className="inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide border"
                  style={{ color, borderColor: `${color}30`, background: `${color}0e` }}>
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        {children}
      </CardContent>
    </Card>
  );
}

// ── Settings row item ─────────────────────────────────────────────────────────
function SettingsRow({
  label, description, value, icon: Icon, comingSoon = false,
}: {
  label: string; description?: string; value?: string;
  icon?: React.ElementType; comingSoon?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-3 border-b border-border/50 last:border-0",
      comingSoon ? "opacity-50" : "hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150 cursor-default"
    )}>
      {Icon && (
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-foreground leading-none">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {comingSoon ? (
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full border border-border text-muted-foreground">
            Em breve
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

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin:     { label: "Super Admin",     color: MOD.nc },
  tenant_admin:    { label: "Admin",           color: MOD.documents },
  project_manager: { label: "Project Manager", color: MOD.plans },
  quality_manager: { label: "Quality Manager", color: MOD.suppliers },
  technician:      { label: "Técnico",         color: MOD.tests },
  viewer:          { label: "Viewer",          color: MOD.muted },
};

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const userEmail = user?.email ?? "—";
  const userRole  = (user as any)?.role ?? "viewer";
  const roleMeta  = ROLE_META[userRole] ?? { label: userRole, color: MOD.muted };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Sistema
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
            v0.1 MVP
          </span>
        </div>
      </div>

      {/* ── 1. Configurações do Projeto ──────────────────────────────── */}
      <SettingsSection
        icon={Building2}
        title="Configurações do Projeto"
        subtitle="Dados do projeto ativo e configurações gerais"
        color={MOD.projects}
        badge={activeProject ? "Ativo" : undefined}
      >
        <SettingsRow
          label="Projeto ativo"
          description={activeProject?.name ?? "Nenhum projeto selecionado"}
          value={activeProject?.code}
          icon={Building2}
        />
        <SettingsRow
          label="Localização"
          description={activeProject?.location ?? "—"}
          icon={Globe}
          comingSoon
        />
        <SettingsRow
          label="Notificações do projeto"
          description="Alertas de NC, ensaios e documentos"
          icon={Bell}
          comingSoon
        />
        <SettingsRow
          label="Exportar dados do projeto"
          description="Exportar registos em CSV / PDF"
          icon={Database}
          comingSoon
        />
      </SettingsSection>

      {/* ── 2. Perfil de Utilizador ──────────────────────────────────── */}
      <SettingsSection
        icon={UserCheck}
        title="Perfil de Utilizador"
        subtitle="A sua conta e credenciais de acesso"
        color={MOD.documents}
      >
        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold flex-shrink-0"
            style={{ background: `${MOD.documents}18`, color: MOD.documents, border: `1px solid ${MOD.documents}28` }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold text-foreground leading-none">{userEmail}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide border"
                style={{ color: roleMeta.color, borderColor: `${roleMeta.color}30`, background: `${roleMeta.color}0e` }}>
                {roleMeta.label}
              </span>
            </div>
          </div>
        </div>
        <SettingsRow
          label="Alterar e-mail"
          description="Atualizar o endereço de e-mail da conta"
          icon={Mail}
          comingSoon
        />
        <SettingsRow
          label="Alterar password"
          description="Atualizar credenciais de acesso"
          icon={Key}
          comingSoon
        />
      </SettingsSection>

      {/* ── 3. Gestão de Utilizadores ────────────────────────────────── */}
      <SettingsSection
        icon={Users}
        title="Gestão de Utilizadores"
        subtitle="Membros da equipa e convites"
        color={MOD.plans}
      >
        <SettingsRow
          label="Convidar utilizador"
          description="Enviar convite por e-mail para a plataforma"
          icon={Mail}
          comingSoon
        />
        <SettingsRow
          label="Lista de membros"
          description="Gerir utilizadores e acessos por projeto"
          icon={Users}
          comingSoon
        />
        <SettingsRow
          label="Remover acesso"
          description="Revogar acesso de um membro"
          icon={Lock}
          comingSoon
        />
      </SettingsSection>

      {/* ── 4. Perfis e Permissões ───────────────────────────────────── */}
      <SettingsSection
        icon={ShieldCheck}
        title="Perfis e Permissões"
        subtitle="Controlo de acesso baseado em funções (RBAC)"
        color={MOD.suppliers}
      >
        {/* Role reference table */}
        <div className="space-y-1.5 pt-1">
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border w-[110px] justify-center"
                style={{ color: meta.color, borderColor: `${meta.color}30`, background: `${meta.color}0e` }}>
                {meta.label}
              </span>
              <p className="text-[11.5px] text-muted-foreground leading-snug flex-1">
                {key === "super_admin"     && "Acesso total à plataforma e todos os tenants"}
                {key === "tenant_admin"    && "Gestão completa da organização"}
                {key === "project_manager" && "Gestão completa do projeto atribuído"}
                {key === "quality_manager" && "Gestão documental, ensaios e NCs"}
                {key === "technician"      && "Registo de ensaios e consulta de documentos"}
                {key === "viewer"          && "Leitura apenas, sem permissão de escrita"}
              </p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── 5. Preferências ──────────────────────────────────────────── */}
      <SettingsSection
        icon={Sliders}
        title="Preferências"
        subtitle="Configurações da interface e localização"
        color={MOD.tests}
      >
        <SettingsRow
          label="Idioma"
          description="Língua da interface"
          value="Português"
          icon={Globe}
          comingSoon
        />
        <SettingsRow
          label="Fuso horário"
          description="Ajustar hora local"
          icon={Sliders}
          comingSoon
        />
        <SettingsRow
          label="Tema"
          description="Modo claro / escuro"
          icon={Settings}
          comingSoon
        />
      </SettingsSection>

    </div>
  );
}
