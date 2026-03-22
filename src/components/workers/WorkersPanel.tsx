import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { projectWorkerService, type ProjectWorker, type ProjectWorkerInput } from "@/lib/services/projectWorkerService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RowActionMenu } from "@/components/ui/row-action-menu";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { Users, Plus, Loader2, Pencil, UserMinus, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  inactive: "bg-muted text-muted-foreground",
  left: "bg-destructive/10 text-destructive",
};

interface WorkersPanelProps {
  projectId: string;
  subcontractorId?: string | null; // null = own resources (ASCH)
  company?: string;
}

export function WorkersPanel({ projectId, subcontractorId, company }: WorkersPanelProps) {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<ProjectWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWorker | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ProjectWorker | null>(null);

  const [form, setForm] = useState({
    name: "", role_function: "", worker_number: "",
    has_safety_training: false, status: "active", notes: "",
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectWorkerService.list(projectId, subcontractorId ?? null);
      setWorkers(data);
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    } finally {
      setLoading(false);
    }
  }, [projectId, subcontractorId, t]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = filterActive ? workers.filter(w => w.status === "active") : workers;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", role_function: "", worker_number: "", has_safety_training: false, status: "active", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (w: ProjectWorker) => {
    setEditing(w);
    setForm({
      name: w.name, role_function: w.role_function ?? "", worker_number: w.worker_number ?? "",
      has_safety_training: w.has_safety_training, status: w.status, notes: w.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await projectWorkerService.update(editing.id, {
          name: form.name, role_function: form.role_function || null,
          worker_number: form.worker_number || null,
          has_safety_training: form.has_safety_training,
          status: form.status, notes: form.notes || null,
        });
        toast.success(t("common.saved"));
      } else {
        await projectWorkerService.create({
          project_id: projectId,
          subcontractor_id: subcontractorId ?? null,
          company: company ?? null,
          name: form.name, role_function: form.role_function || null,
          worker_number: form.worker_number || null,
          has_safety_training: form.has_safety_training,
          status: form.status, notes: form.notes || null,
        });
        toast.success(t("common.created"));
      }
      setDialogOpen(false);
      fetch();
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (w: ProjectWorker) => {
    try {
      await projectWorkerService.update(w.id, { status: "inactive" });
      toast.success(t("common.saved"));
      fetch();
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await projectWorkerService.remove(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
      fetch();
    } catch (err) {
      const { title } = classifySupabaseError(err, t);
      toast.error(title);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t("workers.title")}
            {workers.length > 0 && <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterActive ? "active" : "all"} onValueChange={v => setFilterActive(v === "active")}>
              <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("workers.status.active")}</SelectItem>
                <SelectItem value="all">{t("common.all")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1 h-7 text-xs" onClick={openNew}>
              <Plus className="h-3 w-3" /> {t("workers.add")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} subtitleKey="common.noData" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">{t("workers.name")}</TableHead>
                  <TableHead className="text-xs">{t("workers.function")}</TableHead>
                  <TableHead className="text-xs">{t("workers.workerNumber")}</TableHead>
                  <TableHead className="text-xs">{t("workers.safetyTraining")}</TableHead>
                  <TableHead className="text-xs">{t("common.status")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm font-medium">{w.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.role_function ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.worker_number ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", w.has_safety_training ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive")}>
                        {w.has_safety_training ? t("common.yes") : t("common.no")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[w.status] ?? "")}>
                        {t(`workers.status.${w.status}`, { defaultValue: w.status })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RowActionMenu actions={[
                        { label: t("common.edit"), icon: Pencil, onClick: () => openEdit(w) },
                        ...(w.status === "active" ? [{ label: t("workers.deactivate"), icon: UserMinus, onClick: () => handleDeactivate(w) }] : []),
                        { label: t("common.delete"), icon: Trash2, onClick: () => setDeleting(w), variant: "destructive" as const },
                      ]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("common.edit") : t("workers.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>{t("workers.name")} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t("workers.function")}</Label>
              <Input value={form.role_function} onChange={e => setForm(f => ({ ...f, role_function: e.target.value }))} />
            </div>
            <div>
              <Label>{t("workers.workerNumber")}</Label>
              <Input value={form.worker_number} onChange={e => setForm(f => ({ ...f, worker_number: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.has_safety_training} onCheckedChange={v => setForm(f => ({ ...f, has_safety_training: v }))} />
              <Label>{t("workers.safetyTraining")}</Label>
            </div>
            <div>
              <Label>{t("common.status")}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("workers.status.active")}</SelectItem>
                  <SelectItem value="inactive">{t("workers.status.inactive")}</SelectItem>
                  <SelectItem value="left">{t("workers.status.left")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("common.notes")}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.deleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
