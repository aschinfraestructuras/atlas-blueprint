/**
 * MeetingsTab — Vista de Reuniões no Escritório Técnico
 *
 * NÃO cria dados próprios. Lê directamente os documentos ATA-Q
 * da tabela `documents` (form_schema + form_data) — a mesma fonte
 * que a DocumentsPage e o MeetingActionsPanel.
 *
 * Fonte única de verdade: documentos ATA-Q em `documents`.
 * Dois pontos de acesso: Documentos (criação/edição) + ET (vista rápida).
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays, Plus, Search, ExternalLink, Eye, FileDown,
  Loader2, CheckCircle2, Clock, AlertCircle, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { printHtml } from "@/lib/services/reportService";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { useSignatureSlots } from "@/hooks/useSignatureSlots";
import { signatureBlockHtml } from "@/lib/services/signatureService";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";

interface AtaDoc {
  id: string;
  code: string;
  title: string;
  status: string;
  created_at: string;
  form_data: Record<string, string> | null;
}

function parseDecisoes(text: string) {
  if (!text?.trim()) return [];
  return text.split("\n").filter(l => l.trim()).map((line, i) => {
    const cleaned = line.replace(/^\d+\.\s*/, "").trim();
    const respMatch = cleaned.match(/[—\-]\s*(?:Responsável|Responsable|Resp\.?)\s*:\s*([^—\-]+)/i);
    const dateMatch = cleaned.match(/[—\-]\s*(?:Prazo|Plazo|Data)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    return {
      id: String(i),
      text: cleaned.replace(/[—\-].*$/,"").trim(),
      responsible: respMatch?.[1]?.trim() ?? null,
      due_date: dateMatch?.[1] ?? null,
    };
  });
}

export function MeetingsTab() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const { logoBase64 } = useProjectLogo();
  const sigSlots = useSignatureSlots("audit");

  const [docs, setDocs] = useState<AtaDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<AtaDoc | null>(null);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents" as any)
      .select("id, code, title, status, created_at, form_data")
      .eq("project_id", activeProject.id)
      .eq("doc_type", "record")
      .eq("is_deleted", false)
      .not("form_data", "is", null)
      .order("created_at", { ascending: false });

    // Filtrar só os que têm campos de reunião
    const atas = ((data ?? []) as AtaDoc[]).filter(d =>
      d.form_data?.numero_ata || d.form_data?.data_reuniao
    );
    setDocs(atas);
    setLoading(false);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const goToCreate = () => navigate("/documents?template=tpl-ata-q");
  const goToDoc = (id: string) => navigate(`/documents/${id}`);

  const exportPdf = (doc: AtaDoc) => {
    const fd = doc.form_data ?? {};
    const sigHtml = sigSlots.length > 0 ? signatureBlockHtml(sigSlots) : `
      <div style="display:flex;gap:40px;margin-top:32px;border-top:2px solid #1e3a5f;padding-top:16px;">
        <div style="flex:1;text-align:center;"><div style="border-bottom:1px solid #1e3a5f;height:40px;margin-bottom:4px;"></div>
          <div style="font-size:9px;font-weight:700;color:#1e3a5f;">${t("meetings.fields.elaboratedBy")}</div>
          <div style="font-size:8px;color:#6b7280;">${fd.elaborado_por ?? ""}</div></div>
        <div style="flex:1;text-align:center;"><div style="border-bottom:1px solid #1e3a5f;height:40px;margin-bottom:4px;"></div>
          <div style="font-size:9px;font-weight:700;color:#1e3a5f;">${t("meetings.fields.verifiedBy")}</div>
          <div style="font-size:8px;color:#6b7280;">${fd.verificado_por ?? ""}</div></div>
      </div>`;

    const decisoes = parseDecisoes(fd.decisoes ?? "");
    const decisoesHtml = decisoes.map((d, i) => `
      <tr style="background:${i%2===0?"#f9fafb":"white"}">
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${d.text}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${d.responsible ?? "—"}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${d.due_date ?? "—"}</td>
      </tr>`).join("");

    const block = (label: string, val: string | undefined) => val?.trim()
      ? `<div style="margin:10px 0;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:4px;">${label}</div>
          <div style="background:#f0f4f8;border-left:3px solid #1e3a5f;padding:8px 12px;font-size:10.5px;white-space:pre-wrap;">${val}</div>
         </div>`
      : "";

    const header = fullPdfHeader(logoBase64 ?? null, activeProject?.name ?? "", doc.code ?? "", "0",
      fd.data_reuniao ? new Date(fd.data_reuniao).toLocaleDateString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT") : new Date(doc.created_at).toLocaleDateString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT"));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>@page{size:A4;margin:18mm}body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1a1a1a;margin:0;padding:20px}
    table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:white;padding:5px 8px;font-size:10px;text-align:left;border:1px solid #1e3a5f}</style>
    </head><body>
    ${header}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0;background:#f0f4f8;padding:10px;border-radius:6px;">
      <div><b>${t("meetings.fields.ataNumber")}:</b> ${fd.numero_ata ?? "—"}</div>
      <div><b>${t("meetings.fields.date")}:</b> ${fd.data_reuniao ? new Date(fd.data_reuniao).toLocaleDateString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT") : "—"}</div>
      <div><b>${t("meetings.fields.location")}:</b> ${fd.local ?? "—"}</div>
      <div><b>${t("meetings.fields.schedule")}:</b> ${fd.hora_inicio ?? "—"} – ${fd.hora_fim ?? "—"}</div>
      <div><b>${t("meetings.fields.type")}:</b> ${fd.tipo_reuniao ?? "—"}</div>
      <div><b>${t("meetings.fields.calledBy")}:</b> ${fd.convocada_por ?? "—"}</div>
    </div>
    ${block(t("meetings.fields.attendeesContractor"), fd.participantes_empreiteiro)}
    ${block(t("meetings.fields.attendeesSupervisor"), fd.participantes_fiscalizacao)}
    ${block(t("meetings.fields.attendeesOwner"), fd.participantes_dono_obra)}
    ${fd.participantes_outros ? block(t("meetings.fields.attendeesOthers"), fd.participantes_outros) : ""}
    ${block(t("meetings.fields.agenda"), fd.ordem_trabalhos)}
    ${block(t("meetings.fields.discussions"), fd.assuntos_tratados)}
    ${decisoes.length ? `
      <div style="margin:10px 0;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1e3a5f;margin-bottom:4px;">${t("meetings.fields.decisions")}</div>
        <table><tr><th>Decisão</th><th>Responsável</th><th>Prazo</th></tr>${decisoesHtml}</table>
      </div>` : ""}
    ${block(t("meetings.fields.pendingActions", { defaultValue: "Acções Pendentes de Reuniões Anteriores" }), fd.acoes_pendentes)}
    ${block("Observações", fd.observacoes)}
    ${fd.proxima_reuniao ? `<p style="font-size:10px;color:#6b7280;margin-top:12px;">${t("meetings.fields.nextMeeting")}: <b>${new Date(fd.proxima_reuniao).toLocaleDateString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT")}</b></p>` : ""}
    ${sigHtml}
    <div style="text-align:center;font-size:8px;color:#999;margin-top:20px;">
      Atlas QMS · ${doc.code} · Gerado em ${new Date().toLocaleString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT")}
    </div></body></html>`;

    printHtml(html, `${doc.code ?? "ATA-Q"}.pdf`);
  };

  const statusColor: Record<string, string> = {
    draft:     "bg-amber-500/10 text-amber-700 border-amber-500/30",
    approved:  "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    in_review: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    archived:  "bg-gray-500/10 text-gray-700 border-gray-500/30",
  };

  const filtered = docs.filter(d => {
    const s = search.toLowerCase();
    const fd = d.form_data ?? {};
    return !s ||
      (d.code ?? "").toLowerCase().includes(s) ||
      (fd.numero_ata ?? "").toLowerCase().includes(s) ||
      (fd.tipo_reuniao ?? "").toLowerCase().includes(s) ||
      (fd.local ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">

      {/* Aviso de fonte única */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800/40 p-3 text-xs text-blue-800 dark:text-blue-300">
        <CalendarDays className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>
          {t("meetings.sourceNotice")}
          {" "}<button className="underline font-medium" onClick={() => navigate("/documents")}>{t("meetings.goToDocs")}</button>
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder={t("meetings.searchPlaceholder")}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={goToCreate}>
          <Plus className="h-3.5 w-3.5" />{t("meetings.newAta")}
        </Button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>{t("meetings.empty")}</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs gap-1" onClick={goToCreate}>
            <Plus className="h-3 w-3" />{t("meetings.newAta")}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">{t("meetings.fields.ataNumber")}</TableHead>
                <TableHead className="text-xs">{t("meetings.fields.type")}</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Data</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">{t("meetings.fields.location")}</TableHead>
                <TableHead className="text-xs hidden md:table-cell">{t("meetings.fields.decisionsCount")}</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => {
                const fd = doc.form_data ?? {};
                const nDecisoes = parseDecisoes(fd.decisoes ?? "").length;
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono font-medium">
                      {fd.numero_ata || doc.code || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fd.tipo_reuniao || "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell">
                      {fd.data_reuniao ? new Date(fd.data_reuniao).toLocaleDateString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT") : "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">
                      {fd.local ? fd.local.slice(0, 30) + (fd.local.length > 30 ? "…" : "") : "—"}
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell">
                      {nDecisoes > 0 ? (
                        <span className="text-amber-700">{nDecisoes} decisão{nDecisoes !== 1 ? "ões" : ""}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", statusColor[doc.status] ?? "")}>
                        {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setViewing(doc)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => goToDoc(doc.id)}><ExternalLink className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => exportPdf(doc)}><FileDown className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet detalhe rápido */}
      <Sheet open={!!viewing} onOpenChange={v => { if (!v) setViewing(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {viewing && (() => {
            const fd = viewing.form_data ?? {};
            const decisoes = parseDecisoes(fd.decisoes ?? "");
            return (
              <>
                <SheetHeader className="pb-3">
                  <SheetTitle className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {fd.numero_ata || viewing.code}
                  </SheetTitle>
                  <Badge variant="outline" className={cn("text-[10px] w-fit", statusColor[viewing.status] ?? "")}>
                    {t(`documents.status.${viewing.status}`, { defaultValue: viewing.status })}
                  </Badge>
                </SheetHeader>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded-lg p-3">
                    {[[t("meetings.fields.type"), fd.tipo_reuniao], [t("meetings.fields.date"), fd.data_reuniao ? new Date(fd.data_reuniao).toLocaleDateString(i18n.language?.startsWith("es") ? "es-ES" : "pt-PT") : null],
                      [t("meetings.fields.location"), fd.local], [t("meetings.fields.schedule"), fd.hora_inicio ? `${fd.hora_inicio} – ${fd.hora_fim}` : null],
                      [t("meetings.fields.calledBy"), fd.convocada_por]].map(([l, v]) => v ? (
                      <div key={String(l)}><span className="text-muted-foreground">{l}: </span><span className="font-medium">{String(v)}</span></div>
                    ) : null)}
                  </div>

                  {fd.participantes_empreiteiro && (<>
                    <Separator />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />{t("meetings.fields.attendeesContractor")}
                      </p>
                      <p className="text-xs whitespace-pre-wrap text-muted-foreground">{fd.participantes_empreiteiro}</p>
                    </div>
                  </>)}
                  {fd.participantes_fiscalizacao && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("meetings.fields.attendeesSupervisor")}</p>
                      <p className="text-xs whitespace-pre-wrap text-muted-foreground">{fd.participantes_fiscalizacao}</p>
                    </div>
                  )}

                  {fd.ordem_trabalhos && (<>
                    <Separator />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("meetings.fields.agenda")}</p>
                      <p className="text-xs whitespace-pre-wrap">{fd.ordem_trabalhos}</p>
                    </div>
                  </>)}

                  {fd.assuntos_tratados && (<>
                    <Separator />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t("meetings.fields.discussions")}</p>
                      <p className="text-xs whitespace-pre-wrap">{fd.assuntos_tratados}</p>
                    </div>
                  </>)}

                  {decisoes.length > 0 && (<>
                    <Separator />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("meetings.fields.decisions")}</p>
                      <div className="space-y-1.5">
                        {decisoes.map((d, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50">
                            <Clock className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p>{d.text}</p>
                              {(d.responsible || d.due_date) && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {d.responsible && <span>Resp: {d.responsible}</span>}
                                  {d.responsible && d.due_date && " · "}
                                  {d.due_date && <span>Prazo: {d.due_date}</span>}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>)}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                      onClick={() => { setViewing(null); goToDoc(viewing.id); }}>
                      <ExternalLink className="h-3 w-3" /> {t("meetings.editInDoc")}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                      onClick={() => exportPdf(viewing)}>
                      <FileDown className="h-3 w-3" /> PDF
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
