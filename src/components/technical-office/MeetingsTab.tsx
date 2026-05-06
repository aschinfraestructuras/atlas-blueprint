/**
 * MeetingsTab — Actas de Reunião SGQ
 * Integrado em TechnicalOfficePage → tab "Reuniões"
 * Cobre: kick-off, mensais SGQ, HP, auditorias, extraordinárias, encerramento
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useSignatureSlots } from "@/hooks/useSignatureSlots";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/utils/toast";
import { fullPdfHeader } from "@/lib/services/pdfProjectHeader";
import { printHtml } from "@/lib/services/reportService";
import { signatureBlockHtml } from "@/lib/services/signatureService";
import {
  Plus, FileDown, Eye, Pencil, Trash2, Search, Loader2,
  CalendarDays, Users, CheckCircle2, Clock, FileText, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionPoint {
  id: string;
  description: string;
  responsible: string;
  due_date: string;
  status: "open" | "closed" | "overdue";
}

interface Meeting {
  id: string;
  code: string;
  meeting_type: string;
  meeting_date: string;
  location: string | null;
  duration_min: number | null;
  chairman: string | null;
  attendees: { name: string; role: string; company: string; present: boolean }[];
  agenda: string | null;
  decisions: string | null;
  action_points: ActionPoint[];
  next_meeting: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const MEETING_TYPES = ["kickoff","monthly","hp","audit","extraordinary","closure"] as const;
const MEETING_STATUSES = ["draft","approved","distributed"] as const;

const EMPTY_FORM: Partial<Meeting> = {
  meeting_type: "monthly",
  meeting_date: new Date().toISOString().slice(0,10),
  status: "draft",
  attendees: [],
  action_points: [],
};

export function MeetingsTab() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const slots = useSignatureSlots("audit");
  const { logoBase64 } = useProjectLogo();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("__all__");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Meeting>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    const { data } = await supabase
      .from("sgq_meetings" as any)
      .select("*")
      .eq("project_id", activeProject.id)
      .eq("is_deleted", false)
      .order("meeting_date", { ascending: false });
    setMeetings((data ?? []) as Meeting[]);
    setLoading(false);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, meeting_date: new Date().toISOString().slice(0,10) });
    setDialogOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditingId(m.id);
    setForm({ ...m });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeProject || !form.meeting_date) return;
    setSaving(true);
    try {
      const payload = {
        project_id: activeProject.id,
        meeting_type: form.meeting_type ?? "monthly",
        meeting_date: form.meeting_date,
        location: form.location ?? null,
        duration_min: form.duration_min ?? null,
        chairman: form.chairman ?? null,
        attendees: form.attendees ?? [],
        agenda: form.agenda ?? null,
        decisions: form.decisions ?? null,
        action_points: form.action_points ?? [],
        next_meeting: form.next_meeting ?? null,
        notes: form.notes ?? null,
        status: form.status ?? "draft",
      };

      if (editingId) {
        await supabase.from("sgq_meetings" as any).update(payload).eq("id", editingId);
      } else {
        await supabase.from("sgq_meetings" as any).insert({ ...payload, code: "" });
      }
      toast({ title: editingId ? t("common.saved") : t("common.created") });
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("sgq_meetings" as any).update({ is_deleted: true }).eq("id", id);
    toast({ title: t("common.deleted") });
    await load();
  };

  const exportPdf = (m: Meeting) => {
    const sigHtml = slots.length > 0 ? signatureBlockHtml(slots) : `
      <div style="display:flex;gap:40px;margin-top:32px;border-top:2px solid #1e3a5f;padding-top:16px;">
        <div style="flex:1;text-align:center;"><div style="border-bottom:1px solid #1e3a5f;height:40px;margin-bottom:4px;"></div><div style="font-size:9px;font-weight:700;color:#1e3a5f;">Presidente da Reunião</div></div>
        <div style="flex:1;text-align:center;"><div style="border-bottom:1px solid #1e3a5f;height:40px;margin-bottom:4px;"></div><div style="font-size:9px;font-weight:700;color:#1e3a5f;">Responsável de Qualidade</div></div>
      </div>`;

    const attendeesHtml = (m.attendees ?? []).map((a, i) => `
      <tr style="background:${i%2===0?'#f9fafb':'white'}">
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${a.name ?? ""}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${a.role ?? ""}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${a.company ?? ""}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;text-align:center;">${a.present ? "✅" : "❌"}</td>
      </tr>`).join("");

    const apHtml = (m.action_points ?? []).map((ap, i) => `
      <tr style="background:${i%2===0?'#f9fafb':'white'}">
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${ap.description ?? ""}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${ap.responsible ?? ""}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;">${ap.due_date ?? ""}</td>
        <td style="padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;text-align:center;">${
          ap.status === "closed" ? "✅ Fechado" : ap.status === "overdue" ? "❌ Vencido" : "⏳ Aberto"
        }</td>
      </tr>`).join("");

    const header = fullPdfHeader(logoBase64 ?? null, activeProject?.name ?? "", m.code, "0",
      new Date(m.meeting_date).toLocaleDateString("pt-PT"));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>@page{size:A4;margin:18mm}body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1a1a1a;margin:0;padding:20px}
    h3{font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 6px}
    table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:white;padding:5px 8px;font-size:10px;text-align:left;border:1px solid #1e3a5f}
    .section{background:#f0f4f8;border-left:3px solid #1e3a5f;padding:10px 14px;margin:10px 0;font-size:10.5px;white-space:pre-wrap}
    </style></head><body>
    ${header}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0;background:#f0f4f8;padding:10px;border-radius:6px;">
      <div><b>Tipo:</b> ${t(`meetings.type.${m.meeting_type}`, { defaultValue: m.meeting_type })}</div>
      <div><b>Data:</b> ${new Date(m.meeting_date).toLocaleDateString("pt-PT")}</div>
      <div><b>Local:</b> ${m.location ?? "—"}</div>
      <div><b>Duração:</b> ${m.duration_min ? m.duration_min + " min" : "—"}</div>
      <div><b>Presidente:</b> ${m.chairman ?? "—"}</div>
      <div><b>Estado:</b> ${t(`meetings.status.${m.status}`, { defaultValue: m.status })}</div>
    </div>

    ${m.agenda ? `<h3>Ordem de Trabalhos / Agenda</h3><div class="section">${m.agenda}</div>` : ""}

    ${m.attendees?.length ? `<h3>Participantes</h3>
    <table><tr><th>Nome</th><th>Função</th><th>Empresa</th><th>Presente</th></tr>${attendeesHtml}</table>` : ""}

    ${m.decisions ? `<h3>Decisões Tomadas</h3><div class="section">${m.decisions}</div>` : ""}

    ${m.action_points?.length ? `<h3>Plano de Acção</h3>
    <table><tr><th>Acção</th><th>Responsável</th><th>Prazo</th><th>Estado</th></tr>${apHtml}</table>` : ""}

    ${m.notes ? `<h3>Observações</h3><div class="section">${m.notes}</div>` : ""}
    ${m.next_meeting ? `<p style="margin-top:12px;font-size:10px;color:#6b7280;">Próxima reunião prevista: <b>${new Date(m.next_meeting).toLocaleDateString("pt-PT")}</b></p>` : ""}

    ${sigHtml}
    <div style="text-align:center;font-size:8px;color:#999;margin-top:20px;">
      Atlas QMS · ${m.code} · Gerado em ${new Date().toLocaleString("pt-PT")}
    </div>
    </body></html>`;

    printHtml(html, `${m.code}.pdf`);
  };

  const filtered = meetings.filter(m => {
    const matchSearch = !search || m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.chairman ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "__all__" || m.meeting_type === filterType;
    return matchSearch && matchType;
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
      distributed: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    };
    return map[s] ?? "";
  };

  const typeBadge = (tp: string) => {
    const map: Record<string, string> = {
      kickoff: "bg-purple-500/10 text-purple-700 border-purple-500/30",
      monthly: "bg-blue-500/10 text-blue-700 border-blue-500/30",
      hp: "bg-orange-500/10 text-orange-700 border-orange-500/30",
      audit: "bg-teal-500/10 text-teal-700 border-teal-500/30",
      extraordinary: "bg-red-500/10 text-red-700 border-red-500/30",
      closure: "bg-gray-500/10 text-gray-700 border-gray-500/30",
    };
    return map[tp] ?? "";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder={t("common.search")}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder={t("meetings.allTypes", { defaultValue: "Todos os tipos" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("meetings.allTypes", { defaultValue: "Todos os tipos" })}</SelectItem>
              {MEETING_TYPES.map(tp => (
                <SelectItem key={tp} value={tp}>
                  {t(`meetings.type.${tp}`, { defaultValue: tp })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" />
          {t("meetings.new", { defaultValue: "Nova Acta" })}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>{t("meetings.empty", { defaultValue: "Sem actas de reunião registadas" })}</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={openNew}>
            <Plus className="h-3 w-3 mr-1" /> {t("meetings.new", { defaultValue: "Nova Acta" })}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Presidente</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Acções</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id} className="hover:bg-muted/20">
                  <TableCell className="text-xs font-mono font-medium">{m.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", typeBadge(m.meeting_type))}>
                      {t(`meetings.type.${m.meeting_type}`, { defaultValue: m.meeting_type })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(m.meeting_date).toLocaleDateString("pt-PT")}
                  </TableCell>
                  <TableCell className="text-xs hidden sm:table-cell">{m.chairman ?? "—"}</TableCell>
                  <TableCell className="text-xs hidden sm:table-cell">
                    {(m.action_points ?? []).length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {(m.action_points ?? []).filter(a => a.status === "open").length} abertas
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", statusBadge(m.status))}>
                      {t(`meetings.status.${m.status}`, { defaultValue: m.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setViewingMeeting(m)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => exportPdf(m)}><FileDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog — Nova/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pt-6">
            <DialogTitle className="text-base">
              {editingId
                ? t("meetings.edit", { defaultValue: "Editar Acta" })
                : t("meetings.new", { defaultValue: "Nova Acta de Reunião SGQ" })}
            </DialogTitle>
          </DialogHeader>
          <Separator className="-mx-6" />

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("meetings.type.label", { defaultValue: "Tipo de reunião" })}</Label>
                <Select value={form.meeting_type} onValueChange={v => setForm(p => ({ ...p, meeting_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(tp => (
                      <SelectItem key={tp} value={tp}>
                        {t(`meetings.type.${tp}`, { defaultValue: tp })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input type="date" className="h-8 text-xs"
                  value={form.meeting_date ?? ""}
                  onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Local</Label>
                <Input className="h-8 text-xs" placeholder="Escritório ACE, Estaleiro..."
                  value={form.location ?? ""}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duração (min)</Label>
                <Input type="number" className="h-8 text-xs"
                  value={form.duration_min ?? ""}
                  onChange={e => setForm(p => ({ ...p, duration_min: parseInt(e.target.value) || undefined }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Presidente da Reunião</Label>
                <Input className="h-8 text-xs"
                  value={form.chairman ?? ""}
                  onChange={e => setForm(p => ({ ...p, chairman: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{t(`meetings.status.${s}`, { defaultValue: s })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ordem de Trabalhos / Agenda</Label>
              <Textarea className="text-xs min-h-[80px] resize-none"
                placeholder="1. Análise KPIs do mês&#10;2. NCs em aberto&#10;3. Estado ensaios&#10;4. Planeamento próximo mês..."
                value={form.agenda ?? ""}
                onChange={e => setForm(p => ({ ...p, agenda: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Decisões Tomadas</Label>
              <Textarea className="text-xs min-h-[80px] resize-none"
                placeholder="Decisões formais da reunião..."
                value={form.decisions ?? ""}
                onChange={e => setForm(p => ({ ...p, decisions: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea className="text-xs min-h-[60px] resize-none"
                value={form.notes ?? ""}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Próxima Reunião (data prevista)</Label>
              <Input type="date" className="h-8 text-xs w-40"
                value={form.next_meeting ?? ""}
                onChange={e => setForm(p => ({ ...p, next_meeting: e.target.value }))} />
            </div>
          </div>

          <Separator className="-mx-6" />
          <DialogFooter className="pb-6 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet detalhe */}
      <Sheet open={!!viewingMeeting} onOpenChange={v => { if (!v) setViewingMeeting(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {viewingMeeting && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {viewingMeeting.code}
                </SheetTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", typeBadge(viewingMeeting.meeting_type))}>
                    {t(`meetings.type.${viewingMeeting.meeting_type}`, { defaultValue: viewingMeeting.meeting_type })}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]", statusBadge(viewingMeeting.status))}>
                    {t(`meetings.status.${viewingMeeting.status}`, { defaultValue: viewingMeeting.status })}
                  </Badge>
                </div>
              </SheetHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Data: </span>
                    <span className="font-medium">{new Date(viewingMeeting.meeting_date).toLocaleDateString("pt-PT")}</span></div>
                  <div><span className="text-muted-foreground">Local: </span>
                    <span className="font-medium">{viewingMeeting.location ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Presidente: </span>
                    <span className="font-medium">{viewingMeeting.chairman ?? "—"}</span></div>
                  <div><span className="text-muted-foreground">Duração: </span>
                    <span className="font-medium">{viewingMeeting.duration_min ? viewingMeeting.duration_min + " min" : "—"}</span></div>
                </div>

                {viewingMeeting.agenda && (<>
                  <Separator />
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Agenda</p>
                  <p className="text-xs whitespace-pre-wrap">{viewingMeeting.agenda}</p></div>
                </>)}

                {viewingMeeting.decisions && (<>
                  <Separator />
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Decisões</p>
                  <p className="text-xs whitespace-pre-wrap">{viewingMeeting.decisions}</p></div>
                </>)}

                {(viewingMeeting.action_points ?? []).length > 0 && (<>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Plano de Acção</p>
                    <div className="space-y-1.5">
                      {viewingMeeting.action_points.map((ap, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/30">
                          {ap.status === "closed" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            : ap.status === "overdue" ? <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                            : <Clock className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />}
                          <div className="flex-1">
                            <p>{ap.description}</p>
                            <p className="text-[10px] text-muted-foreground">{ap.responsible} · {ap.due_date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>)}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                    onClick={() => { setViewingMeeting(null); openEdit(viewingMeeting); }}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
                    onClick={() => exportPdf(viewingMeeting)}>
                    <FileDown className="h-3 w-3" /> PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
