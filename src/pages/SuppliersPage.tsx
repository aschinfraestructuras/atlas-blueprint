import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProjectRole } from "@/hooks/useProjectRole";
import { supplierService } from "@/lib/services/supplierService";
import { Truck, Plus, Pencil, Search, Archive, RotateCcw, Eye } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { FilterBar } from "@/components/ui/filter-bar";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import type { Supplier } from "@/lib/services/supplierService";

const QUAL_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  suspended: "bg-accent text-accent-foreground",
  blocked: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export default function SuppliersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { data: suppliers, kpis, loading, error, refetch } = useSuppliers();
  const { canCreate, canEdit } = useProjectRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterQual, setFilterQual] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = useMemo(() => {
    let result = suppliers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.code ?? "").toLowerCase().includes(q) ||
        (s.nif_cif ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") result = result.filter(s => s.status === filterStatus);
    if (filterQual !== "all") result = result.filter(s => (s.qualification_status ?? s.approval_status) === filterQual);
    if (filterCategory !== "all") result = result.filter(s => s.category === filterCategory);
    return result;
  }, [suppliers, search, filterStatus, filterQual, filterCategory]);

  if (!activeProject) return <NoProjectBanner />;

  const handleEdit = (supplier: Supplier) => { setEditingSupplier(supplier); setDialogOpen(true); };
  const handleNew = () => { setEditingSupplier(null); setDialogOpen(true); };
  const handleArchive = async (s: Supplier) => {
    try {
      if (s.status === "archived") {
        await supplierService.activate(s.id, activeProject.id);
        toast({ title: t("suppliers.toast.activated") });
      } else {
        await supplierService.archive(s.id, activeProject.id);
        toast({ title: t("suppliers.toast.archived") });
      }
      refetch();
    } catch (err) {
      const info = classifySupabaseError(err, t);
      toast({ title: info.title, description: info.description ?? info.raw, variant: "destructive" });
    }
  };

  // Export data
  const exportHeaders = [t("suppliers.table.code"), t("common.name"), t("suppliers.form.category"), t("suppliers.form.nifCif"), t("suppliers.form.qualificationStatus"), t("common.status")];
  const exportRows = filtered.map(s => [
    s.code ?? "", s.name, s.category ? t(`suppliers.categories.${s.category}`, { defaultValue: s.category }) : "",
    s.nif_cif ?? "", t(`suppliers.qualificationStatus.${s.qualification_status ?? s.approval_status}`),
    t(`suppliers.status.${s.status}`),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("pages.suppliers.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pages.suppliers.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ReportExportMenu
            options={[
              {
                label: "CSV",
                icon: "csv" as const,
                action: () => {
                  const csv = [exportHeaders.join(";"), ...exportRows.map(r => r.join(";"))].join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `SUP_${activeProject.code ?? "PROJ"}.csv`; a.click(); URL.revokeObjectURL(url);
                },
              },
            ]}
          />
          {canCreate && (
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("suppliers.newSupplier")}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("suppliers.kpi.total"), value: kpis.suppliers_total },
            { label: t("suppliers.kpi.pendingQual"), value: kpis.suppliers_pending_qualification },
            { label: t("suppliers.kpi.docsExpiring"), value: kpis.supplier_docs_expiring_30d },
            { label: t("suppliers.kpi.withOpenNC"), value: kpis.suppliers_with_open_nc },
          ].map((k, i) => (
            <Card key={i} className="border-0 bg-card shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-black tabular-nums mt-1 text-foreground">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <FilterBar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t("suppliers.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("suppliers.filters.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("suppliers.status.active")}</SelectItem>
            <SelectItem value="suspended">{t("suppliers.status.suspended")}</SelectItem>
            <SelectItem value="blocked">{t("suppliers.status.blocked")}</SelectItem>
            <SelectItem value="archived">{t("suppliers.status.archived")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterQual} onValueChange={setFilterQual}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("suppliers.filters.allQualifications")}</SelectItem>
            <SelectItem value="pending">{t("suppliers.qualificationStatus.pending")}</SelectItem>
            <SelectItem value="approved">{t("suppliers.qualificationStatus.approved")}</SelectItem>
            <SelectItem value="rejected">{t("suppliers.qualificationStatus.rejected")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("suppliers.filters.allCategories")}</SelectItem>
            {["materials", "equipment", "services", "subcontractor", "laboratory", "other"].map(c => (
              <SelectItem key={c} value={c}>{t(`suppliers.categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} subtitleKey="emptyState.suppliers.subtitle" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("suppliers.table.code")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.name")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("suppliers.table.category")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("suppliers.form.nifCif")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("suppliers.form.qualificationStatus")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.status")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{supplier.code ?? "—"}</TableCell>
                  <TableCell className="font-medium text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {supplier.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {supplier.category ? t(`suppliers.categories.${supplier.category}`, { defaultValue: supplier.category }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs">{supplier.nif_cif ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", QUAL_COLORS[supplier.qualification_status ?? supplier.approval_status] ?? "")}>
                      {t(`suppliers.qualificationStatus.${supplier.qualification_status ?? supplier.approval_status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[supplier.status] ?? "")}>
                      {t(`suppliers.status.${supplier.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/suppliers/${supplier.id}`)} title={t("common.view")}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(supplier)} title={t("common.edit")}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleArchive(supplier)} title={supplier.status === "archived" ? t("suppliers.actions.activate") : t("suppliers.actions.archive")}>
                            {supplier.status === "archived" ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editingSupplier} onSuccess={refetch} />
    </div>
  );
}
