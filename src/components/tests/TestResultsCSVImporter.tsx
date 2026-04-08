/**
 * TestResultsCSVImporter — Importador de resultados de laboratório via CSV/Excel
 * Formato esperado do CSV:
 *   codigo_ensaio | data | amostra | localizacao | pk | valor | resultado | notas
 * Mapeamento: codigo_ensaio → tests_catalog.code → test_id (UUID)
 */

import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { testService } from "@/lib/services/testService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Download,
} from "lucide-react";

interface ParsedRow {
  rowNum: number;
  codigo_ensaio: string;
  data: string;
  amostra?: string;
  localizacao?: string;
  pk?: string;
  valor?: string;
  resultado?: string;
  notas?: string;
  // Resolução
  test_id?: string;
  test_name?: string;
  error?: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detectar separador (ponto e vírgula ou vírgula)
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
  );

  return lines.slice(1).filter(l => l.trim()).map((line, i) => {
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
    const get = (key: string) => {
      const aliases: Record<string, string[]> = {
        codigo_ensaio: ["codigo_ensaio","code","codigo","ensaio","test_code","tipo"],
        data:          ["data","date","data_ensaio","data_resultado"],
        amostra:       ["amostra","sample","sample_ref","ref"],
        localizacao:   ["localizacao","location","local","zona"],
        pk:            ["pk","pk_inicio","localizacao_pk"],
        valor:         ["valor","value","result_value","resultado_valor"],
        resultado:     ["resultado","result","pass_fail","conformidade"],
        notas:         ["notas","notes","obs","observacoes"],
      };
      const keys = aliases[key] ?? [key];
      for (const k of keys) {
        const idx = headers.indexOf(k);
        if (idx >= 0) return cols[idx] ?? "";
      }
      return "";
    };

    return {
      rowNum: i + 2,
      codigo_ensaio: get("codigo_ensaio"),
      data:          get("data"),
      amostra:       get("amostra") || undefined,
      localizacao:   get("localizacao") || undefined,
      pk:            get("pk") || undefined,
      valor:         get("valor") || undefined,
      resultado:     get("resultado") || undefined,
      notas:         get("notas") || undefined,
    };
  });
}

function normalizePassFail(val?: string): "pass" | "fail" | undefined {
  if (!val) return undefined;
  const v = val.toLowerCase().trim();
  if (["pass","ok","conforme","aprovado","s","sim","yes","1","true"].includes(v)) return "pass";
  if (["fail","nok","nao_conforme","reprovado","n","nao","no","0","false"].includes(v)) return "fail";
  return undefined;
}

export function TestResultsCSVImporter({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setRows([]);
    setStep("upload");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const loadCatalog = useCallback(async (): Promise<Map<string, { id: string; name: string }>> => {
    const { data } = await supabase
      .from("tests_catalog" as any)
      .select("id, code, name")
      .eq("active", true);
    const map = new Map<string, { id: string; name: string }>();
    (data ?? []).forEach((e: any) => {
      map.set(e.code.trim().toLowerCase(), { id: e.id, name: e.name });
      map.set(e.name.trim().toLowerCase(), { id: e.id, name: e.name });
    });
    return map;
  }, []);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) return;

    const catalog = await loadCatalog();

    const resolved = parsed.map(row => {
      if (!row.codigo_ensaio) return { ...row, error: `Linha ${row.rowNum}: código de ensaio vazio` };
      if (!row.data) return { ...row, error: `Linha ${row.rowNum}: data vazia` };

      const key = row.codigo_ensaio.trim().toLowerCase();
      const match = catalog.get(key);
      if (!match) return { ...row, error: `Linha ${row.rowNum}: código "${row.codigo_ensaio}" não encontrado no catálogo` };

      return { ...row, test_id: match.id, test_name: match.name };
    });

    setRows(resolved);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!activeProject) return;
    setStep("importing");
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.test_id) { failed++; if (row.error) errors.push(row.error); continue; }
      try {
        const pf = normalizePassFail(row.resultado);
        await testService.create({
          project_id:      activeProject.id,
          test_id:         row.test_id,
          date:            row.data,
          sample_ref:      row.amostra,
          location:        row.localizacao,
          pk_inicio:       row.pk ? parseFloat(row.pk) : undefined,
          notes:           row.notas,
          status_workflow: "completed",
          result_status:   pf === "pass" ? "conforme" : pf === "fail" ? "nao_conforme" : undefined,
          result_payload:  row.valor ? { value: row.valor, imported: true } : { imported: true },
        });
        imported++;
      } catch (e: any) {
        failed++;
        errors.push(`Linha ${row.rowNum}: ${e?.message ?? "erro desconhecido"}`);
      }
    }

    setResult({ imported, failed, errors });
    setStep("done");
    if (imported > 0) onSuccess();
  };

  const validRows = rows.filter(r => r.test_id);
  const errorRows = rows.filter(r => r.error);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            {t("tests.import.title", { defaultValue: "Importar Resultados de Laboratório" })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4 py-2">
              <div
                className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">{t("tests.import.dropHere", { defaultValue: "Arraste um ficheiro CSV aqui ou clique para seleccionar" })}</p>
                <p className="text-xs text-muted-foreground mt-1">CSV com separador ; ou , — máx. 1000 linhas</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              <Card className="bg-muted/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("tests.import.formatTitle", { defaultValue: "Formato esperado do CSV" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-xs font-mono bg-background rounded px-2 py-1.5 border">
                    codigo_ensaio;data;amostra;localizacao;pk;valor;resultado;notas
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    • <strong>codigo_ensaio</strong>: código do catálogo (ex: PE-B01) ou nome do ensaio<br />
                    • <strong>data</strong>: YYYY-MM-DD ou DD/MM/YYYY<br />
                    • <strong>resultado</strong>: OK/NOK, Conforme/Não conforme, pass/fail
                  </p>
                  <Button
                    variant="link" size="sm" className="h-auto p-0 mt-2 text-xs"
                    onClick={() => {
                      const csv = "codigo_ensaio;data;amostra;localizacao;pk;valor;resultado;notas\nPE-B01;2026-04-10;AM-001;Viaduto V1;31.670;32.5;OK;Betonagem pilares P3-P4\nPE-T01;2026-04-10;AM-002;Aterro Km 31;31.500;96.2;OK;\n";
                      const a = document.createElement("a");
                      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
                      a.download = "modelo_importacao.csv";
                      a.click();
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t("tests.import.downloadTemplate", { defaultValue: "Descarregar modelo CSV" })}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validRows.length} prontos para importar
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {errorRows.length} com erro
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-72 rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Ensaio</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Data</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Valor</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Resultado</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.rowNum} className={row.error ? "bg-destructive/5" : "hover:bg-muted/20"}>
                        <td className="px-2 py-1 text-muted-foreground">{row.rowNum}</td>
                        <td className="px-2 py-1 font-medium">{row.test_name ?? row.codigo_ensaio}</td>
                        <td className="px-2 py-1">{row.data}</td>
                        <td className="px-2 py-1">{row.valor ?? "—"}</td>
                        <td className="px-2 py-1">
                          {row.resultado ? (
                            <Badge className={normalizePassFail(row.resultado) === "pass"
                              ? "bg-green-100 text-green-700 text-[10px]"
                              : normalizePassFail(row.resultado) === "fail"
                              ? "bg-destructive/15 text-destructive text-[10px]"
                              : "text-[10px]"
                            }>
                              {row.resultado}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="px-2 py-1">
                          {row.error ? (
                            <span className="text-destructive flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> {row.error.split(":")[1]?.trim() ?? "erro"}
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A importar {validRows.length} resultados...</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && result && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                {result.imported > 0 && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-sm px-3 py-1">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {result.imported} importados com sucesso
                  </Badge>
                )}
                {result.failed > 0 && (
                  <Badge variant="destructive" className="text-sm px-3 py-1">
                    <XCircle className="h-4 w-4 mr-1" />
                    {result.failed} com erro
                  </Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">{e}</p>
                  ))}
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t("common.close")}</Button>
          {step === "preview" && validRows.length > 0 && (
            <Button onClick={handleImport} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {t("tests.import.importBtn", { defaultValue: `Importar ${validRows.length} resultados` })}
            </Button>
          )}
          {step === "preview" && (
            <Button variant="ghost" onClick={reset}>
              {t("tests.import.chooseOther", { defaultValue: "Escolher outro ficheiro" })}
            </Button>
          )}
          {step === "done" && result?.imported === 0 && (
            <Button variant="outline" onClick={reset}>{t("tests.import.tryAgain", { defaultValue: "Tentar novamente" })}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
