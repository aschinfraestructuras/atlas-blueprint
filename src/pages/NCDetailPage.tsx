import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, AlertTriangle, Calendar, Clock, User, Tag, Pencil,
  CheckCircle2, XCircle, RotateCcw, Archive, ChevronDown, Loader2,
  FileText, Shield, Link2, ClipboardList,
} from "lucide-react";
import { ncService, type NonConformity } from "@/lib/services/ncService";
import { auditService, type AuditEntry } from "@/lib/services/auditService";
import { NCFormDialog } from "@/components/nc/NCFormDialog";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { cn } from "@/lib/utils";

// ─── Colour maps ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  minor:    "bg-muted text-muted-foreground border-border",
  major:    "bg-primary/10 text-primary border-primary/20",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  low:      "bg-muted text-muted-foreground border-border",
  medium:   "bg-primary/10 text-primary border-primary/20",
  high:     "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_COLORS: Record<string, string> = {
  draft:                "bg-muted/60 text-muted-foreground",
  open:                 "bg-destructive/10 text-destructive",
  in_progress:          "bg-primary/10 text-primary",
  pending_verification: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  closed:               "bg-green-500/10 text-green-700 dark:text-green-400",
  archived:             "bg-muted text-muted-foreground",
};

const ORIGIN_ICON: Record<string, typeof AlertTriangle> = {
  ppi:      ClipboardList,
  test:     FileText,
  document: FileText,
  audit:    Shield,
  manual:   AlertTriangle,
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:                ["open", "archived"],
  open:                 ["in_progress", "closed", "archived"],
  in_progress:          ["pending_verification", "open", "archived"],
  pending_verification: ["closed", "in_progress", "archived"],
  closed:               ["archived", "open"],
  archived:             ["open"],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground w-40 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span className={cn("text-sm text-foreground flex-1", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof AlertTriangle }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {children}
      </CardContent>
    </Card>
  );
}

function CapaField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-muted-foreground italic">—</p>
    </div>
  );
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NCDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [nc, setNc] = useState<NonConformity | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const loadNc = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ncService.getById(id);
      setNc(data);
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const loadLogs = useCallback(async () => {
    if (!activeProject || !id) return;
    setLogsLoading(true);
    try {
      const logs = await auditService.getByProject(activeProject.id, { module: "non_conformities" });
      setAuditLogs(logs.filter(l => l.entity_id === id));
    } catch {
      // non-critical
    } finally {
      setLogsLoading(false);
    }
  }, [activeProject, id]);

  useEffect(() => { loadNc(); loadLogs(); }, [loadNc, loadLogs]);

  const handleTransition = async (toStatus: string) => {
    if (!nc) return;
    setTransitioning(true);
    try {
      await ncService.updateStatus(nc.id, toStatus);
      toast({ title: t("nc.toast.statusChanged", { status: t(`nc.status.${toStatus}`) }) });
      loadNc();
      loadLogs();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!nc) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">{t("nc.detail.notFound")}</p>
    </div>
  );

  const transitions = ALLOWED_TRANSITIONS[nc.status] ?? [];
  const OriginIcon = ORIGIN_ICON[nc.origin] ?? AlertTriangle;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/non-conformities")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("pages.nonConformities.title")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              {nc.code ?? nc.reference ?? nc.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl line-clamp-2">
              {nc.title ?? nc.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {transitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={transitioning} className="gap-1.5">
                  {transitioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {t("nc.transitions.label")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                  {t("nc.transitions.changeTo")}
                </div>
                <DropdownMenuSeparator />
                {transitions.map(s => (
                  <DropdownMenuItem key={s} onClick={() => handleTransition(s)}>
                    {t(`nc.transitions.${s}`, { defaultValue: s })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <Badge className={cn("text-sm px-3 py-1", STATUS_COLORS[nc.status])}>
          {t(`nc.status.${nc.status}`, { defaultValue: nc.status })}
        </Badge>
        <Badge variant="outline" className={cn("text-sm px-3 py-1 border", SEVERITY_COLORS[nc.severity])}>
          {t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
          <OriginIcon className="h-3.5 w-3.5" />
          {t(`nc.origin.${nc.origin}`, { defaultValue: nc.origin })}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {t(`nc.category.${nc.category}`, { defaultValue: nc.category })}
          {nc.category === "outros" && nc.category_outro && ` — ${nc.category_outro}`}
        </Badge>
        {nc.due_date && (
          <div className={cn(
            "flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border",
            new Date(nc.due_date) < new Date() && nc.status !== "closed" && nc.status !== "archived"
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-muted text-muted-foreground border-border"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            {t("nc.detail.dueDate")}: {new Date(nc.due_date + "T00:00:00").toLocaleDateString()}
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {t("nc.detail.tabs.description")}
          </TabsTrigger>
          <TabsTrigger value="capa" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {t("nc.detail.tabs.capa")}
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            {t("nc.detail.tabs.attachments")}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("nc.detail.tabs.history")}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Descrição ──────────────────────────────────────────── */}
        <TabsContent value="description" className="mt-4 space-y-4">
          <SectionCard title={t("nc.detail.identification")} icon={AlertTriangle}>
            <InfoRow label={t("nc.table.code")} value={nc.code} mono />
            <InfoRow label={t("nc.form.title")} value={nc.title} />
            <InfoRow label={t("nc.form.description")} value={
              <span className="whitespace-pre-wrap">{nc.description}</span>
            } />
            <InfoRow label={t("nc.table.reference")} value={nc.reference} mono />
            <InfoRow label={t("nc.form.detectedAt")} value={
              nc.detected_at ? new Date(nc.detected_at + "T00:00:00").toLocaleDateString() : undefined
            } />
          </SectionCard>

          <SectionCard title={t("nc.detail.responsibility")} icon={User}>
            <InfoRow label={t("nc.table.responsible")} value={nc.responsible} />
            <InfoRow label={t("nc.detail.assignedTo")} value={nc.assigned_to} />
            <InfoRow label={t("nc.detail.owner")} value={nc.owner} />
            <InfoRow label={t("nc.detail.approver")} value={nc.approver} />
          </SectionCard>

          {/* Links to related entities */}
          {(nc.work_item_id || nc.ppi_instance_id || nc.test_result_id) && (
            <SectionCard title={t("nc.detail.linkedTo")} icon={Link2}>
              {nc.work_item_id && (
                <InfoRow label={t("nc.detail.workItem")} value={
                  <Link to={`/work-items/${nc.work_item_id}`} className="text-primary underline underline-offset-2 text-sm">
                    {t("nc.detail.viewWorkItem")}
                  </Link>
                } />
              )}
              {nc.ppi_instance_id && (
                <InfoRow label={t("nc.detail.ppiInstance")} value={
                  <Link to={`/ppi/${nc.ppi_instance_id}`} className="text-primary underline underline-offset-2 text-sm">
                    {t("nc.detail.viewPpi")}
                  </Link>
                } />
              )}
            </SectionCard>
          )}

          {/* Verification */}
          {(nc.verification_method || nc.verification_result || nc.verified_by || nc.verified_at) && (
            <SectionCard title={t("nc.detail.verification")} icon={CheckCircle2}>
              <InfoRow label={t("nc.form.verificationMethod")} value={nc.verification_method} />
              <InfoRow label={t("nc.form.verificationResult")} value={nc.verification_result} />
              <InfoRow label={t("nc.detail.verifiedBy")} value={nc.verified_by} />
              {nc.verified_at && (
                <InfoRow label={t("nc.detail.verifiedAt")} value={
                  new Date(nc.verified_at).toLocaleString()
                } />
              )}
              {nc.closure_date && (
                <InfoRow label={t("nc.detail.closureDate")} value={
                  new Date(nc.closure_date + "T00:00:00").toLocaleDateString()
                } />
              )}
            </SectionCard>
          )}
        </TabsContent>

        {/* ── TAB: CAPA ──────────────────────────────────────────────── */}
        <TabsContent value="capa" className="mt-4">
          <SectionCard title={t("nc.form.tabs.capa")} icon={Shield}>
            <div className="space-y-6">
              <div className="rounded-lg bg-muted/40 border border-border px-4 py-2 text-xs text-muted-foreground">
                {t("nc.form.capaHint")}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CapaField label={t("nc.form.correction")} value={nc.correction} />
                <CapaField label={t("nc.form.rootCause")} value={nc.root_cause} />
                <CapaField label={t("nc.form.correctiveAction")} value={nc.corrective_action} />
                <CapaField label={t("nc.form.preventiveAction")} value={nc.preventive_action} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CapaField label={t("nc.form.verificationMethod")} value={nc.verification_method} />
                <CapaField label={t("nc.form.verificationResult")} value={nc.verification_result} />
              </div>

              {(!nc.correction && !nc.root_cause && !nc.corrective_action && !nc.preventive_action) && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Shield className="h-8 w-8 opacity-30" />
                  <p className="text-sm">{t("nc.detail.capaEmpty")}</p>
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="mt-2 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    {t("nc.detail.fillCapa")}
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ── TAB: Evidências ─────────────────────────────────────────── */}
        <TabsContent value="attachments" className="mt-4">
          <AttachmentsPanel
            entityType="non_conformities"
            entityId={nc.id}
            projectId={nc.project_id}
          />
        </TabsContent>

        {/* ── TAB: Histórico ──────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t("nc.detail.tabs.history")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {logsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Clock className="h-6 w-6 opacity-30" />
                  <p className="text-sm">{t("nc.detail.historyEmpty")}</p>
                </div>
              ) : (
                <ol className="relative border-l border-border/60 ml-3 space-y-0">
                  {auditLogs.map((log, idx) => (
                    <li key={log.id} className="mb-4 ml-5">
                      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-border bg-background" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          log.action === "INSERT" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                          log.action === "STATUS_CHANGE" ? "bg-primary/10 text-primary" :
                          log.action === "DELETE" ? "bg-destructive/10 text-destructive" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {log.action}
                        </span>
                        <time className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </time>
                      </div>
                      {log.description && (
                        <p className="text-sm mt-0.5 text-foreground">{log.description}</p>
                      )}
                      {log.diff && typeof log.diff === "object" && (
                        <pre className="mt-1 text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1 overflow-x-auto max-h-24">
                          {JSON.stringify(log.diff, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <NCFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        nc={nc}
        onSuccess={() => { loadNc(); loadLogs(); }}
      />
    </div>
  );
}
