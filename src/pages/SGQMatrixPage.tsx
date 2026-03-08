import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, AlertCircle, Circle, ExternalLink, ShieldCheck,
  FileText, FlaskConical, ClipboardCheck, AlertTriangle, Truck,
  Package, HardHat, Construction, Crosshair, ClipboardList,
  BookOpen, CalendarClock, BarChart3, Leaf, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── SGQ Requirements Matrix ─────────────────────────────────────────────────

type CoverageLevel = "full" | "partial" | "planned" | "external";

interface SGQRequirement {
  chapter: string;
  requirement: string;
  atlasModule: string;
  route: string;
  icon: React.ElementType;
  coverage: CoverageLevel;
  details: string;
  registryTypes?: string[];
}

const SGQ_REQUIREMENTS: SGQRequirement[] = [
  // ─── 1. Organização e Gestão ──────────────────────────────────
  {
    chapter: "1",
    requirement: "Organograma / Equipas",
    atlasModule: "Definições do Projeto",
    route: "/settings",
    icon: ShieldCheck,
    coverage: "full",
    details: "Membros do projeto com papéis (Admin, Engenheiro, Inspector, Viewer). Gestão na página de Definições.",
  },
  // ─── 2. Controlo Documental ────────────────────────────────────
  {
    chapter: "2",
    requirement: "Controlo de Documentos (distribuição, revisões, aprovações)",
    atlasModule: "Documentos",
    route: "/documents",
    icon: FileText,
    coverage: "full",
    details: "Workflow draft→review→approved. Versões sequenciais, LinkedDocumentsPanel, exportação PDF com capa.",
    registryTypes: ["DOC", "FORM"],
  },
  {
    chapter: "2.1",
    requirement: "Planos Técnicos de Obra (MS, PIE, PQO, Planos de Topografia)",
    atlasModule: "Planos",
    route: "/plans",
    icon: BookOpen,
    coverage: "full",
    details: "Repositório auditável com tipos: MS, PlanEsc, PlanBet, PlanMont, PlanTraf, PlanSeg, PlanTopo, PlanEns, PlanInsp, PlanAmb, PlanQual.",
    registryTypes: ["MS", "PlanTopo", "PlanEns", "PlanInsp", "PlanQual"],
  },
  // ─── 3. Controlo de Processos ─────────────────────────────────
  {
    chapter: "3",
    requirement: "Planeamento de Obra (WBS, faseamento, cronograma)",
    atlasModule: "Planeamento",
    route: "/planning",
    icon: CalendarClock,
    coverage: "full",
    details: "WBS hierárquico, atividades ligadas a Work Items e Subempreiteiros. Motor de prontidão com bloqueios automáticos.",
  },
  {
    chapter: "3.1",
    requirement: "Work Items / Frentes de Obra (stationing PK)",
    atlasModule: "Atividades",
    route: "/work-items",
    icon: Construction,
    coverage: "full",
    details: "Sector + Obra + Parte + Disciplina, pk_inicio/pk_fim. Readiness Engine: blocked se NC aberta, PPI pendente ou ensaio em curso.",
  },
  // ─── 4. Inspeção e Ensaio ─────────────────────────────────────
  {
    chapter: "4",
    requirement: "Planos de Inspeção e Ensaio (PIE/PPI)",
    atlasModule: "Inspeções PPI",
    route: "/ppi",
    icon: ClipboardCheck,
    coverage: "full",
    details: "Templates reutilizáveis por disciplina. Instâncias com checklists, resultados pass/fail/na, criação automática de NC em itens fail.",
    registryTypes: ["PPI Instance", "PPI Template"],
  },
  {
    chapter: "4.1",
    requirement: "Ensaios Laboratoriais e In-Situ",
    atlasModule: "Ensaios",
    route: "/tests",
    icon: FlaskConical,
    coverage: "full",
    details: "Catálogo de ensaios, resultados com workflow (draft→approved), pass/fail, rastreabilidade a work item e fornecedor.",
    registryTypes: ["Test Result"],
  },
  {
    chapter: "4.2",
    requirement: "Laboratórios (acreditação, âmbito)",
    atlasModule: "Laboratórios",
    route: "/laboratories",
    icon: Building2,
    coverage: "full",
    details: "Registo de laboratórios com código de acreditação, entidade, âmbito e contactos.",
  },
  // ─── 5. Não Conformidades ─────────────────────────────────────
  {
    chapter: "5",
    requirement: "Registo e Tratamento de NC (RNC)",
    atlasModule: "Não Conformidades",
    route: "/non-conformities",
    icon: AlertTriangle,
    coverage: "full",
    details: "Codificação RNC-PF17A-NNN. Workflow open→in_progress→pending_verification→closed. Ações corretivas, verificação de eficácia.",
    registryTypes: ["RNC"],
  },
  // ─── 6. Materiais e Aprovação ─────────────────────────────────
  {
    chapter: "6",
    requirement: "Aprovação de Materiais (PAME)",
    atlasModule: "Materiais",
    route: "/materials",
    icon: Package,
    coverage: "full",
    details: "Fichas PAME com workflow de aprovação, lotes com receção, marcação CE, rastreabilidade a fornecedor e ensaios.",
    registryTypes: ["PAME", "Material Lot"],
  },
  {
    chapter: "6.1",
    requirement: "Gestão de Fornecedores (avaliação, qualificação)",
    atlasModule: "Fornecedores",
    route: "/suppliers",
    icon: Truck,
    coverage: "full",
    details: "Cadastro com NIF, avaliação ponderada (qualidade, prazos, NCs, cooperação SGQ), documentos com validade.",
  },
  // ─── 7. Subempreiteiros ───────────────────────────────────────
  {
    chapter: "7",
    requirement: "Gestão de Subempreiteiros (docs, validade, seguro)",
    atlasModule: "Subempreiteiros",
    route: "/subcontractors",
    icon: HardHat,
    coverage: "full",
    details: "Documentos obrigatórios com validade, bloqueio automático de atribuição se documentação expirada.",
  },
  // ─── 8. Topografia e Controlo Geométrico ──────────────────────
  {
    chapter: "8",
    requirement: "Controlo Topográfico e Geométrico",
    atlasModule: "Medições & Equipamentos",
    route: "/topography",
    icon: Crosshair,
    coverage: "full",
    details: "Levantamentos, equipamentos com calibração, pedidos e controlo geométrico. Bloqueio por calibração expirada.",
    registryTypes: ["Survey", "Equipment", "Control"],
  },
  // ─── 9. Relatórios Diários ────────────────────────────────────
  {
    chapter: "9",
    requirement: "Partes Diárias de Obra (RDO)",
    atlasModule: "Parte Diária",
    route: "/daily-reports",
    icon: ClipboardList,
    coverage: "full",
    details: "Mão-de-obra, equipamentos, materiais, RMM, resíduos, condições meteorológicas, assinaturas.",
    registryTypes: ["Daily Report"],
  },
  // ─── 10. Ambiente e Resíduos ──────────────────────────────────
  {
    chapter: "10",
    requirement: "PPGRCD — Gestão de Resíduos e Materiais Reciclados",
    atlasModule: "Reciclados / PPGRCD",
    route: "/recycled-materials",
    icon: Leaf,
    coverage: "full",
    details: "FAM, PAP, BAM com percentagens de reciclagem, certificados e rastreabilidade por lote.",
  },
  // ─── 11. Escritório Técnico ───────────────────────────────────
  {
    chapter: "11",
    requirement: "Pedidos de Informação (RFI) e Submittals",
    atlasModule: "Escritório Técnico",
    route: "/technical-office",
    icon: FileText,
    coverage: "full",
    details: "RFI codificados (RFI-PF17A-NNN), submittals e clarificações com workflow de aprovação.",
    registryTypes: ["RFI", "Submittal"],
  },
  // ─── 12. Auditorias ───────────────────────────────────────────
  {
    chapter: "12",
    requirement: "Auditorias Internas e Externas",
    atlasModule: "Auditorias",
    route: "/audits",
    icon: ShieldCheck,
    coverage: "full",
    details: "Registo de auditorias com tipo (interna/externa/fiscalização), equipa, constatações e ligação a NC.",
  },
  // ─── 13. Rastreabilidade ──────────────────────────────────────
  {
    chapter: "13",
    requirement: "Rastreabilidade e Audit Trail",
    atlasModule: "Registo de Auditoria",
    route: "/audit",
    icon: BarChart3,
    coverage: "full",
    details: "Todas as ações (INSERT, UPDATE, STATUS_CHANGE, DELETE) são registadas automaticamente com diff, user_id e timestamp.",
  },
  // ─── 14. Segurança e Saúde ────────────────────────────────────
  {
    chapter: "14",
    requirement: "PSS — Plano de Segurança e Saúde",
    atlasModule: "Documentos / Planos",
    route: "/plans",
    icon: BookOpen,
    coverage: "partial",
    details: "Registável como documento ou plano (PlanSeg), sem workflow específico de SST. Gestão documental completa.",
  },
  // ─── 15. Comunicações Formais ─────────────────────────────────
  {
    chapter: "15",
    requirement: "Correspondência Formal com Dono de Obra",
    atlasModule: "RFI (parcial)",
    route: "/technical-office",
    icon: FileText,
    coverage: "partial",
    details: "RFIs cobrem pedidos de informação. Correspondência formal genérica pode ser registada como documentos.",
  },
  // ─── 16. Volumes do Projeto de Execução ───────────────────────
  {
    chapter: "V00",
    requirement: "Vol. 00 — Cartografia / Topografia (MDJ, peças desenhadas)",
    atlasModule: "Documentos + Topografia",
    route: "/documents",
    icon: Crosshair,
    coverage: "full",
    details: "MDJ e peças desenhadas registáveis como documentos tipo MDJ/Drawing com disciplina Topografia. Perfis transversais e cartografia.",
    registryTypes: ["MDJ", "Drawing"],
  },
  {
    chapter: "V01.1",
    requirement: "Vol. 01.01 — Terraplenagem e Via (MDJ, MED, CTE, DPU)",
    atlasModule: "Documentos",
    route: "/documents",
    icon: Construction,
    coverage: "full",
    details: "Peças escritas (MDJ, Medições, CTE, DPU) e desenhadas registáveis como documentos com disciplina Terraplenagem.",
    registryTypes: ["MDJ", "MED", "CTE", "DPU"],
  },
  {
    chapter: "V01.2",
    requirement: "Vol. 01.02 — Drenagem (MDJ, MED, CTE, DPU)",
    atlasModule: "Documentos",
    route: "/documents",
    icon: Construction,
    coverage: "full",
    details: "Bacias hidrográficas, perfis longitudinais, passagens hidráulicas e pormenores de drenagem.",
    registryTypes: ["MDJ", "MED", "CTE", "DPU", "Drawing"],
  },
  {
    chapter: "V01.6",
    requirement: "Vol. 01.06 — Restabelecimentos, Serventias e Caminhos Paralelos",
    atlasModule: "Documentos",
    route: "/documents",
    icon: Construction,
    coverage: "full",
    details: "Restabelecimentos rodoviários (PK 31+175, etc.), rotundas, ramos, perfis longitudinais e transversais.",
    registryTypes: ["MDJ", "MED", "CTE", "DPU", "Drawing"],
  },
  {
    chapter: "V01.7",
    requirement: "Vol. 01.07 — Geologia e Geotecnia (EGT)",
    atlasModule: "Documentos",
    route: "/documents",
    icon: Construction,
    coverage: "full",
    details: "Estudo Geológico e Geotécnico, cartas geológicas, perfis longitudinais por trecho (CACHOFARRA, SADOPORT, TOPO T1).",
    registryTypes: ["EGT", "Drawing"],
  },
  {
    chapter: "V01.8",
    requirement: "Vol. 01.08 — Muros de Suporte (MDJ, MED, CTE, DPU)",
    atlasModule: "Documentos",
    route: "/documents",
    icon: Construction,
    coverage: "full",
    details: "Muros M31.1, M31.2, M31.3, M32.1 — plantas, alçados, secções tipo com geometria e armaduras.",
    registryTypes: ["MDJ", "MED", "CTE", "DPU", "Drawing"],
  },
];

// ─── Coverage helpers ────────────────────────────────────────────────────────

const COVERAGE_CONFIG: Record<CoverageLevel, { label: string; icon: React.ElementType; className: string }> = {
  full:     { label: "Cobertura Total",   icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10" },
  partial:  { label: "Cobertura Parcial", icon: AlertCircle,  className: "text-amber-600 bg-amber-500/10" },
  planned:  { label: "Planeado",          icon: Circle,       className: "text-blue-500 bg-blue-500/10" },
  external: { label: "Externo ao SGQ",    icon: Circle,       className: "text-muted-foreground bg-muted" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SGQMatrixPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = SGQ_REQUIREMENTS.length;
    const full = SGQ_REQUIREMENTS.filter(r => r.coverage === "full").length;
    const partial = SGQ_REQUIREMENTS.filter(r => r.coverage === "partial").length;
    const pct = Math.round(((full + partial * 0.5) / total) * 100);
    return { total, full, partial, pct };
  }, []);

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Matriz de Conformidade SGQ
        </h1>
        <p className="text-sm text-muted-foreground">
          Mapeamento dos requisitos do Plano de Qualidade aos módulos do Atlas QMS — {activeProject.name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Requisitos Totais</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <p className="text-xs">Cobertura Total</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.full}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <p className="text-xs">Cobertura Parcial</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Índice de Cobertura</p>
            <p className="text-2xl font-bold text-foreground">{stats.pct}%</p>
            <Progress value={stats.pct} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Capítulos do Plano de Qualidade vs. Módulos Atlas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">Cap.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requisito PQ</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Módulo Atlas</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Cobertura</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {SGQ_REQUIREMENTS.map((req, idx) => {
                  const coverageCfg = COVERAGE_CONFIG[req.coverage];
                  const Icon = req.icon;
                  return (
                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                        {req.chapter}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {req.requirement}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{req.atlasModule}</span>
                        </div>
                        {req.registryTypes && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {req.registryTypes.map(rt => (
                              <Badge key={rt} variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                                {rt}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs gap-1", coverageCfg.className)}
                        >
                          <coverageCfg.icon className="h-3 w-3" />
                          {coverageCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                        {req.details}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(req.route)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(COVERAGE_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <Badge variant="secondary" className={cn("text-[10px] gap-1 px-1.5", cfg.className)}>
              <cfg.icon className="h-2.5 w-2.5" />
              {cfg.label}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
