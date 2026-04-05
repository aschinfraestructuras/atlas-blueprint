import { useTranslation } from "react-i18next";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface WorkItemReportData {
  work_item: Record<string, any>;
  ppi_instances: Array<{
    code: string;
    template_name: string;
    status: string;
    items: Array<{
      description: string;
      point_type: string;
      status: string;
      observation?: string;
    }>;
  }>;
  test_results: Array<{
    test_name: string;
    standard?: string;
    date: string;
    result_status?: string;
    sample_ref?: string;
    laboratory_name?: string;
    report_number?: string;
  }>;
  non_conformities: Array<{
    code?: string;
    title: string;
    status: string;
    severity: string;
    due_date?: string;
  }>;
  materials: Array<{
    material_name: string;
    pame_status?: string;
    quantity?: number;
    unit?: string;
  }>;
}

function PointTypeBadge({ type }: { type: string }) {
  const u = (type ?? "").toUpperCase();
  if (u === "HP") return <Badge className="text-[10px] py-0 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">HP</Badge>;
  if (u === "WP") return <Badge className="text-[10px] py-0 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">WP</Badge>;
  return <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">{u || "RP"}</Badge>;
}

function PpiItemStatus({ status }: { status: string }) {
  if (status === "aprovado" || status === "approved") return <span>✅</span>;
  if (status === "reprovado" || status === "rejected" || status === "fail") return <span>❌</span>;
  if (status === "pendente" || status === "pending") return <span>⏳</span>;
  return <span className="text-xs text-muted-foreground">{status}</span>;
}

function TestStatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").toLowerCase();
  if (s === "pass" || s === "conforme") return <Badge className="text-[10px] py-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Conforme</Badge>;
  if (s === "fail" || s === "nao_conforme") return <Badge className="text-[10px] py-0 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Não Conforme</Badge>;
  return <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">{status ?? "—"}</Badge>;
}

function NcStatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  if (s === "aberta" || s === "open") return <Badge className="text-[10px] py-0 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">{status}</Badge>;
  if (s === "fechada" || s === "closed") return <Badge className="text-[10px] py-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">{status}</Badge>;
  return <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">{status}</Badge>;
}

function PameBadge({ status }: { status?: string }) {
  const s = (status ?? "").toLowerCase();
  if (s === "approved" || s === "aprovado") return <Badge className="text-[10px] py-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Aprovado</Badge>;
  return <Badge className="text-[10px] py-0 bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">{status ?? "Pendente"}</Badge>;
}

export function WorkItemReportPreview({ data, onClose }: { data: WorkItemReportData; onClose: () => void }) {
  const { t } = useTranslation();
  const wi = data.work_item ?? {};
  const now = new Date();
  const pkRange = wi.pk_inicio != null ? `${wi.pk_inicio}${wi.pk_fim != null ? ` → ${wi.pk_fim}` : ""}` : "—";

  return (
    <>
      <style>{`@media print { body > *:not(.print-root) { display: none !important; } .no-print { display: none !important; } }`}</style>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="print-root max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("workItems.report.title", { defaultValue: "Ficha de Frente de Obra" })}</DialogTitle>

            <div className="flex gap-2 no-print">
              <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" />
                {t("workItems.report.printSave", { defaultValue: "Imprimir / PDF" })}
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            {/* Header */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h2 className="text-base font-bold uppercase tracking-wide text-foreground">FICHA DE FRENTE DE OBRA</h2>
                <p className="text-xs text-muted-foreground">Atlas QMS</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="font-semibold">Actividade</span> {wi.name ?? wi.sector ?? "—"}</p>
                <p><span className="font-semibold">Código</span> {wi.code ?? "—"}</p>
                <p><span className="font-semibold">Elemento</span> {wi.element ?? wi.elemento ?? "—"}</p>
                <p><span className="font-semibold">PK</span> {pkRange}</p>
                <p><span className="font-semibold">Data geração</span> {now.toLocaleDateString("pt-PT")}</p>
              </div>
            </div>

            {/* 1. PPI */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">1. Plano de Inspecção PPI</h3>
              {data.ppi_instances.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t("workItems.report.noPPI", { defaultValue: "Sem PPI associados" })}</p>
              ) : data.ppi_instances.map((ppi, idx) => (
                <div key={idx} className="border rounded p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{ppi.code}</span>
                    <span className="text-xs text-muted-foreground">{ppi.template_name}</span>
                    <Badge variant="outline" className="text-[10px] py-0">{t(`ppi.status.${ppi.status}`, { defaultValue: ppi.status })}</Badge>
                  </div>

                  {ppi.items?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs h-8">Fase / Descrição</TableHead>
                          <TableHead className="text-xs h-8 w-16">Tipo</TableHead>
                          <TableHead className="text-xs h-8 w-16">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ppi.items.map((item, iIdx) => (
                          <TableRow key={iIdx}>
                            <TableCell className="text-xs py-1.5">{item.description}</TableCell>
                            <TableCell className="py-1.5"><PointTypeBadge type={item.point_type} /></TableCell>
                            <TableCell className="py-1.5"><PpiItemStatus status={item.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>

            {/* 2. Tests */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">2. Ensaios Realizados</h3>
              {data.test_results.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t("workItems.report.noTests", { defaultValue: "Sem ensaios registados" })}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Ensaio</TableHead>
                      <TableHead className="text-xs h-8">Norma</TableHead>
                      <TableHead className="text-xs h-8">Amostra</TableHead>
                      <TableHead className="text-xs h-8">Data</TableHead>
                      <TableHead className="text-xs h-8">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.test_results.map((tr, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs py-1.5">
                          {tr.test_name}
                          {tr.laboratory_name && (
                            <p className="text-[10px] text-muted-foreground">
                              {tr.laboratory_name}{tr.report_number ? ` · ${tr.report_number}` : ""}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">{tr.standard ?? "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{tr.sample_ref ?? "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{tr.date ? new Date(tr.date).toLocaleDateString("pt-PT") : "—"}</TableCell>
                        <TableCell className="py-1.5"><TestStatusBadge status={tr.result_status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 3. NCs */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">3. Não Conformidades</h3>
              {data.non_conformities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">✅ {t("workItems.report.noNCs", { defaultValue: "Sem não conformidades" })}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Código</TableHead>
                      <TableHead className="text-xs h-8">Título</TableHead>
                      <TableHead className="text-xs h-8">Gravidade</TableHead>
                      <TableHead className="text-xs h-8">Estado</TableHead>
                      <TableHead className="text-xs h-8">Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.non_conformities.map((nc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs py-1.5">{nc.code ?? "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{nc.title}</TableCell>
                        <TableCell className="text-xs py-1.5">{nc.severity ?? "—"}</TableCell>
                        <TableCell className="py-1.5"><NcStatusBadge status={nc.status} /></TableCell>
                        <TableCell className="text-xs py-1.5">{nc.due_date ? new Date(nc.due_date).toLocaleDateString("pt-PT") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 4. Materials */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">4. Materiais Aprovados (PAME)</h3>
              {data.materials.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t("workItems.report.noMaterials", { defaultValue: "Sem materiais associados" })}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Material</TableHead>
                      <TableHead className="text-xs h-8">PAME</TableHead>
                      <TableHead className="text-xs h-8">Quantidade</TableHead>
                      <TableHead className="text-xs h-8">Unidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.materials.map((mat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs py-1.5">{mat.material_name}</TableCell>
                        <TableCell className="py-1.5"><PameBadge status={mat.pame_status} /></TableCell>
                        <TableCell className="text-xs py-1.5">{mat.quantity != null ? mat.quantity : "—"}</TableCell>
                        <TableCell className="text-xs py-1.5">{mat.unit ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Footer */}
            <div className="text-[10px] text-muted-foreground text-center border-t pt-2">
              {t("workItems.report.footer", { defaultValue: "Gerado automaticamente" })} em {now.toLocaleString("pt-PT")} · Para uso interno — UTE OHLA-ASCH
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
