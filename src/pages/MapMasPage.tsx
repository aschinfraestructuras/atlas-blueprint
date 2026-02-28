import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { mapMasService, type MapMasDocument, type MapMasFormData } from "@/lib/services/mapMasService";
import { MapMasFormDialog } from "@/components/materials/MapMasFormDialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FileCheck, SendHorizontal, CheckCircle2, XCircle, RotateCcw, Eye, Loader2,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-primary/15 text-primary",
  approved: "bg-chart-2/15 text-chart-2 font-semibold",
  obsolete: "bg-amber-500/15 text-amber-600",
  archived: "bg-muted/60 text-muted-foreground",
};

export default function MapMasPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { canCreate, canEdit } = useProjectRole();

  const [data, setData] = useState<MapMasDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<MapMasDocument | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    try {
      const result = await mapMasService.getByProject(activeProject.id);
      setData(result);
    } catch { /* swallow */ }
    finally { setLoading(false); }
  }, [activeProject]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "all") result = result.filter(d => d.status === filterStatus);
    return result;
  }, [data, search, filterStatus]);

  if (!activeProject) return <NoProjectBanner />;

  const handleAction = async (docId: string, action: "submit" | "approve" | "reject") => {
    setActionLoading(docId);
    try {
      if (action === "submit") await mapMasService.submit(docId, activeProject.id);
      else if (action === "approve") await mapMasService.approve(docId, activeProject.id);
      else if (action === "reject") await mapMasService.reject(docId, activeProject.id);
      toast({ title: t(`mapMas.toast.${action}Success`) });
      fetch();
    } catch (err: any) {
      toast({ title: t("mapMas.toast.error"), description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("mapMas.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("mapMas.subtitle")}</p>
        </div>
        {canCreate && (
          <Button size="sm" className="gap-1.5" onClick={() => { setEditDoc(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            {t("mapMas.newSubmission")}
          </Button>
        )}
      </div>

      <FilterBar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t("mapMas.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("mapMas.filters.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("documents.status.draft")}</SelectItem>
            <SelectItem value="in_review">{t("documents.status.in_review")}</SelectItem>
            <SelectItem value="approved">{t("documents.status.approved")}</SelectItem>
            <SelectItem value="archived">{t("documents.status.archived")}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileCheck} subtitleKey="mapMas.empty" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mapMas.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mapMas.table.title")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mapMas.table.type")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.date")}</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
                const fd = doc.form_data as MapMasFormData | null;
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground">{doc.code ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{doc.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{fd?.submission_type?.replace("_", " ") ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[doc.status] ?? "")}>
                        {t(`documents.status.${doc.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/documents/${doc.id}`)} title={t("common.view")}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canEdit && doc.status === "draft" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDoc(doc); setDialogOpen(true); }} title={t("common.edit")}>
                              <FileCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction(doc.id, "submit")} disabled={actionLoading === doc.id} title={t("mapMas.actions.submit")}>
                              {actionLoading === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        )}
                        {canEdit && doc.status === "in_review" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleAction(doc.id, "approve")} disabled={actionLoading === doc.id} title={t("mapMas.actions.approve")}>
                              {actionLoading === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleAction(doc.id, "reject")} disabled={actionLoading === doc.id} title={t("mapMas.actions.reject")}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <MapMasFormDialog open={dialogOpen} onOpenChange={setDialogOpen} document={editDoc} onSuccess={fetch} />
    </div>
  );
}
