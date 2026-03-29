import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { memberService, type ProjectMember } from "@/lib/services/memberService";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Download, Building2, ShieldCheck, Wrench, Eye, UserCheck, HardHat, Crosshair, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";
import { signatureBlockHtml } from "@/lib/services/pdfSignatureBlocks";
import jsPDF from "jspdf";

const ROLE_META: Record<string, { labelKey: string; color: string; icon: React.ElementType; level: number }> = {
  admin:            { labelKey: "orgChart.roles.admin",            color: "hsl(2, 60%, 44%)",    icon: Building2,    level: 0 },
  project_manager:  { labelKey: "orgChart.roles.project_manager",  color: "hsl(215, 70%, 38%)",  icon: UserCheck,    level: 1 },
  quality_manager:  { labelKey: "orgChart.roles.quality_manager",  color: "hsl(158, 45%, 32%)",  icon: ShieldCheck,  level: 1 },
  quality_tech:     { labelKey: "orgChart.roles.quality_tech",     color: "hsl(252, 55%, 45%)",  icon: FlaskConical, level: 2 },
  site_manager:     { labelKey: "orgChart.roles.site_manager",     color: "hsl(32, 70%, 45%)",   icon: HardHat,      level: 2 },
  lab_tech:         { labelKey: "orgChart.roles.lab_tech",         color: "hsl(188, 55%, 32%)",  icon: FlaskConical, level: 2 },
  surveyor:         { labelKey: "orgChart.roles.surveyor",         color: "hsl(280, 50%, 45%)",  icon: Crosshair,    level: 2 },
  inspector:        { labelKey: "orgChart.roles.inspector",        color: "hsl(45, 70%, 45%)",   icon: Eye,          level: 2 },
  technician:       { labelKey: "orgChart.roles.technician",       color: "hsl(200, 50%, 40%)",  icon: Wrench,       level: 2 },
  viewer:           { labelKey: "orgChart.roles.viewer",           color: "hsl(215, 15%, 55%)",  icon: Eye,          level: 3 },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] ?? { labelKey: role, color: "hsl(215,15%,55%)", icon: Users, level: 3 };
}

export default function OrgChartPage() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { logoBase64 } = useProjectLogo();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    memberService.getMembers(activeProject.id)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [activeProject?.id]);

  if (!activeProject) return <NoProjectBanner />;

  // Group by level
  const grouped = members.reduce<Record<number, (ProjectMember & { meta: ReturnType<typeof getRoleMeta> })[]>>((acc, m) => {
    const meta = getRoleMeta(m.role);
    const lvl = meta.level;
    if (!acc[lvl]) acc[lvl] = [];
    acc[lvl].push({ ...m, meta });
    return acc;
  }, {});

  const levels = Object.keys(grouped).map(Number).sort();

  const levelLabels: Record<number, string> = {
    0: t("orgChart.levels.direction"),
    1: t("orgChart.levels.coordination"),
    2: t("orgChart.levels.technical"),
    3: t("orgChart.levels.observers"),
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const projectName = `${activeProject.code} — ${activeProject.name}`;
    const date = new Date().toLocaleDateString("pt-PT");

    let html = `<html><head><style>
      body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 20px; }
      .level { margin-bottom: 18px; }
      .level-title { font-size: 12px; font-weight: 800; color: #192F48; border-bottom: 2px solid #192F48; padding-bottom: 3px; margin-bottom: 8px; }
      .members { display: flex; flex-wrap: wrap; gap: 10px; }
      .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; min-width: 160px; }
      .card-name { font-weight: 700; font-size: 10px; }
      .card-role { font-size: 9px; color: #6B7280; margin-top: 2px; }
      .card-email { font-size: 8px; color: #9CA3AF; margin-top: 1px; }
    </style></head><body>`;

    html += fullPdfHeader(logoBase64, projectName, "ORG-" + activeProject.code, "0", date);
    html += `<h2 style="text-align:center;font-size:14px;color:#192F48;margin:12px 0;">ORGANIGRAMA DE OBRA</h2>`;

    for (const lvl of levels) {
      const label = isEs ? levelLabels[lvl]?.es : levelLabels[lvl]?.pt;
      html += `<div class="level"><div class="level-title">${label ?? `Nível ${lvl}`}</div><div class="members">`;
      for (const m of grouped[lvl]) {
        const name = m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8);
        const roleLabel = isEs ? m.meta.labelEs : m.meta.label;
        html += `<div class="card"><div class="card-name">${name}</div><div class="card-role">${roleLabel}</div>${m.profile?.email ? `<div class="card-email">${m.profile.email}</div>` : ""}</div>`;
      }
      html += `</div></div>`;
    }

    html += signatureBlockHtml();
    html += `</body></html>`;

    doc.html(html, {
      callback: (d) => d.save(`Organigrama_${activeProject.code}.pdf`),
      x: 10, y: 5, width: 270, windowWidth: 900,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEs ? "Organigrama de Obra" : "Organigrama de Obra"}
        subtitle={isEs ? "Estructura organizativa del proyecto" : "Estrutura organizativa do projeto"}
        icon={Users}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1.5" />PDF
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-8">
          {levels.map((lvl) => {
            const label = isEs ? levelLabels[lvl]?.es : levelLabels[lvl]?.pt;
            return (
              <div key={lvl}>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full bg-primary" />
                  {label ?? `Nível ${lvl}`}
                  <Badge variant="secondary" className="ml-1 text-[10px]">{grouped[lvl].length}</Badge>
                </h3>
                <div className={cn(
                  "grid gap-3",
                  lvl === 0 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
                  lvl === 1 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" :
                  "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                )}>
                  {grouped[lvl].map((m) => {
                    const Icon = m.meta.icon;
                    const name = m.profile?.full_name || m.profile?.email?.split("@")[0] || "—";
                    const roleLabel = isEs ? m.meta.labelEs : m.meta.label;
                    return (
                      <Card key={m.user_id} className="group border bg-card hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                            style={{ background: `${m.meta.color}14`, border: `1px solid ${m.meta.color}22` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: m.meta.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
                            {m.profile?.email && (
                              <p className="text-[10px] text-muted-foreground/70 truncate mt-1">{m.profile.email}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Connecting line between levels */}
                {lvl < Math.max(...levels) && (
                  <div className="flex justify-center my-4">
                    <div className="w-px h-8 bg-border" />
                  </div>
                )}
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="text-center text-muted-foreground py-12 text-sm">
              {isEs ? "Sin miembros en el proyecto" : "Sem membros no projeto"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
