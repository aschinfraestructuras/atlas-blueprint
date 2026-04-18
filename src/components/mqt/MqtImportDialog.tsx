import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { parseMqtXml, importMqtItems, type ParsedMqtItem } from "@/lib/services/mqtService";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";

interface MqtImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MqtImportDialog({ open, onOpenChange }: MqtImportDialogProps) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState<string>(new Date().toISOString().slice(0, 10));
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ items: ParsedMqtItem[]; folhas: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setPreview(null);
    setParsing(true);
    try {
      const text = await f.text();
      const items = parseMqtXml(text);
      const folhas = items.filter((i) => i.is_leaf).length;
      setPreview({ items, folhas });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("mqt.import.parseError"));
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !activeProject?.id) return;
    setImporting(true);
    try {
      const { inserted } = await importMqtItems(
        activeProject.id,
        preview.items,
        version,
        user?.id ?? null
      );
      toast.success(t("mqt.import.success", { count: inserted }));
      qc.invalidateQueries({ queryKey: ["mqt-items"] });
      qc.invalidateQueries({ queryKey: ["mqt-summary"] });
      onOpenChange(false);
      // Reset
      setFile(null);
      setPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("mqt.import.error"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("mqt.import.title")}</DialogTitle>
          <DialogDescription>{t("mqt.import.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="mqt-file">{t("mqt.import.file")}</Label>
            <Input
              id="mqt-file"
              type="file"
              accept=".xml,application/xml,text/xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              disabled={parsing || importing}
            />
          </div>

          <div>
            <Label htmlFor="mqt-version">{t("mqt.import.version")}</Label>
            <Input
              id="mqt-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="2025-01-15"
              disabled={importing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("mqt.import.versionHint")}
            </p>
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("mqt.import.parsing")}
            </div>
          )}

          {preview && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{t("mqt.import.preview")}</p>
              <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
                <li>• {t("mqt.import.totalItems")}: <strong>{preview.items.length}</strong></li>
                <li>• {t("mqt.import.leafItems")}: <strong>{preview.folhas}</strong></li>
                <li>• {t("mqt.import.groupers")}: <strong>{preview.items.length - preview.folhas}</strong></li>
              </ul>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                {t("mqt.import.warningOverwrite")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview || importing || !version.trim()}
          >
            {importing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("mqt.import.importing")}</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />{t("mqt.import.confirm")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
