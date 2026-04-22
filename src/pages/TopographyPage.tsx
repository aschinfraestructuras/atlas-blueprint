import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useSurveys } from "@/hooks/useSurveys";
import { useDocuments } from "@/hooks/useDocuments";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { PKRangeFilter } from "@/components/ui/pk-range-filter";
import {
  Plus, AlertTriangle, CheckCircle, Clock, Wrench, FileText, Target, Trash2, Pencil, Search,
  Map, ShieldAlert, FolderOpen, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { exportREQ } from "@/lib/services/sgqListExportService";
import {
  exportTopographyEquipmentCsv, exportTopographyEquipmentPdf,
  exportTopographyRequestsCsv, exportTopographyControlsCsv,
  exportTopographyControlsPdf,
} from "@/lib/services/topographyExportService";
import { exportSurveysCsv, exportSurveysPdf } from "@/lib/services/surveyExportService";
import {
  useTopographyEquipment, useCalibrations, useTopographyRequests, useTopographyControls,
} from "@/hooks/useTopography";
import {
  topographyEquipmentService, calibrationService, topographyRequestService, topographyControlService,
} from "@/lib/services/topographyService";
import { surveyService } from "@/lib/services/surveyService";
import { EquipmentFormDialog } from "@/components/topography/EquipmentFormDialog";
import { CalibrationFormDialog } from "@/components/topography/CalibrationFormDialog";
import { RequestFormDialog } from "@/components/topography/RequestFormDialog";
import { ControlFormDialog } from "@/components/topography/ControlFormDialog";
import { SurveyFormDialog } from "@/components/survey/SurveyFormDialog";
import { DocumentFormDialog } from "@/components/documents/DocumentFormDialog";
import type { TopographyRequest, TopographyControl } from "@/lib/services/topographyService";
import type { SurveyRecord } from "@/lib/services/surveyService";
import { seedTopographyDocuments, TOPOGRAPHY_SEED_COUNT } from "@/lib/services/topographyDocSeedService";
import { cn } from "@/lib/utils";

function CalibrationBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "valid") return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />{t("topography.status.valid")}</Badge>;
  if (status === "expiring_soon") return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t("topography.status.expiring_soon")}</Badge>;
  return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{t("topography.status.expired")}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = { pending: "secondary", assigned: "outline", in_progress: "default", completed: "outline", cancelled: "destructive" };
  return <Badge variant={(map[status] || "secondary") as any}>{t(`topography.requestStatus.${status}`, { defaultValue: status })}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = { low: "secondary", normal: "outline", high: "default", urgent: "destructive" };
  return <Badge variant={(map[priority] || "secondary") as any}>{t(`topography.priority.${priority}`, { defaultValue: priority })}</Badge>;
}

const SURVEY_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  validated: "bg-primary/20 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle><AlertDialogDescription>{t("topography.deleteConfirm")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const REQ_STATUSES = ["pending", "assigned", "in_progress", "completed", "cancelled"];
const CTRL_RESULTS = ["conforme", "nao_conforme"];
const SURVEY_STATUSES = ["pending", "validated", "rejected"];
const EQ_CAL_STATUSES = ["valid", "expiring_soon", "expired"];

export default function TopographyPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { isAdmin, canCreate, canDelete } = useProjectRole();
  const navigate = useNavigate();
  const reportMeta = useReportMeta();
  const [activeTab, setActiveTab] = useState("equipment");

  const { data: equipment, loading: eqLoading, refetch: refetchEq } = useTopographyEquipment();
  const { data: calibrations, refetch: refetchCal } = useCalibrations();
  const { data: requests, loading: reqLoading, refetch: refetchReq } = useTopographyRequests();
  const { data: controls, loading: ctrlLoading, refetch: refetchCtrl } = useTopographyControls();
  const { data: surveys, loading: surveyLoading, refetch: refetchSurveys } = useSurveys();
  const { data: allDocuments, loading: docsLoading, refetch: refetchDocs } = useDocuments();

  const [eqDialogOpen, setEqDialogOpen] = useState(false);
  const [viewEquipment, setViewEquipment] = useState<any>(null);
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [calEquipmentId, setCalEquipmentId] = useState<string | null>(null);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<TopographyRequest | null>(null);
  const [ctrlDialogOpen, setCtrlDialogOpen] = useState(false);
  const [editControl, setEditControl] = useState<TopographyControl | null>(null);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [editSurvey, setEditSurvey] = useState<SurveyRecord | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);

  // Load topography cycle data
  useEffect(() => {
    if (!activeProject) return;
    supabase.from("vw_topography_cycle").select("*").eq("project_id", activeProject.id)
      .then(({ data }) => setCycleData(data ?? []));
  }, [activeProject, requests]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterReqStatus, setFilterReqStatus] = useState("__all__");
  const [filterCtrlResult, setFilterCtrlResult] = useState("__all__");
  const [filterSurveyStatus, setFilterSurveyStatus] = useState("__all__");
  const [filterEqCalStatus, setFilterEqCalStatus] = useState("__all__");
  const [pkFrom, setPkFrom] = useState<number | null>(null);
  const [pkTo, setPkTo] = useState<number | null>(null);

  const filteredSurveys = useMemo(() => {
    let list = surveys;
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.area_or_pk.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)); }
    if (filterSurveyStatus !== "__all__") list = list.filter(r => r.status === filterSurveyStatus);
    return list;
  }, [surveys, search, filterSurveyStatus]);

  const filteredEquipment = useMemo(() => {
    let list = equipment;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.code.toLowerCase().includes(q) || e.equipment_type.toLowerCase().includes(q) || (e.brand ?? "").toLowerCase().includes(q) || (e.serial_number ?? "").toLowerCase().includes(q));
    }
    if (filterEqCalStatus !== "__all__") list = list.filter(e => e.calibration_status === filterEqCalStatus);
    return list;
  }, [equipment, search, filterEqCalStatus]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.description.toLowerCase().includes(q) || (r.zone ?? "").toLowerCase().includes(q) || r.request_type.toLowerCase().includes(q)); }
    if (filterReqStatus !== "__all__") list = list.filter(r => r.status === filterReqStatus);
    return list;
  }, [requests, search, filterReqStatus]);

  const filteredControls = useMemo(() => {
    let list = controls;
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.element.toLowerCase().includes(q) || (c.zone ?? "").toLowerCase().includes(q) || (c.technician ?? "").toLowerCase().includes(q)); }
    if (filterCtrlResult !== "__all__") list = list.filter(c => c.result === filterCtrlResult);
    if (pkFrom !== null) list = list.filter(c => { const pk = parseFloat(String(c.zone ?? "").replace("PK","").trim()); return isNaN(pk) || pk >= pkFrom; });
    if (pkTo !== null) list = list.filter(c => { const pk = parseFloat(String(c.zone ?? "").replace("PK","").trim()); return isNaN(pk) || pk <= pkTo; });
    return list;
  }, [controls, search, filterCtrlResult, pkFrom, pkTo]);

  // Arquivo Topográfico: ALL docs with disciplina=topografia
  const topoDocuments = useMemo(() => {
    let list = allDocuments.filter(d => d.disciplina === "topografia" && !d.is_deleted);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => d.title.toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q) || d.doc_type.toLowerCase().includes(q));
    }
    return list;
  }, [allDocuments, search]);

  if (!activeProject) return <NoProjectBanner />;

  const meta = reportMeta ?? { projectName: activeProject.name, projectCode: activeProject.code, locale: "pt", generatedBy: user?.email ?? undefined };
  const expiredCount = equipment.filter(e => e.calibration_status === "expired").length;
  const expiringCount = equipment.filter(e => e.calibration_status === "expiring_soon").length;
  const validCount = equipment.filter(e => e.calibration_status === "valid").length;
  const pendingReqCount = requests.filter(r => r.status === "pending").length;
  const ncControlCount = controls.filter(c => c.result === "nao_conforme").length;

  const handleAddCalibration = (equipmentId: string) => { setCalEquipmentId(equipmentId); setCalDialogOpen(true); };
  const handleViewEquipment = (eq: any) => { setViewEquipment(eq); setEqDialogOpen(true); };
  const handleNewEquipment = () => { setViewEquipment(null); setEqDialogOpen(true); };
  const handleEditRequest = (req: TopographyRequest) => { setEditRequest(req); setReqDialogOpen(true); };
  const handleNewRequest = () => { setEditRequest(null); setReqDialogOpen(true); };
  const handleEditControl = (ctrl: TopographyControl) => { setEditControl(ctrl); setCtrlDialogOpen(true); };
  const handleNewControl = () => { setEditControl(null); setCtrlDialogOpen(true); };
  const handleNewSurvey = () => { setEditSurvey(null); setSurveyDialogOpen(true); };
  const handleEditSurvey = (s: SurveyRecord) => { setEditSurvey(s); setSurveyDialogOpen(true); };

  const handleDeleteEquipment = async (id: string) => {
    try { await topographyEquipmentService.delete(id, activeProject.id); toast.success(t("topography.toast.deleted")); refetchEq(); }
    catch { toast.error(t("topography.toast.deleteError")); }
  };
  const handleDeleteRequest = async (id: string) => {
    try { await topographyRequestService.delete(id, activeProject.id); toast.success(t("topography.toast.deleted")); refetchReq(); }
    catch { toast.error(t("topography.toast.deleteError")); }
  };
  const handleDeleteControl = async (id: string) => {
    try { await topographyControlService.delete(id, activeProject.id); toast.success(t("topography.toast.deleted")); refetchCtrl(); }
    catch { toast.error(t("topography.toast.deleteError")); }
  };
  const handleDeleteSurvey = async (id: string) => {
    try { await surveyService.delete(id, activeProject.id); toast.success(t("topography.toast.deleted")); refetchSurveys(); }
    catch { toast.error(t("topography.toast.deleteError")); }
  };

  const getExportOptions = () => {
    const opts: any[] = [];
    if (activeTab === "surveys") {
      opts.push({ label: "CSV", icon: "csv", action: () => exportSurveysCsv(filteredSurveys, meta) });
      opts.push({ label: "PDF", icon: "pdf", action: () => exportSurveysPdf(filteredSurveys, meta) });
    } else if (activeTab === "equipment") {
      opts.push({ label: "CSV", icon: "csv", action: () => exportTopographyEquipmentCsv(filteredEquipment, meta) });
      opts.push({ label: "PDF", icon: "pdf", action: () => exportTopographyEquipmentPdf(filteredEquipment, meta) });
      opts.push({ label: t("topography.exportReq"), icon: "pdf", action: async () => {
        await exportREQ(filteredEquipment.map(e => ({
          ...e,
          lastCalibrationDate: calibrations.find(c => c.equipment_id === e.id)?.issue_date ?? null,
        })), meta);
      }});
    } else if (activeTab === "requests") {
      opts.push({ label: "CSV", icon: "csv", action: () => exportTopographyRequestsCsv(filteredRequests, meta) });
    } else {
      opts.push({ label: "CSV", icon: "csv", action: () => exportTopographyControlsCsv(filteredControls, meta) });
      opts.push({ label: "PDF", icon: "pdf", action: () => exportTopographyControlsPdf(filteredControls, equipment, meta) });
    }
    return opts;
  };

  // Calculate days until expiration for equipment
  const getCalibrationDaysInfo = (validUntil: string | null) => {
    if (!validUntil) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(validUntil);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t("topography.title")} subtitle={t("topography.subtitle")} />
        <ReportExportMenu options={getExportOptions()} />
      </div>

      {/* Expiring calibration alert banner */}
      {expiringCount > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <span className="font-semibold">{t("topography.alert.expiringTitle", { count: expiringCount })}</span>
            {" — "}{t("topography.alert.expiringDesc")}
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t("topography.kpi.totalEmes")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{equipment.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-primary"><CheckCircle className="inline h-4 w-4 mr-1" />{t("topography.kpi.calibrated")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{validCount}</div></CardContent></Card>
        <Card className={expiringCount > 0 ? "border-yellow-500/50" : ""}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-600"><Clock className="inline h-4 w-4 mr-1" />{t("topography.kpi.expiring30d")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{expiringCount}</div></CardContent></Card>
        <Card className={expiredCount > 0 ? "border-destructive/50" : ""}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-destructive"><ShieldAlert className="inline h-4 w-4 mr-1" />{t("topography.kpi.expired")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{expiredCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground"><FileText className="inline h-4 w-4 mr-1" />{t("topography.kpi.pendingRequests")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendingReqCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground"><Target className="inline h-4 w-4 mr-1" />{t("topography.kpi.ncControls")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{ncControlCount}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipment"><Wrench className="h-4 w-4 mr-1" />{t("topography.equipment")}</TabsTrigger>
          <TabsTrigger value="requests"><FileText className="h-4 w-4 mr-1" />{t("topography.requests")}</TabsTrigger>
          <TabsTrigger value="controls"><Target className="h-4 w-4 mr-1" />{t("topography.controls")}</TabsTrigger>
          <TabsTrigger value="surveys"><Map className="h-4 w-4 mr-1" />{t("topography.surveys")}</TabsTrigger>
          <TabsTrigger value="documents"><FolderOpen className="h-4 w-4 mr-1" />{t("topography.archiveTab")}<Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{topoDocuments.length}</Badge></TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <FilterBar>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={t("topography.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            {activeTab === "equipment" && (
              <Select value={filterEqCalStatus} onValueChange={setFilterEqCalStatus}>
                <SelectTrigger className="w-[180px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("topography.filters.allCalStatuses")}</SelectItem>
                  {EQ_CAL_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`topography.status.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {activeTab === "surveys" && (
              <Select value={filterSurveyStatus} onValueChange={setFilterSurveyStatus}>
                <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("topography.filters.allStatuses")}</SelectItem>
                  {SURVEY_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`survey.status.${s}`, { defaultValue: s })}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {activeTab === "requests" && (
              <Select value={filterReqStatus} onValueChange={setFilterReqStatus}>
                <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("topography.filters.allStatuses")}</SelectItem>
                  {REQ_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`topography.requestStatus.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {activeTab === "controls" && (
              <>
                <Select value={filterCtrlResult} onValueChange={setFilterCtrlResult}>
                  <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("topography.filters.allResults")}</SelectItem>
                    <SelectItem value="conforme">{t("topography.result.conforme")}</SelectItem>
                    <SelectItem value="nao_conforme">{t("topography.result.nao_conforme")}</SelectItem>
                  </SelectContent>
                </Select>
                <PKRangeFilter onFilter={(f, t) => { setPkFrom(f); setPkTo(t); }} />
              </>
            )}
          </FilterBar>
        </div>

        {/* ── A) Equipamentos ────────────────────────────────────────── */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="flex justify-end"><Button onClick={handleNewEquipment}><Plus className="h-4 w-4 mr-1" />{t("topography.newEquipment")}</Button></div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("topography.table.code")}</TableHead>
                <TableHead>{t("topography.table.type")}</TableHead>
                <TableHead>{t("topography.table.brandModel")}</TableHead>
                <TableHead>{t("topography.table.serial")}</TableHead>
                <TableHead>{t("topography.table.responsible")}</TableHead>
                <TableHead>{t("topography.table.calibration")}</TableHead>
                <TableHead>{t("topography.table.validity")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredEquipment.map((eq) => {
                  const days = getCalibrationDaysInfo(eq.calibration_valid_until);
                  let validityText = "—";
                  let validityClass = "text-muted-foreground";
                  if (days !== null) {
                    if (days < 0) {
                      validityText = t("topography.expiredAgo", { days: Math.abs(days) });
                      validityClass = "text-destructive font-medium";
                    } else if (days <= 30) {
                      validityText = t("topography.expiresIn", { days });
                      validityClass = "text-yellow-600 font-medium";
                    } else {
                      validityText = t("topography.expiresIn", { days });
                      validityClass = "text-primary";
                    }
                  }
                  return (
                    <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/20" onClick={() => handleViewEquipment(eq)}>
                      <TableCell className="font-medium font-mono">{eq.code}</TableCell>
                      <TableCell>{t(`topography.equipmentType.${eq.equipment_type}`, { defaultValue: eq.equipment_type })}</TableCell>
                      <TableCell>{[eq.brand, eq.model].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{eq.serial_number || "—"}</TableCell>
                      <TableCell>{eq.responsible || "—"}</TableCell>
                      <TableCell><CalibrationBadge status={eq.calibration_status} /></TableCell>
                      <TableCell className={cn("text-sm", validityClass)}>{validityText}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewEquipment(eq)} title={t("common.view", { defaultValue: "Ver" })}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleAddCalibration(eq.id)}><Plus className="h-3 w-3 mr-1" />{t("topography.calibrations")}</Button>
                          {isAdmin && <DeleteButton onConfirm={() => handleDeleteEquipment(eq.id)} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredEquipment.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── B) Pedidos ─────────────────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end"><Button onClick={handleNewRequest}><Plus className="h-4 w-4 mr-1" />{t("topography.newRequest")}</Button></div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("topography.table.requestType")}</TableHead>
                <TableHead>{t("common.description")}</TableHead>
                <TableHead>{t("topography.table.zone")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("topography.table.priority")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("topography.cycle.status", { defaultValue: "Ciclo" })}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const cycle = cycleData.find(c => c.request_id === req.id);
                  const cycleStatus = cycle?.cycle_status;
                  const cycleColors: Record<string, string> = {
                    closed_ok: "bg-emerald-500/10 text-emerald-600",
                    closed_nok: "bg-destructive/10 text-destructive",
                    overdue: "bg-destructive/10 text-destructive",
                    pending: "bg-amber-500/10 text-amber-600",
                  };
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{t(`topography.requestType.${req.request_type}`, { defaultValue: req.request_type })}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{req.description}</TableCell>
                      <TableCell>{req.zone || "—"}</TableCell>
                      <TableCell>{req.request_date}</TableCell>
                      <TableCell><PriorityBadge priority={req.priority} /></TableCell>
                      <TableCell><StatusBadge status={req.status} /></TableCell>
                      <TableCell>
                        {cycleStatus ? (
                          <div className="space-y-0.5">
                            <Badge className={cn("border-0 text-[10px]", cycleColors[cycleStatus] ?? "bg-muted text-muted-foreground")}>
                              {t(`topography.cycle.${cycleStatus}`, { defaultValue: cycleStatus })}
                            </Badge>
                            {(cycleStatus === "closed_ok" || cycleStatus === "closed_nok") && cycle && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary"
                                  onClick={(e) => { e.stopPropagation(); setSelectedCycle(cycle); setDetailSheetOpen(true); }}>
                                  {t("topography.cycle.viewDetail")}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRequest(req)} title={t("common.view", { defaultValue: "Ver" })}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRequest(req)} title={t("common.edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <DeleteButton onConfirm={() => handleDeleteRequest(req.id)} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── C) Controlo Geométrico ─────────────────────────────────── */}
        <TabsContent value="controls" className="space-y-4">
          <div className="flex justify-end"><Button onClick={handleNewControl}><Plus className="h-4 w-4 mr-1" />{t("topography.newControl")}</Button></div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("topography.table.ftCode")}</TableHead>
                <TableHead>{t("topography.table.element")}</TableHead>
                <TableHead>{t("topography.table.zone")}</TableHead>
                <TableHead>{t("topography.table.equipment")}</TableHead>
                <TableHead>{t("topography.table.cotaProjeto")}</TableHead>
                <TableHead>{t("topography.table.cotaExecutado")}</TableHead>
                <TableHead>{t("topography.table.deviation")}</TableHead>
                <TableHead>{t("topography.table.result")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("topography.table.links", { defaultValue: "Ligações" })}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredControls.map((ctrl) => {
                  const eq = equipment.find(e => e.id === ctrl.equipment_id);
                  const wi = (ctrl as any).work_items;
                  const ppi = (ctrl as any).ppi_instances;
                  const nc = (ctrl as any).non_conformities;
                  return (
                    <TableRow key={ctrl.id}>
                      <TableCell className="font-mono text-xs">{(ctrl as any).ft_code || "—"}</TableCell>
                      <TableCell className="font-medium">{ctrl.element}</TableCell>
                      <TableCell>{ctrl.zone || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{eq?.code || "—"}</TableCell>
                      <TableCell>{(ctrl as any).cota_projeto != null ? (ctrl as any).cota_projeto : "—"}</TableCell>
                      <TableCell>{(ctrl as any).cota_executado != null ? (ctrl as any).cota_executado : "—"}</TableCell>
                      <TableCell>{ctrl.deviation || "—"}</TableCell>
                      <TableCell><Badge variant={ctrl.result === "conforme" ? "default" : "destructive"}>{t(`topography.result.${ctrl.result}`)}</Badge></TableCell>
                      <TableCell>{ctrl.execution_date}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {wi && <span className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 inline-flex">WI: {wi.sector}{wi.elemento ? ` · ${wi.elemento}` : ""}</span>}
                          {ppi && <span className="text-[10px] text-primary bg-primary/8 rounded px-1.5 py-0.5 inline-flex">PPI: {ppi.code}</span>}
                          {nc && <span className="text-[10px] text-destructive bg-destructive/8 rounded px-1.5 py-0.5 inline-flex">NC: {nc.code}</span>}
                          {!wi && !ppi && !nc && <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditControl(ctrl)} title={t("common.view", { defaultValue: "Ver" })}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditControl(ctrl)} title={t("common.edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <DeleteButton onConfirm={() => handleDeleteControl(ctrl.id)} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredControls.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── D) Levantamentos ───────────────────────────────────────── */}
        <TabsContent value="surveys" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && <Button onClick={handleNewSurvey}><Plus className="h-4 w-4 mr-1" />{t("survey.newRecord", { defaultValue: "Novo Levantamento" })}</Button>}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("survey.table.areaPk", { defaultValue: "Área / PK" })}</TableHead>
                <TableHead>{t("common.description")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredSurveys.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium font-mono">{s.area_or_pk}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">{s.description ?? "—"}</TableCell>
                    <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", SURVEY_STATUS_COLORS[s.status] ?? "")}>
                        {t(`survey.status.${s.status}`, { defaultValue: s.status })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSurvey(s)} title={t("common.view", { defaultValue: "Ver" })}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditSurvey(s)} title={t("common.edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                        {canDelete && <DeleteButton onConfirm={() => handleDeleteSurvey(s.id)} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSurveys.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── E) Documentos ──────────────────────────────────────────── */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && (
              <Button onClick={() => { setEditDoc(null); setDocDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />{t("topography.newDocument")}
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("topography.table.code")}</TableHead>
                <TableHead>{t("documents.form.title")}</TableHead>
                <TableHead>{t("documents.form.type")}</TableHead>
                <TableHead>{t("documents.form.revision")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topoDocuments.map((doc) => (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/documents/${doc.id}`)}>
                    <TableCell className="font-medium font-mono text-xs">{doc.code || "—"}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{doc.title}</TableCell>
                    <TableCell>{t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })}</TableCell>
                    <TableCell className="font-mono text-xs">Rev. {doc.revision ?? "0"}</TableCell>
                    <TableCell>
                      <Badge variant={doc.status === "approved" ? "default" : "secondary"} className="text-xs">
                        {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/documents/${doc.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDoc(doc); setDocDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <DeleteButton onConfirm={async () => {
                            try {
                              const { documentService } = await import("@/lib/services/documentService");
                              await documentService.softDelete(doc.id, activeProject.id);
                              toast.success(t("topography.toast.deleted"));
                              refetchDocs();
                            } catch { toast.error(t("topography.toast.deleteError")); }
                          }} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {topoDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-3">
                        <FolderOpen className="h-8 w-8 opacity-30" />
                        <p>{t("topography.noDocuments")}</p>
                        <div className="flex gap-2">
                          {canCreate && (
                            <Button variant="outline" size="sm" onClick={() => { setEditDoc(null); setDocDialogOpen(true); }}>
                              <Plus className="h-3.5 w-3.5 mr-1" />{t("topography.newDocument")}
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              disabled={seeding}
                              onClick={async () => {
                                setSeeding(true);
                                try {
                                  const count = await seedTopographyDocuments(activeProject.id);
                                  toast.success(t("topography.seedSuccess", { count }));
                                  refetchDocs();
                                } catch (e) {
                                  toast.error(t("topography.seedError"));
                                } finally {
                                  setSeeding(false);
                                }
                              }}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              {seeding ? t("common.loading") : t("topography.seedDocs", { count: TOPOGRAPHY_SEED_COUNT })}
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SurveyFormDialog open={surveyDialogOpen} onOpenChange={setSurveyDialogOpen} record={editSurvey} onSuccess={() => { refetchSurveys(); setSurveyDialogOpen(false); }} />
      <EquipmentFormDialog open={eqDialogOpen} onOpenChange={setEqDialogOpen} projectId={activeProject.id} equipment={viewEquipment} onSuccess={() => { refetchEq(); setEqDialogOpen(false); }} />
      <CalibrationFormDialog open={calDialogOpen} onOpenChange={setCalDialogOpen} projectId={activeProject.id} equipmentId={calEquipmentId} onSuccess={() => { refetchCal(); refetchEq(); setCalDialogOpen(false); }} />
      <RequestFormDialog open={reqDialogOpen} onOpenChange={setReqDialogOpen} projectId={activeProject.id} editRequest={editRequest} onSuccess={() => { refetchReq(); setReqDialogOpen(false); }} />
      <ControlFormDialog open={ctrlDialogOpen} onOpenChange={setCtrlDialogOpen} projectId={activeProject.id} equipment={equipment} editControl={editControl} onSuccess={() => { refetchCtrl(); setCtrlDialogOpen(false); }} />
      <DocumentFormDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        document={editDoc}
        defaultValues={{ disciplina: "topografia" }}
        onSuccess={() => { refetchDocs(); setDocDialogOpen(false); }}
      />

      {/* Cycle Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("topography.cycle.viewDetail")}</SheetTitle>
          </SheetHeader>
          {selectedCycle && (
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("topography.cycle.element")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.control_element ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("common.date")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.control_date ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("topography.cycle.tolerance")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.tolerance ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("topography.cycle.measured")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.measured_value ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("topography.cycle.deviation")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.deviation ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("common.status")}</p>
                  <p className="text-sm text-foreground">{t(`topography.cycle.${selectedCycle.cycle_status}`, { defaultValue: selectedCycle.cycle_status })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("topography.cycle.executedBy")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.technician ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("topography.cycle.equipment")}</p>
                  <p className="text-sm text-foreground">{selectedCycle.equipment_code ?? "—"}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
