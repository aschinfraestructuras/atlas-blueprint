/**
 * Technical Dossier Tab — Material Detail Page
 * Aggregated read-only view of all quality documentation for a material:
 * certificates, lots, tests, PPI references, supplier docs, approval status.
 */
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, FileText, FlaskConical,
  Layers, ShieldCheck, AlertTriangle, Package,
} from "lucide-react";

interface DossierProps {
  material: {
    id: string;
    code: string;
    name: string;
    category: string;
    status: string;
    pame_status: string | null;
    pame_code: string | null;
    approval_status: string;
    approval_required: boolean;
    normative_refs: string | null;
    acceptance_criteria: string | null;
    specification: string | null;
  };
  lots: Array<{
    id: string;
    lot_code: string;
    reception_date: string;
    reception_status: string;
    ce_marking_ok: boolean | null;
    delivery_note_ref: string | null;
    suppliers?: { name: string | null } | null;
  }>;
  tests: Array<{
    id: string;
    code: string;
    date: string;
    status: string;
    pass_fail: string | null;
    sample_ref: string | null;
  }>;
  docs: Array<{
    id: string;
    name: string;
    doc_type: string;
    status: string;
    valid_to?: string | null;
  }>;
  ncs: Array<{
    id: string;
    code: string;
    title: string;
    severity: string;
    status: string;
  }>;
}

const STATUS_ICON: Record<string, React.ElementType> = {
  approved: CheckCircle2,
  pass: CheckCircle2,
  rejected: XCircle,
  fail: XCircle,
  pending: Clock,
  quarantine: AlertTriangle,
};

const STATUS_COLOR: Record<string, string> = {
  approved: "text-chart-2",
  pass: "text-chart-2",
  rejected: "text-destructive",
  fail: "text-destructive",
  pending: "text-muted-foreground",
  quarantine: "text-accent-foreground",
  in_review: "text-primary",
  submitted: "text-accent-foreground",
};

function DossierItem({ label, value, icon: Icon, status }: {
  label: string; value: string | React.ReactNode; icon?: React.ElementType; status?: string;
}) {
  const StatusIcon = status ? STATUS_ICON[status] ?? Clock : null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground mt-0.5">{value}</div>
      </div>
      {StatusIcon && <StatusIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", STATUS_COLOR[status!] ?? "")} />}
    </div>
  );
}

export function TechnicalDossierTab({ material, lots, tests, docs, ncs }: DossierProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const lotsApproved = lots.filter(l => l.reception_status === "approved").length;
  const lotsQuarantine = lots.filter(l => l.reception_status === "quarantine").length;
  const testsPassed = tests.filter(tr => tr.pass_fail === "pass" || tr.status === "approved").length;
  const testsFailed = tests.filter(tr => tr.pass_fail === "fail").length;
  const ncsOpen = ncs.filter(nc => !["closed", "archived"].includes(nc.status)).length;
  const docsValid = docs.filter(d => d.status === "valid" || d.status === "approved").length;
  const docsExpired = docs.filter(d => d.valid_to && new Date(d.valid_to) < new Date()).length;

  // Fitness assessment
  const isFit = material.pame_status === "approved"
    && lotsQuarantine === 0
    && testsFailed === 0
    && ncsOpen === 0;

  return (
    <div className="space-y-4">
      {/* Fitness Banner */}
      <Card className={cn("border-0 shadow-card", isFit ? "bg-chart-2/5" : "bg-destructive/5")}>
        <CardContent className="p-4 flex items-center gap-3">
          {isFit ? (
            <CheckCircle2 className="h-6 w-6 text-chart-2 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold text-foreground">
              {isFit ? t("materials.dossier.fitForUse") : t("materials.dossier.notFitForUse")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isFit ? t("materials.dossier.fitDescription") : t("materials.dossier.notFitDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identification & Approval */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t("materials.dossier.identification")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DossierItem label={t("materials.dossier.pameCode")} value={material.pame_code ?? "—"} status={material.pame_status ?? "pending"} />
            <DossierItem label={t("materials.dossier.approvalStatus")} value={t(`materials.approval.statuses.${material.approval_status}`)} status={material.approval_status} />
            <DossierItem label={t("materials.dossier.specification")} value={material.specification ?? "—"} icon={FileText} />
            <DossierItem label={t("materials.dossier.normativeRefs")} value={material.normative_refs ?? "—"} icon={ShieldCheck} />
            <DossierItem label={t("materials.dossier.acceptanceCriteria")} value={material.acceptance_criteria ?? "—"} />
          </CardContent>
        </Card>

        {/* Reception & Lots Summary */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t("materials.dossier.receptionSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DossierItem label={t("materials.dossier.totalLots")} value={String(lots.length)} icon={Layers} />
            <DossierItem label={t("materials.dossier.lotsApproved")} value={String(lotsApproved)} status="approved" />
            <DossierItem label={t("materials.dossier.lotsQuarantine")} value={String(lotsQuarantine)} status={lotsQuarantine > 0 ? "quarantine" : "approved"} />
            <DossierItem
              label={t("materials.dossier.ceMarking")}
              value={lots.length > 0 ? `${lots.filter(l => l.ce_marking_ok).length}/${lots.length}` : "—"}
              status={lots.length > 0 && lots.every(l => l.ce_marking_ok) ? "approved" : lots.some(l => l.ce_marking_ok === false) ? "fail" : "pending"}
            />
          </CardContent>
        </Card>

        {/* Tests Summary */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              {t("materials.dossier.testsSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DossierItem label={t("materials.dossier.totalTests")} value={String(tests.length)} icon={FlaskConical} />
            <DossierItem label={t("materials.dossier.testsPassed")} value={String(testsPassed)} status="pass" />
            <DossierItem label={t("materials.dossier.testsFailed")} value={String(testsFailed)} status={testsFailed > 0 ? "fail" : "pass"} />
            {tests.slice(0, 3).map(tr => (
              <div key={tr.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <button className="text-xs font-mono text-primary hover:underline" onClick={() => navigate("/tests")}>
                  {tr.code}
                </button>
                <span className="text-[10px] text-muted-foreground">{new Date(tr.date).toLocaleDateString()}</span>
                <Badge variant="secondary" className={cn("text-[9px] ml-auto", tr.pass_fail === "pass" ? "bg-chart-2/15 text-chart-2" : tr.pass_fail === "fail" ? "bg-destructive/10 text-destructive" : "")}>
                  {tr.pass_fail ?? tr.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Documentation & NCs */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("materials.dossier.documentation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <DossierItem label={t("materials.dossier.docsValid")} value={String(docsValid)} status="approved" />
            <DossierItem label={t("materials.dossier.docsExpired")} value={String(docsExpired)} status={docsExpired > 0 ? "fail" : "approved"} />
            <DossierItem
              label={t("materials.dossier.openNCs")}
              value={String(ncsOpen)}
              icon={AlertTriangle}
              status={ncsOpen > 0 ? "fail" : "approved"}
            />
            {ncs.filter(nc => !["closed", "archived"].includes(nc.status)).slice(0, 3).map(nc => (
              <div key={nc.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <button className="text-xs font-mono text-primary hover:underline" onClick={() => navigate(`/non-conformities/${nc.id}`)}>
                  {nc.code}
                </button>
                <span className="text-[10px] text-muted-foreground truncate flex-1">{nc.title}</span>
                <Badge variant="secondary" className="text-[9px] bg-destructive/10 text-destructive">{nc.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
