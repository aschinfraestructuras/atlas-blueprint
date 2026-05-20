import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Upload, Trash2, Eye, EyeOff, Loader2, Download, Palette, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useProjectMapLayers } from "@/hooks/useProjectMapLayers";
import {
  createLayer, deleteLayer, updateLayerStyle, updateLayerVisibilityDefault,
  getLayerFileUrl, detectFormat, type MapLayerType, type ProjectMapLayer,
} from "@/lib/services/mapLayerService";
import { useProject } from "@/contexts/ProjectContext";

const TYPE_OPTIONS: { value: MapLayerType; label: string }[] = [
  { value: "alignment",     label: "Traçado / Alinhamento" },
  { value: "zones",         label: "Zonas / Frentes de Obra" },
  { value: "structures",    label: "Estruturas / OAs" },
  { value: "expropriation", label: "Expropriações" },
  { value: "utilities",     label: "Infraestruturas / Serviços" },
  { value: "environment",   label: "Ambiental" },
  { value: "other",         label: "Outro" },
];

const PRESET_COLORS = ["#06b6d4", "#185FA5", "#1D9E75", "#BA7517", "#E24B4A", "#7C3AED", "#0F766E", "#DC2626"];

export function MapLayersSection() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { layers, loading } = useProjectMapLayers();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MapLayerType>("alignment");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMapLayer | null>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fmt = detectFormat(f.name);
    if (!fmt) {
      toast.error(t("mapLayers.invalidFormat", { defaultValue: "Formato inválido. Use KMZ, KML ou GeoJSON." }));
      return;
    }
    setPendingFile(f);
    setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!pendingFile || !activeProject || !name.trim()) return;
    setUploading(true);
    try {
      await createLayer({
        projectId: activeProject.id,
        file: pendingFile,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        style: { color },
      });
      toast.success(t("mapLayers.uploadSuccess", { defaultValue: "Camada adicionada" }));
      setPendingFile(null);
      setName("");
      setDescription("");
      setColor(PRESET_COLORS[0]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao processar ficheiro");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVisibility = async (layer: ProjectMapLayer) => {
    try {
      await updateLayerVisibilityDefault(layer.id, !layer.visible_default);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro");
    }
  };

  const handleChangeColor = async (layer: ProjectMapLayer, newColor: string) => {
    try {
      await updateLayerStyle(layer.id, { color: newColor });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro");
    }
  };

  const handleDownload = async (layer: ProjectMapLayer) => {
    const url = await getLayerFileUrl(layer.file_path);
    if (url) window.open(url, "_blank");
    else toast.error("Erro ao gerar link");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLayer(deleteTarget.id);
      toast.success(t("mapLayers.deleted", { defaultValue: "Camada removida" }));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
        <Layers className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
          {t("mapLayers.intro", {
            defaultValue: "Carregue ficheiros KMZ, KML ou GeoJSON com o traçado, zonas de obra, estruturas, expropriações ou outras camadas geográficas. Estas camadas ficam sobrepostas ao Mapa da Obra para todos os membros do projecto.",
          })}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12.5px] font-semibold">
            {t("mapLayers.newLayer", { defaultValue: "Nova camada" })}
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".kmz,.kml,.geojson,.json"
          onChange={handleFilePick}
          className="hidden"
        />
        {!pendingFile ? (
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2 w-full">
            <Upload className="h-3.5 w-3.5" />
            {t("mapLayers.pickFile", { defaultValue: "Escolher ficheiro (KMZ / KML / GeoJSON)" })}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded px-2.5 py-1.5">
              <MapPin className="h-3 w-3 text-primary" />
              <span className="font-mono truncate">{pendingFile.name}</span>
              <Badge variant="outline" className="text-[9px] ml-auto uppercase">
                {detectFormat(pendingFile.name)}
              </Badge>
              <span className="text-[9.5px] tabular-nums">
                {(pendingFile.size / 1024).toFixed(0)} KB
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("mapLayers.name", { defaultValue: "Nome" })}
                </Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("mapLayers.type", { defaultValue: "Tipo" })}
                </Label>
                <Select value={type} onValueChange={(v) => setType(v as MapLayerType)}>
                  <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("mapLayers.description", { defaultValue: "Descrição (opcional)" })}
              </Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs mt-0.5" />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("mapLayers.color", { defaultValue: "Cor no mapa" })}
              </Label>
              <div className="flex gap-1.5 mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-md border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                {t("common.cancel", { defaultValue: "Cancelar" })}
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={uploading || !name.trim()} className="gap-2">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {t("mapLayers.upload", { defaultValue: "Adicionar camada" })}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("mapLayers.currentLayers", { defaultValue: "Camadas actuais" })}
          </span>
          <Badge variant="secondary" className="text-[9px] tabular-nums">{layers.length}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : layers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic text-center py-4">
            {t("mapLayers.empty", { defaultValue: "Ainda não há camadas. Adicione a primeira acima." })}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {layers.map((layer) => (
              <li key={layer.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: layer.style.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">{layer.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {TYPE_OPTIONS.find((o) => o.value === layer.type)?.label ?? layer.type}
                    {layer.feature_count != null && ` · ${layer.feature_count} feature${layer.feature_count === 1 ? "" : "s"}`}
                    {` · ${layer.file_format.toUpperCase()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <details className="relative">
                    <summary className="list-none cursor-pointer p-1.5 rounded hover:bg-muted" title={t("mapLayers.changeColor", { defaultValue: "Alterar cor" })}>
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    </summary>
                    <div className="absolute right-0 top-full mt-1 z-50 p-2 bg-popover border border-border rounded-lg shadow-lg flex gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleChangeColor(layer, c)}
                          className="w-6 h-6 rounded border-2"
                          style={{ backgroundColor: c, borderColor: layer.style.color === c ? "hsl(var(--foreground))" : "transparent" }}
                        />
                      ))}
                    </div>
                  </details>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleToggleVisibility(layer)}
                    title={layer.visible_default ? t("mapLayers.hideByDefault", { defaultValue: "Ocultar por defeito" }) : t("mapLayers.showByDefault", { defaultValue: "Mostrar por defeito" })}
                  >
                    {layer.visible_default
                      ? <Eye className="h-3.5 w-3.5 text-primary" />
                      : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(layer)} title={t("common.download", { defaultValue: "Descarregar" })}>
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-destructive/10" onClick={() => setDeleteTarget(layer)} title={t("common.delete", { defaultValue: "Eliminar" })}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mapLayers.confirmDeleteTitle", { defaultValue: "Remover camada?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mapLayers.confirmDeleteDesc", {
                defaultValue: 'A camada "{{name}}" deixa de aparecer no mapa. O ficheiro original fica preservado para auditoria.',
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", { defaultValue: "Cancelar" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete", { defaultValue: "Eliminar" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
