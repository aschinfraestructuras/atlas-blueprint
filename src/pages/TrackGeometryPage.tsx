import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { supabase } from "@/integrations/supabase/client";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { Ruler, Plus, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Pencil, Trash2, Search, Download, Eye } from "lucide-react";
import { WorkItemSelect } from "@/components/ui/work-item-select";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { printHtml } from "@/lib/services/reportService";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";

// ── Tipos ──────────────────────────────────────────────────────────────
interface Campaign {
  id: string; project_id: string; work_item_id: string | null;
  campaign_code: string; campaign_date: string;
  pk_start: string; pk_end: string; track: string | null;
  equipment_ref: string | null; operator_name: string | null;
  norm_class: string; overall_result: string;
  observations: string | null; created_at: string;
  readings?: Reading[];
}

interface Reading {
  id: string; campaign_id: string; pk_position: string;
  gauge_mm: number | null; gauge_deviation_mm: number | null;
  twist_mm: number | null; crosslevel_mm: number | null;
  longitudinal_level_mm: number | null; alignment_mm: number | null;
  rail_profile: string | null; conforming: boolean | null; remarks: string | null;
}

interface Tolerance { norm_class: string; parameter: string; limit_value_mm: number; }

const db = supabase as any;
const NORM_CLASSES = ["Q1", "Q2", "Q3", "QN"];
const RESULTS = ["conforme", "nao_conforme", "pendente"];
const TRACKS = ["Via 1", "Via 2", "Via Única", "Ramal"];

function ResultBadge({ result, t }: { result: string; t: (k: string, o?: any) => string }) {
  const cfg = {
    conforme:     { cls: "bg-green-500/15 text-green-700 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    nao_conforme: { cls: "bg-destructive/15 text-destructive",                  icon: <XCircle className="h-3 w-3" /> },
    pendente:     { cls: "bg-amber-500/15 text-amber-700",                      icon: <AlertTriangle className="h-3 w-3" /> },
  }[result] ?? { cls: "bg-muted text-muted-foreground", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.cls)}>
      {cfg.icon}
      {t(`trackGeometry.result.${result}`, { defaultValue: result })}
    </span>
  );
}

// ── Formulário de campanha ──────────────────────────────────────────────
const EMPTY_CAMP = {
  campaign_date: new Date().toISOString().split("T")[0],
  pk_start: "", pk_end: "", track: "__none__",
  equipment_ref: "", operator_name: "", norm_class: "Q2",
  overall_result: "pendente", observations: "", work_item_id: "__none__",
};

function CampaignDialog({ open, onOpenChange, campaign, projectId, workItems, onSaved }: any) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_CAMP);
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) {
      if (campaign) {
        setForm({
          campaign_date: campaign.campaign_date,
          pk_start: campaign.pk_start, pk_end: campaign.pk_end,
          track: campaign.track ?? "__none__",
          equipment_ref: campaign.equipment_ref ?? "",
          operator_name: campaign.operator_name ?? "",
          norm_class: campaign.norm_class,
          overall_result: campaign.overall_result,
          observations: campaign.observations ?? "",
          work_item_id: campaign.work_item_id ?? "__none__",
        });
      } else setForm(EMPTY_CAMP);
    }
  }, [open, campaign]);

  const handleSave = async () => {
    if (!form.pk_start || !form.pk_end) return;
    setSaving(true);
    try {
      const payload = {
        project_id: projectId,
        campaign_date: form.campaign_date,
        pk_start: form.pk_start.trim(),
        pk_end: form.pk_end.trim(),
        track: form.track === "__none__" ? null : form.track,
        equipment_ref: form.equipment_ref.trim() || null,
        operator_name: form.operator_name.trim() || null,
        norm_class: form.norm_class,
        overall_result: form.overall_result,
        observations: form.observations.trim() || null,
        work_item_id: form.work_item_id === "__none__" ? null : form.work_item_id,
        created_by: user?.id,
      };
      if (campaign) {
        const { error } = await db.from("track_geometry_campaigns").update(payload).eq("id", campaign.id);
        if (error) throw error;
        toast({ title: t("trackGeometry.toast.updated") });
      } else {
        // Gerar código
        const year = new Date().getFullYear();
        const { count } = await db.from("track_geometry_campaigns")
          .select("id", { count: "exact", head: true }).eq("project_id", projectId);
        const n = String((count ?? 0) + 1).padStart(3, "0");
        const code = `GV-${new Date().getFullYear().toString().slice(2)}-${n}`;
        const { error } = await db.from("track_geometry_campaigns").insert({ ...payload, campaign_code: code });
        if (error) throw error;
        toast({ title: t("trackGeometry.toast.created") });
      }
      onSaved(); onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("common.saveError"), description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            {campaign ? t("trackGeometry.editCampaign") : t("trackGeometry.newCampaign")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("trackGeometry.section.identification")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.date")} *</Label>
              <Input type="date" value={form.campaign_date} onChange={e => f("campaign_date", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.track")}</Label>
              <Select value={form.track} onValueChange={v => f("track", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {TRACKS.map(tr => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.pkStart")} *</Label>
              <Input value={form.pk_start} onChange={e => f("pk_start", e.target.value)} placeholder="29+700" className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.pkEnd")} *</Label>
              <Input value={form.pk_end} onChange={e => f("pk_end", e.target.value)} placeholder="31+200" className="h-8 text-xs font-mono" />
            </div>
          </div>
          <Separator />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("trackGeometry.section.execution")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.operator")}</Label>
              <Input value={form.operator_name} onChange={e => f("operator_name", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.equipment")}</Label>
              <Input value={form.equipment_ref} onChange={e => f("equipment_ref", e.target.value)} placeholder="Ex: Auscultador Plasser EM120" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.normClass")}</Label>
              <Select value={form.norm_class} onValueChange={v => f("norm_class", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NORM_CLASSES.map(c => <SelectItem key={c} value={c}>EN 13231 — {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.result")}</Label>
              <Select value={form.overall_result} onValueChange={v => f("overall_result", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULTS.map(r => <SelectItem key={r} value={r}>{t(`trackGeometry.result.${r}`, { defaultValue: r })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("trackGeometry.form.workItem")}</Label>
            <WorkItemSelect
              workItems={workItems}
              value={form.work_item_id === "__none__" ? "" : form.work_item_id}
              onValueChange={v => f("work_item_id", v || "__none__")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.notes")}</Label>
            <Textarea value={form.observations} onChange={e => f("observations", e.target.value)} rows={2} className="text-xs resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.pk_start || !form.pk_end}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Formulário de leituras ──────────────────────────────────────────────
const EMPTY_READING = {
  pk_position: "", gauge_deviation_mm: "", twist_mm: "",
  crosslevel_mm: "", longitudinal_level_mm: "", alignment_mm: "",
  rail_profile: "__none__", conforming: "__none__", remarks: "",
};

function ReadingDialog({ open, onOpenChange, campaignId, onSaved }: any) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_READING);
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { if (open) setForm(EMPTY_READING); }, [open]);

  const handleSave = async () => {
    if (!form.pk_position) return;
    setSaving(true);
    try {
      const { error } = await db.from("track_geometry_readings").insert({
        campaign_id: campaignId,
        pk_position: form.pk_position.trim(),
        gauge_deviation_mm: form.gauge_deviation_mm ? Number(form.gauge_deviation_mm) : null,
        twist_mm: form.twist_mm ? Number(form.twist_mm) : null,
        crosslevel_mm: form.crosslevel_mm ? Number(form.crosslevel_mm) : null,
        longitudinal_level_mm: form.longitudinal_level_mm ? Number(form.longitudinal_level_mm) : null,
        alignment_mm: form.alignment_mm ? Number(form.alignment_mm) : null,
        rail_profile: form.rail_profile === "__none__" ? null : form.rail_profile,
        conforming: form.conforming === "__none__" ? null : form.conforming === "true",
        remarks: form.remarks.trim() || null,
      });
      if (error) throw error;
      toast({ title: t("trackGeometry.toast.readingAdded") });
      onSaved(); onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("common.saveError"), description: err?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("trackGeometry.addReading")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.pkPosition")} *</Label>
              <Input value={form.pk_position} onChange={e => f("pk_position", e.target.value)} placeholder="Ex: 30+145" className="h-8 text-xs font-mono" />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("trackGeometry.section.measurements")}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["gauge_deviation_mm", t("trackGeometry.param.gaugeDeviation")],
              ["twist_mm",           t("trackGeometry.param.twist")],
              ["crosslevel_mm",      t("trackGeometry.param.crosslevel")],
              ["longitudinal_level_mm", t("trackGeometry.param.longLevel")],
              ["alignment_mm",       t("trackGeometry.param.alignment")],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label} (mm)</Label>
                <Input type="number" step="0.1"
                  value={(form as any)[key]}
                  onChange={e => f(key, e.target.value)}
                  className="h-8 text-xs" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.railProfile")}</Label>
              <Select value={form.rail_profile} onValueChange={v => f("rail_profile", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="54E1">54E1</SelectItem>
                  <SelectItem value="60E1">60E1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("trackGeometry.form.conforming")}</Label>
              <Select value={form.conforming} onValueChange={v => f("conforming", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="true">{t("trackGeometry.result.conforme")}</SelectItem>
                  <SelectItem value="false">{t("trackGeometry.result.nao_conforme")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("common.notes")}</Label>
            <Input value={form.remarks} onChange={e => f("remarks", e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.pk_position}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detalhe da campanha ─────────────────────────────────────────────────
function CampaignSheet({ campaign, open, onOpenChange, projectId, onReadingAdded }: any) {
  const { t } = useTranslation();
  const { canCreate } = useProjectRole();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);

  const fetchReadings = useCallback(async () => {
    if (!campaign) return;
    const { data } = await db.from("track_geometry_readings")
      .select("*").eq("campaign_id", campaign.id).order("pk_position");
    setReadings(data ?? []);
  }, [campaign]);

  useEffect(() => { if (open && campaign) fetchReadings(); }, [open, campaign, fetchReadings]);

  const nc = readings.filter(r => r.conforming === false).length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-3">
            <SheetTitle className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              {campaign?.campaign_code}
            </SheetTitle>
            {campaign && (
              <div className="flex items-center gap-2 flex-wrap">
                <ResultBadge result={campaign.overall_result} t={t} />
                <Badge variant="outline" className="text-[10px]">EN 13231 — {campaign.norm_class}</Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">{campaign.pk_start} → {campaign.pk_end}</Badge>
              </div>
            )}
          </SheetHeader>

          {campaign && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  [t("common.date"), new Date(campaign.campaign_date).toLocaleDateString("pt-PT")],
                  [t("trackGeometry.form.track"), campaign.track ?? "—"],
                  [t("trackGeometry.form.operator"), campaign.operator_name ?? "—"],
                  [t("trackGeometry.form.equipment"), campaign.equipment_ref ?? "—"],
                ].map(([label, val]) => (
                  <div key={label} className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="font-medium">{val}</p>
                  </div>
                ))}
              </div>

              {campaign.observations && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{campaign.observations}</p>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">{t("trackGeometry.readings")} ({readings.length})</p>
                  {nc > 0 && (
                    <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3" />{nc} {t("trackGeometry.nonConformingReadings")}
                    </p>
                  )}
                </div>
                {canCreate && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setReadingDialogOpen(true)}>
                    <Plus className="h-3 w-3" />{t("trackGeometry.addReading")}
                  </Button>
                )}
              </div>
              </div>

              {readings.length > 0 && (
                <div className="rounded-lg border border-border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">PK</TableHead>
                        <TableHead className="text-[10px]">Bitola (mm)</TableHead>
                        <TableHead className="text-[10px]">Empeno</TableHead>
                        <TableHead className="text-[10px]">Nivel.</TableHead>
                        <TableHead className="text-[10px]">Alinhamento</TableHead>
                        <TableHead className="text-[10px]">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map(r => (
                        <TableRow key={r.id} className={r.conforming === false ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs font-mono">{r.pk_position}</TableCell>
                          <TableCell className="text-xs">{r.gauge_deviation_mm != null ? (r.gauge_deviation_mm > 0 ? `+${r.gauge_deviation_mm}` : r.gauge_deviation_mm) : "—"}</TableCell>
                          <TableCell className="text-xs">{r.twist_mm ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.longitudinal_level_mm ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.alignment_mm ?? "—"}</TableCell>
                          <TableCell>
                            {r.conforming === true && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                            {r.conforming === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                            {r.conforming == null && <span className="text-muted-foreground text-[10px]">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Acções */}
              <Separator />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1"
                  onClick={() => handleExportCampaign(campaign, readings)}>
                  <Download className="h-3.5 w-3.5" />Exportar PDF
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1"
                  onClick={() => { setSheetOpen(false); setEditing(campaign); setDialogOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />Editar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ReadingDialog
        open={readingDialogOpen}
        onOpenChange={setReadingDialogOpen}
        campaignId={campaign?.id}
        onSaved={() => { fetchReadings(); onReadingAdded?.(); }}
      />
    </>
  );
}

// ── Página principal ────────────────────────────────────────────────────
export default function TrackGeometryPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { canCreate } = useProjectRole();
  const { logoBase64 } = useProjectLogo();
  const pid = activeProject?.id ?? "";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("__all__");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [sheetCampaign, setSheetCampaign] = useState<Campaign | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetch = useCallback(async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const [cRes, wRes] = await Promise.all([
        db.from("track_geometry_campaigns").select("*")
          .eq("project_id", pid).eq("is_deleted", false)
          .order("campaign_date", { ascending: false }),
        db.from("work_items").select("id, obra, lote, parte, elemento, disciplina")
          .eq("project_id", pid).eq("is_deleted", false).order("lote"),
      ]);
      setCampaigns(cRes.data ?? []);
      setWorkItems(wRes.data ?? []);
    } finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => campaigns.filter(c => {
    if (filterResult !== "__all__" && c.overall_result !== filterResult) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.campaign_code.toLowerCase().includes(q)
        || c.pk_start.toLowerCase().includes(q)
        || c.pk_end.toLowerCase().includes(q)
        || (c.operator_name ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [campaigns, filterResult, search]);

  const kpis = useMemo(() => ({
    total: campaigns.length,
    conforme: campaigns.filter(c => c.overall_result === "conforme").length,
    naoConforme: campaigns.filter(c => c.overall_result === "nao_conforme").length,
    pendente: campaigns.filter(c => c.overall_result === "pendente").length,
  }), [campaigns]);

  const handleExportCampaign = (c: Campaign, reads: Reading[]) => {
    const today = new Date().toLocaleDateString("pt-PT");
    const header = fullPdfHeader(logoBase64 ?? null, activeProject?.name ?? "", c.campaign_code, "0", today);
    const LEVEL_COLORS: Record<string,string> = { conforme:"#22c55e", nao_conforme:"#ef4444", pendente:"#f59e0b" };
    const col = LEVEL_COLORS[c.overall_result] ?? "#94a3b8";
    const rows = reads.map((r, i) => `
      <tr style="background:${i%2===0?"#fff":"#f8fafc"}">
        <td style="padding:4px;border:1px solid #ddd;font-family:monospace">${r.pk_position}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">${r.gauge_deviation_mm ?? "—"}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">${r.twist_mm ?? "—"}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">${r.longitudinal_level_mm ?? "—"}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">${r.alignment_mm ?? "—"}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center;font-size:16px">${r.conforming===true?"✓":r.conforming===false?"✗":"—"}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
      <title>${c.campaign_code}</title>
      <style>@page{size:A4;margin:18mm 15mm}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b}table{border-collapse:collapse;width:100%}</style>
    </head><body>
      ${header}
      <div style="font-size:16px;font-weight:bold;color:#1e3a5f;margin-bottom:10px;border-bottom:2px solid #1e3a5f;padding-bottom:4px">
        ${c.campaign_code} — Campanha de Geometria de Via (EN 13231-1)
      </div>
      <table style="margin-bottom:12px">
        <tr><td style="font-weight:bold;padding:4px;border:1px solid #ddd;width:25%">Data</td><td style="padding:4px;border:1px solid #ddd">${new Date(c.campaign_date).toLocaleDateString("pt-PT")}</td>
            <td style="font-weight:bold;padding:4px;border:1px solid #ddd;width:25%">Via</td><td style="padding:4px;border:1px solid #ddd">${c.track ?? "—"}</td></tr>
        <tr><td style="font-weight:bold;padding:4px;border:1px solid #ddd">PK Início</td><td style="padding:4px;border:1px solid #ddd;font-family:monospace">${c.pk_start}</td>
            <td style="font-weight:bold;padding:4px;border:1px solid #ddd">PK Fim</td><td style="padding:4px;border:1px solid #ddd;font-family:monospace">${c.pk_end}</td></tr>
        <tr><td style="font-weight:bold;padding:4px;border:1px solid #ddd">Operador</td><td style="padding:4px;border:1px solid #ddd">${c.operator_name ?? "—"}</td>
            <td style="font-weight:bold;padding:4px;border:1px solid #ddd">Equipamento</td><td style="padding:4px;border:1px solid #ddd">${c.equipment_ref ?? "—"}</td></tr>
        <tr><td style="font-weight:bold;padding:4px;border:1px solid #ddd">Norma</td><td style="padding:4px;border:1px solid #ddd">EN 13231-1 — Classe ${c.norm_class}</td>
            <td style="font-weight:bold;padding:4px;border:1px solid #ddd">Resultado</td><td style="padding:4px;border:1px solid #ddd"><span style="color:${col};font-weight:bold">${c.overall_result.toUpperCase()}</span></td></tr>
      </table>
      ${reads.length > 0 ? `
      <div style="font-weight:bold;font-size:12px;color:#1e3a5f;margin:10px 0 6px">Leituras (${reads.length})</div>
      <table>
        <thead><tr style="background:#1e3a5f;color:#fff">
          <th style="padding:5px;text-align:left">PK</th>
          <th style="padding:5px">Desvio Bitola (mm)</th>
          <th style="padding:5px">Empeno (mm)</th>
          <th style="padding:5px">Niv. Long. (mm)</th>
          <th style="padding:5px">Alinhamento (mm)</th>
          <th style="padding:5px">Conformidade</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>` : "<p style='color:#6b7280;font-size:11px'>Sem leituras registadas.</p>"}
      ${c.observations ? `<div style="margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px"><strong>Observações:</strong> ${c.observations}</div>` : ""}
    </body></html>`;
    printHtml(html, `${c.campaign_code}.pdf`);
  };
    if (!deleteTarget) return;
    await db.from("track_geometry_campaigns")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    toast({ title: t("trackGeometry.toast.deleted") });
    setDeleteTarget(null); fetch();
  };

  if (!activeProject) return <NoProjectBanner />;

  return (
    <div className="space-y-5">
      {/* Cabeçalho inline — sem PageHeader autónomo pois é tab */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("trackGeometry.title")}</p>
          <p className="text-xs text-muted-foreground">{t("trackGeometry.subtitle")}</p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />{t("trackGeometry.newCampaign")}
          </Button>
        )}
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: t("trackGeometry.kpi.total"),       value: kpis.total,       color: "" },
            { label: t("trackGeometry.result.conforme"), value: kpis.conforme,    color: "text-green-600" },
            { label: t("trackGeometry.result.nao_conforme"), value: kpis.naoConforme, color: "text-destructive" },
            { label: t("trackGeometry.result.pendente"), value: kpis.pendente,    color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border bg-card p-3 flex items-center gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                <p className={cn("text-2xl font-bold leading-tight", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("trackGeometry.search")} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("trackGeometry.filter.allResults")}</SelectItem>
            {RESULTS.map(r => <SelectItem key={r} value={r}>{t(`trackGeometry.result.${r}`, { defaultValue: r })}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title={t("trackGeometry.empty")}
          subtitle={t("trackGeometry.emptyDesc")}
          action={canCreate ? { label: t("trackGeometry.newCampaign"), onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : (
        <Card className="border bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("trackGeometry.col.code")}</TableHead>
                  <TableHead className="text-xs">{t("common.date")}</TableHead>
                  <TableHead className="text-xs">PK</TableHead>
                  <TableHead className="text-xs">{t("trackGeometry.form.track")}</TableHead>
                  <TableHead className="text-xs">Norma</TableHead>
                  <TableHead className="text-xs">{t("trackGeometry.form.operator")}</TableHead>
                  <TableHead className="text-xs">{t("trackGeometry.form.result")}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/20"
                    onClick={() => { setSheetCampaign(c); setSheetOpen(true); }}>
                    <TableCell className="text-xs font-mono font-semibold">{c.campaign_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.campaign_date).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{c.pk_start} → {c.pk_end}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.track ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.norm_class}</Badge></TableCell>
                    <TableCell className="text-xs">{c.operator_name ?? "—"}</TableCell>
                    <TableCell><ResultBadge result={c.overall_result} t={t} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Ver detalhe"
                          onClick={() => { setSheetCampaign(c); setSheetOpen(true); }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Exportar PDF"
                          onClick={() => handleExportCampaign(c, [])}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs — fora de qualquer TabsContent */}
      <CampaignDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        campaign={editing} projectId={pid}
        workItems={workItems} onSaved={fetch}
      />

      <CampaignSheet
        campaign={sheetCampaign} open={sheetOpen}
        onOpenChange={setSheetOpen} projectId={pid}
        onReadingAdded={fetch}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trackGeometry.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trackGeometry.deleteDesc", { code: deleteTarget?.campaign_code ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
