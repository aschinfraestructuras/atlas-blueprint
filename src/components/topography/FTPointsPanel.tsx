import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FTPoint {
  id: string;
  point_no: number;
  pk_element: string | null;
  x_proj: number | null;
  x_med: number | null;
  y_proj: number | null;
  y_med: number | null;
  z_proj: number | null;
  z_med: number | null;
  delta_x: number | null;
  delta_y: number | null;
  delta_z: number | null;
  ok_nc: string;
}

interface Props {
  controlId: string;
  projectId: string;
}

export function FTPointsPanel({ controlId, projectId }: Props) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<FTPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    pk_element: "", x_proj: "", x_med: "", y_proj: "", y_med: "", z_proj: "", z_med: "", ok_nc: "ok",
  });

  const fetchPoints = useCallback(async () => {
    const { data } = await supabase
      .from("topography_ft_points" as any)
      .select("*")
      .eq("control_id", controlId)
      .order("point_no", { ascending: true });
    setPoints((data as any[]) ?? []);
    setLoading(false);
  }, [controlId]);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const nextNo = points.length > 0 ? Math.max(...points.map(p => p.point_no)) + 1 : 1;
      await supabase.from("topography_ft_points" as any).insert({
        control_id: controlId,
        project_id: projectId,
        point_no: nextNo,
        pk_element: form.pk_element || null,
        x_proj: form.x_proj ? Number(form.x_proj) : null,
        x_med: form.x_med ? Number(form.x_med) : null,
        y_proj: form.y_proj ? Number(form.y_proj) : null,
        y_med: form.y_med ? Number(form.y_med) : null,
        z_proj: form.z_proj ? Number(form.z_proj) : null,
        z_med: form.z_med ? Number(form.z_med) : null,
        ok_nc: form.ok_nc,
      });
      toast.success(t("topographyFt.saved"));
      setForm({ pk_element: "", x_proj: "", x_med: "", y_proj: "", y_med: "", z_proj: "", z_med: "", ok_nc: "ok" });
      fetchPoints();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("topography_ft_points" as any).delete().eq("id", id);
    toast.success(t("topographyFt.deleted"));
    fetchPoints();
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{t("topographyFt.title")}</h4>
      </div>

      {points.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("topographyFt.noPoints")}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[10px] font-bold uppercase">N.º</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">{t("topographyFt.pkElement")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">X {t("topographyFt.projected")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">X {t("topographyFt.measured")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">ΔX</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Y {t("topographyFt.projected")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Y {t("topographyFt.measured")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">ΔY</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Z {t("topographyFt.projected")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Z {t("topographyFt.measured")}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">ΔZ</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">{t("topographyFt.okNc")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-mono">{p.point_no}</TableCell>
                  <TableCell className="text-xs">{p.pk_element ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{p.x_proj?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{p.x_med?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums font-medium">{p.delta_x?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{p.y_proj?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{p.y_med?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums font-medium">{p.delta_y?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{p.z_proj?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{p.z_med?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums font-medium">{p.delta_z?.toFixed(3) ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={p.ok_nc === "ok" ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive"}>
                      {p.ok_nc === "ok" ? "OK" : "NC"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Quick add form */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 items-end">
        <div>
          <Label className="text-[10px]">{t("topographyFt.pkElement")}</Label>
          <Input className="h-7 text-xs" value={form.pk_element} onChange={e => setForm(f => ({ ...f, pk_element: e.target.value }))} placeholder="PK 30+125" />
        </div>
        <div>
          <Label className="text-[10px]">X proj</Label>
          <Input className="h-7 text-xs" type="number" step="0.001" value={form.x_proj} onChange={e => setForm(f => ({ ...f, x_proj: e.target.value }))} />
        </div>
        <div>
          <Label className="text-[10px]">X med</Label>
          <Input className="h-7 text-xs" type="number" step="0.001" value={form.x_med} onChange={e => setForm(f => ({ ...f, x_med: e.target.value }))} />
        </div>
        <div>
          <Label className="text-[10px]">Y proj</Label>
          <Input className="h-7 text-xs" type="number" step="0.001" value={form.y_proj} onChange={e => setForm(f => ({ ...f, y_proj: e.target.value }))} />
        </div>
        <div>
          <Label className="text-[10px]">Y med</Label>
          <Input className="h-7 text-xs" type="number" step="0.001" value={form.y_med} onChange={e => setForm(f => ({ ...f, y_med: e.target.value }))} />
        </div>
        <div>
          <Label className="text-[10px]">Z proj</Label>
          <Input className="h-7 text-xs" type="number" step="0.001" value={form.z_proj} onChange={e => setForm(f => ({ ...f, z_proj: e.target.value }))} />
        </div>
        <div>
          <Label className="text-[10px]">Z med</Label>
          <Input className="h-7 text-xs" type="number" step="0.001" value={form.z_med} onChange={e => setForm(f => ({ ...f, z_med: e.target.value }))} />
        </div>
        <div className="flex gap-1 items-end">
          <Select value={form.ok_nc} onValueChange={v => setForm(f => ({ ...f, ok_nc: v }))}>
            <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="nc">NC</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" className="h-7 w-7" onClick={handleAdd} disabled={adding}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
