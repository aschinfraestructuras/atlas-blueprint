import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { recycledMaterialService, type RecycledMaterial, type RecycledMaterialDocument } from "@/lib/services/recycledMaterialService";
import { RecycledMaterialFormDialog } from "./RecycledMaterialFormDialog";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string | null;
  onUpdated?: () => void;
}

export function RecycledMaterialDetailSheet({ open, onOpenChange, materialId, onUpdated }: Props) {
  const { t } = useTranslation();
  const [item, setItem] = useState<RecycledMaterial | null>(null);
  const [docs, setDocs] = useState<RecycledMaterialDocument[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (open && materialId) {
      recycledMaterialService.getById(materialId).then(setItem).catch(() => {});
      recycledMaterialService.getDocuments(materialId).then(setDocs).catch(() => {});
    }
  }, [open, materialId]);

  if (!item) return null;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm mt-0.5">{value ?? "—"}</div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex-1">{item.reference_number}</SheetTitle>
              <Badge className={STATUS_COLORS[item.status]} variant="secondary">
                {t(`recycled.status.${item.status}`)}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <InfoRow label={t("recycled.fields.referenceType")} value={t(`recycled.types.${item.reference_type}`)} />
              <InfoRow label={t("recycled.fields.materialName")} value={item.material_name} />
              <InfoRow label={t("recycled.fields.supplier")} value={item.supplier_name} />
              <InfoRow label={t("recycled.fields.recycledPct")} value={item.recycled_content_pct != null ? `${item.recycled_content_pct}%` : null} />
              <InfoRow label={t("recycled.fields.composition")} value={item.composition} />
              <InfoRow label={t("recycled.fields.serialNumber")} value={item.serial_number} />
              <InfoRow label={t("recycled.fields.quantityPlanned")} value={item.quantity_planned != null ? `${item.quantity_planned} ${item.unit ?? ""}` : null} />
              <InfoRow label={t("recycled.fields.quantityUsed")} value={item.quantity_used != null ? `${item.quantity_used} ${item.unit ?? ""}` : null} />
              <InfoRow label={t("recycled.fields.applicationLocation")} value={item.application_location} />
              <InfoRow label={t("recycled.fields.applicationDate")} value={item.application_date} />
              <InfoRow label={t("recycled.fields.certificateNumber")} value={item.certificate_number} />
              <InfoRow label={t("recycled.fields.documentRef")} value={item.document_ref} />
            </div>

            {item.observations && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("recycled.fields.observations")}</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{item.observations}</p>
              </div>
            )}

            {/* Documents */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("recycled.documents.title")}</p>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              ) : (
                <ul className="space-y-1">
                  {docs.map(d => (
                    <li key={d.id} className="text-sm flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{d.document_type}</Badge>
                      <span>{d.document_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Audit trail */}
            <div className="border-t pt-3 text-xs text-muted-foreground space-y-0.5">
              <p>Criado: {new Date(item.created_at).toLocaleString()}</p>
              <p>Atualizado: {new Date(item.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <RecycledMaterialFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={item}
        onSuccess={() => {
          if (materialId) recycledMaterialService.getById(materialId).then(setItem);
          onUpdated?.();
        }}
      />
    </>
  );
}
