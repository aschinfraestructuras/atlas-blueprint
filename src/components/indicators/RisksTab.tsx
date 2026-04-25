import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/utils/toast";
import { cn } from "@/lib/utils";
import { exportRisksPdf } from "@/lib/services/riskExportService";
import type { RiskItem, RiskExportLabels } from "@/lib/services/riskExportService";
import { ShieldAlert, Plus, Pencil, Trash2, Download, Clock, CheckCircle2, AlertTriangle, Search, Lightbulb } from "lucide-react";

const db = supabase as any;
const RISK_CATEGORIES = ["test_delay","lab_capacity","material_approval","critical_supplier","traceability","recurring_failure","subcontractor","weather","regulatory","other"] as const;
const STATUSES  = ["open","mitigated","accepted","closed"] as const;
const LEVELS    = ["low","medium","high","critical"] as const;
const LEVEL_STYLES: Record<string,string> = { low:"bg-green-500/15 text-green-700", medium:"bg-amber-500/15 text-amber-700", high:"bg-orange-500/15 text-orange-700", critical:"bg-destructive/15 text-destructive" };
const STATUS_STYLES: Record<string,string> = { open:"bg-destructive/15 text-destructive", mitigated:"bg-amber-500/15 text-amber-700", accepted:"bg-blue-500/15 text-blue-700", closed:"bg-muted text-muted-foreground" };
const MATRIX_COLOR = (p:number,i:number) => { const v=p*i; if(v>=15) return "#ef4444"; if(v>=9) return "#f97316"; if(v>=5) return "#f59e0b"; return "#22c55e"; };
const calcLevel = (p:number,i:number) => { const v=p*i; if(v>=15) return "critical"; if(v>=9) return "high"; if(v>=5) return "medium"; return "low"; };
const EMPTY_FORM = { is_opportunity:false, risk_category:"other", title:"", description:"", origin:"", probability:3, impact:3, preventive_measure:"", contingency_measure:"", responsible_name:"", status:"open", review_date:"", residual_probability:"" as string|number, residual_impact:"" as string|number, notes:"", work_item_id:"__none__" };

export function RisksTab() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { canCreate } = useProjectRole();
  const { logoBase64 } = useProjectLogo();
  const [items, setItems] = useState<RiskItem[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list"|"matrix">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterLevel, setFilterLevel] = useState("__all__");
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RiskItem|null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [sheetItem, setSheetItem] = useState<RiskItem|null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RiskItem|null>(null);
  const pid = activeProject?.id ?? "";

  const fetch = useCallback(async () => {
    if (!pid) return; setLoading(true);
    try {
      const [rRes,wRes] = await Promise.all([
        db.from("risk_register").select("*").eq("project_id",pid).eq("is_deleted",false).order("created_at",{ascending:false}),
        db.from("work_items").select("id,obra,lote").eq("project_id",pid).eq("is_deleted",false).order("lote"),
      ]);
      setItems(rRes.data??[]); setWorkItems(wRes.data??[]);
    } finally { setLoading(false); }
  }, [pid]);

  useEffect(() => { fetch(); }, [fetch]);

  const displayItems = useMemo(() => items.filter(i => {
    if (i.is_opportunity !== showOpportunities) return false;
    if (filterStatus !== "__all__" && i.status !== filterStatus) return false;
    if (filterLevel  !== "__all__" && i.risk_level !== filterLevel) return false;
    if (search) { const q=search.toLowerCase(); return i.code.toLowerCase().includes(q)||i.title.toLowerCase().includes(q)||(i.responsible_name??"").toLowerCase().includes(q); }
    return true;
  }), [items, showOpportunities, filterStatus, filterLevel, search]);

  const kpis = useMemo(() => {
    const r = items.filter(i => !i.is_opportunity);
    return { total:r.length, open:r.filter(i=>i.status==="open").length, critical:r.filter(i=>i.risk_level==="critical").length, overdue:r.filter(i=>i.review_date && new Date(i.review_date)<new Date() && i.status==="open").length, opps:items.filter(i=>i.is_opportunity).length };
  }, [items]);

  const matrixData = useMemo(() => {
    const g: Record<string,RiskItem[]> = {};
    items.filter(i=>!i.is_opportunity&&i.status!=="closed").forEach(r => { const k=`${r.probability}-${r.impact}`; if(!g[k]) g[k]=[]; g[k].push(r); });
    return g;
  }, [items]);

  const setF = (k:string,v:unknown) => setForm(p=>({...p,[k]:v}));

  const openNew = () => { setEditing(null); setForm({...EMPTY_FORM, is_opportunity:showOpportunities}); setFormOpen(true); };
  const openEdit = (r:RiskItem) => {
    setEditing(r);
    setForm({ is_opportunity:r.is_opportunity, risk_category:r.risk_category, title:r.title, description:r.description??"", origin:r.origin??"", probability:r.probability, impact:r.impact, preventive_measure:r.preventive_measure??"", contingency_measure:r.contingency_measure??"", responsible_name:r.responsible_name??"", status:r.status, review_date:r.review_date??"", residual_probability:r.residual_probability?.toString()??"", residual_impact:r.residual_impact?.toString()??"", notes:r.notes??"", work_item_id:(r as any).work_item_id??"__none__" });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return; setSaving(true);
    try {
      const payload = { project_id:pid, code:"", is_opportunity:form.is_opportunity, risk_category:form.risk_category, title:form.title.trim(), description:form.description.trim()||null, origin:form.origin.trim()||null, probability:Number(form.probability), impact:Number(form.impact), preventive_measure:form.preventive_measure.trim()||null, contingency_measure:form.contingency_measure.trim()||null, responsible_name:form.responsible_name.trim()||null, status:form.status, review_date:form.review_date||null, residual_probability:form.residual_probability?Number(form.residual_probability):null, residual_impact:form.residual_impact?Number(form.residual_impact):null, notes:form.notes.trim()||null, work_item_id:form.work_item_id==="__none__"?null:form.work_item_id, created_by:user?.id };
      if (editing) { const {error}=await db.from("risk_register").update({...payload,code:undefined}).eq("id",editing.id); if(error) throw error; toast({title:t("risks.toast.updated")}); }
      else { const {error}=await db.from("risk_register").insert(payload); if(error) throw error; toast({title:t("risks.toast.created")}); }
      setFormOpen(false); fetch();
    } catch(err:any) { toast({title:t("common.saveError"),description:err?.message,variant:"destructive"}); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.from("risk_register").update({is_deleted:true,deleted_at:new Date().toISOString()}).eq("id",deleteTarget.id);
    toast({title:t("risks.toast.deleted")}); setDeleteTarget(null); fetch();
  };

  const buildLabels = (): RiskExportLabels => ({
    appName:"Atlas QMS", reportTitle:t("risks.pdf.title"), generatedOn:t("common.generatedOn",{defaultValue:"Gerado em"}), page:t("common.page",{defaultValue:"Pág."}),
    opportunity:t("risks.opportunity"), risk:t("risks.risk"),
    fields:{ code:t("risks.fields.code"), category:t("risks.fields.category"), title:t("risks.fields.title"), status:t("risks.fields.status"), description:t("risks.fields.description"), origin:t("risks.fields.origin"), probability:t("risks.fields.probability"), impact:t("risks.fields.impact"), level:t("risks.fields.level"), preventive:t("risks.fields.preventive"), contingency:t("risks.fields.contingency"), responsible:t("risks.fields.responsible"), reviewDate:t("risks.fields.reviewDate"), residualProb:t("risks.fields.residualProb"), residualImpact:t("risks.fields.residualImpact"), residualLevel:t("risks.fields.residualLevel"), notes:t("common.notes") },
    levels:Object.fromEntries(LEVELS.map(k=>[k,t(`risks.level.${k}`)])),
    statuses:Object.fromEntries(STATUSES.map(k=>[k,t(`risks.status.${k}`)])),
    categories:Object.fromEntries(RISK_CATEGORIES.map(k=>[k,t(`risks.categories.${k}`)])),
  });

  const PISelect = ({fk,label}:{fk:string,label:string}) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={String((form as any)[fk] || "__none__")}
        onValueChange={v => setF(fk, v === "__none__" ? "" : Number(v))}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—"/></SelectTrigger>
        <SelectContent>
          {fk.includes("residual") && <SelectItem value="__none__">—</SelectItem>}
          {[1,2,3,4,5].map(n => (
            <SelectItem key={n} value={String(n)}>
              {n} — {t(`risks.probLabel.${n}`, { defaultValue: String(n) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[{label:t("risks.kpi.total"),value:kpis.total,color:""},{label:t("risks.kpi.open"),value:kpis.open,color:"text-destructive"},{label:t("risks.kpi.critical"),value:kpis.critical,color:kpis.critical>0?"text-destructive":""},{label:t("risks.kpi.overdue"),value:kpis.overdue,color:kpis.overdue>0?"text-orange-600":""},{label:t("risks.kpi.opps"),value:kpis.opps,color:"text-blue-600"}].map(({label,value,color})=>(
          <div key={label} className="rounded-xl border bg-card p-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold",color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controlos */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
          <Switch checked={showOpportunities} onCheckedChange={setShowOpportunities}/>
          <Label className="text-xs cursor-pointer flex items-center gap-1">
            {showOpportunities?<Lightbulb className="h-3.5 w-3.5 text-blue-500"/>:<ShieldAlert className="h-3.5 w-3.5 text-destructive"/>}
            {showOpportunities?t("risks.opportunity"):t("risks.risk")}
          </Label>
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5">
          {(["list","matrix"] as const).map(v=>(
            <button key={v} className={cn("px-3 py-1 rounded text-xs font-medium transition-colors",view===v?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground")} onClick={()=>setView(v)}>
              {t(`risks.view${v.charAt(0).toUpperCase()+v.slice(1)}`)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("risks.search")} className="pl-8 h-8 text-xs"/>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("risks.filter.allStatus")}</SelectItem>
            {STATUSES.map(s=><SelectItem key={s} value={s}>{t(`risks.status.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={()=>exportRisksPdf(displayItems,activeProject?.name??"",logoBase64??null,buildLabels())} disabled={displayItems.length===0}>
          <Download className="h-3.5 w-3.5"/>PDF
        </Button>
        {canCreate&&<Button size="sm" className="gap-1.5 h-8" onClick={openNew}><Plus className="h-3.5 w-3.5"/>{showOpportunities?t("risks.newOpp"):t("risks.new")}</Button>}
      </div>

      {loading ? <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-12 rounded-lg"/>)}</div>
      : view==="matrix" ? (
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground">{t("risks.matrixDesc")}</p>
          <div className="overflow-auto">
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr>
                <th className="text-[10px] text-muted-foreground p-1 w-16">P \ I</th>
                {[1,2,3,4,5].map(i=><th key={i} className="text-[10px] text-center p-1 w-20">{i}</th>)}
              </tr></thead>
              <tbody>{[5,4,3,2,1].map(p=>(
                <tr key={p}><td className="text-[10px] text-center font-semibold text-muted-foreground p-1">{p}</td>
                {[1,2,3,4,5].map(i=>{
                  const key=`${p}-${i}`; const cr=matrixData[key]??[]; const bg=MATRIX_COLOR(p,i);
                  return <td key={i} style={{background:bg+"20",border:`2px solid ${bg}40`,minWidth:70,minHeight:50}} className="p-1 text-center align-middle">
                    {cr.slice(0,2).map(r=><button key={r.id} className="text-[9px] block truncate max-w-[65px] px-1 py-0.5 rounded hover:bg-black/10" style={{color:bg}} onClick={()=>{setSheetItem(r);setSheetOpen(true);}}>{r.code}</button>)}
                    {cr.length>2&&<span className="text-[9px]" style={{color:bg}}>+{cr.length-2}</span>}
                  </td>;
                })}</tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 justify-center text-[10px]">
            {[["low","#22c55e"],["medium","#f59e0b"],["high","#f97316"],["critical","#ef4444"]].map(([l,c])=>(
              <span key={l} className="flex items-center gap-1">
                <span style={{background:c,width:10,height:10,borderRadius:2,display:"inline-block"}}/>
                {t(`risks.level.${l}`)}
              </span>
            ))}
          </div>
        </div>
      ) : displayItems.length===0 ? (
        <div className="text-center py-12">
          <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3"/>
          <p className="text-sm text-muted-foreground">{showOpportunities?t("risks.emptyOpps"):t("risks.empty")}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">{t("risks.fields.code")}</TableHead>
              <TableHead className="text-xs">{t("risks.fields.category")}</TableHead>
              <TableHead className="text-xs">{t("risks.fields.title")}</TableHead>
              <TableHead className="text-xs">P×I</TableHead>
              <TableHead className="text-xs">{t("risks.fields.level")}</TableHead>
              <TableHead className="text-xs">{t("risks.fields.responsible")}</TableHead>
              <TableHead className="text-xs">{t("risks.fields.status")}</TableHead>
              <TableHead className="text-xs">Residual</TableHead>
              <TableHead className="w-16"/>
            </TableRow></TableHeader>
            <TableBody>
              {displayItems.map(r=>(
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/20" onClick={()=>{setSheetItem(r);setSheetOpen(true);}}>
                  <TableCell className="font-mono text-xs font-semibold">{r.code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t(`risks.categories.${r.risk_category}`,{defaultValue:r.risk_category})}</TableCell>
                  <TableCell className="text-xs font-medium max-w-[160px] truncate">{r.title}</TableCell>
                  <TableCell><span className="text-xs font-bold" style={{color:MATRIX_COLOR(r.probability,r.impact)}}>{r.probability}×{r.impact}={r.probability*r.impact}</span></TableCell>
                  <TableCell><Badge className={cn("text-[10px]",LEVEL_STYLES[r.risk_level])}>{t(`risks.level.${r.risk_level}`)}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.responsible_name??"—"}</TableCell>
                  <TableCell><Badge className={cn("text-[10px]",STATUS_STYLES[r.status])}>{t(`risks.status.${r.status}`)}</Badge></TableCell>
                  <TableCell>{r.residual_level?<Badge className={cn("text-[10px]",LEVEL_STYLES[r.residual_level])}>{t(`risks.level.${r.residual_level}`)}</Badge>:<span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell onClick={e=>e.stopPropagation()}><div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>openEdit(r)}><Pencil className="h-3 w-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={()=>setDeleteTarget(r)}><Trash2 className="h-3 w-3"/></Button>
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Formulário */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.is_opportunity?<Lightbulb className="h-4 w-4 text-blue-500"/>:<ShieldAlert className="h-4 w-4 text-destructive"/>}
              {editing?t("risks.edit"):(form.is_opportunity?t("risks.newOpp"):t("risks.new"))}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2"><Switch checked={form.is_opportunity} onCheckedChange={v=>setF("is_opportunity",v)}/><Label className="text-xs cursor-pointer">{t("risks.isOpportunity")}</Label></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("risks.section.identification")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">{t("risks.fields.category")} *</Label>
                <Select value={form.risk_category} onValueChange={v=>setF("risk_category",v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>{RISK_CATEGORIES.map(k=><SelectItem key={k} value={k}>{t(`risks.categories.${k}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">{t("risks.fields.responsible")}</Label><Input value={form.responsible_name} onChange={e=>setF("responsible_name",e.target.value)} className="h-8 text-xs"/></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">{t("risks.fields.title")} *</Label><Input value={form.title} onChange={e=>setF("title",e.target.value)} className="h-8 text-xs"/></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">{t("risks.fields.description")}</Label><Textarea value={form.description} onChange={e=>setF("description",e.target.value)} rows={2} className="text-xs resize-none"/></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">{t("risks.fields.origin")}</Label><Input value={form.origin} onChange={e=>setF("origin",e.target.value)} className="h-8 text-xs" placeholder={t("risks.placeholders.origin")}/></div>
            </div>
            <Separator/>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("risks.section.assessment")}</p>
            <div className="grid grid-cols-2 gap-3">
              <PISelect fk="probability" label={`${t("risks.fields.probability")} (1-5)`}/>
              <PISelect fk="impact" label={`${t("risks.fields.impact")} (1-5)`}/>
              <div className="col-span-2 p-3 rounded-lg border bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{t("risks.fields.level")}</p>
                <span style={{color:MATRIX_COLOR(form.probability,form.impact)}} className="text-2xl font-black">{form.probability}×{form.impact}={form.probability*Number(form.impact)}</span>
                <span className="ml-2 text-xs font-semibold" style={{color:MATRIX_COLOR(form.probability,form.impact)}}>{t(`risks.level.${calcLevel(form.probability,Number(form.impact))}`)}</span>
              </div>
            </div>
            <Separator/>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("risks.section.mitigation")}</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1"><Label className="text-xs">{t("risks.fields.preventive")}</Label><Textarea value={form.preventive_measure} onChange={e=>setF("preventive_measure",e.target.value)} rows={2} className="text-xs resize-none"/></div>
              <div className="space-y-1"><Label className="text-xs">{t("risks.fields.contingency")}</Label><Textarea value={form.contingency_measure} onChange={e=>setF("contingency_measure",e.target.value)} rows={2} className="text-xs resize-none"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PISelect fk="residual_probability" label={t("risks.fields.residualProb")}/>
              <PISelect fk="residual_impact" label={t("risks.fields.residualImpact")}/>
              <div className="space-y-1"><Label className="text-xs">{t("risks.fields.status")}</Label>
                <Select value={form.status} onValueChange={v=>setF("status",v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                  <SelectContent>{STATUSES.map(k=><SelectItem key={k} value={k}>{t(`risks.status.${k}`)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">{t("risks.fields.reviewDate")}</Label><Input type="date" value={form.review_date} onChange={e=>setF("review_date",e.target.value)} className="h-8 text-xs"/></div>
              <div className="col-span-2 space-y-1"><Label className="text-xs">{t("common.notes")}</Label><Textarea value={form.notes} onChange={e=>setF("notes",e.target.value)} rows={2} className="text-xs resize-none"/></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setFormOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving||!form.title.trim()} className="gap-1.5">
              {saving?<Clock className="h-3.5 w-3.5 animate-spin"/>:<CheckCircle2 className="h-3.5 w-3.5"/>}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet detalhe */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {sheetItem&&<>
            <SheetHeader className="pb-3">
              <SheetTitle className="flex items-center gap-2">
                {sheetItem.is_opportunity?<Lightbulb className="h-4 w-4 text-blue-500"/>:<ShieldAlert className="h-4 w-4"/>}
                {sheetItem.code}
              </SheetTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("text-[10px]",LEVEL_STYLES[sheetItem.risk_level])}>{t(`risks.level.${sheetItem.risk_level}`)} ({sheetItem.probability}×{sheetItem.impact})</Badge>
                <Badge className={cn("text-[10px]",STATUS_STYLES[sheetItem.status])}>{t(`risks.status.${sheetItem.status}`)}</Badge>
              </div>
            </SheetHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm font-semibold">{sheetItem.title}</p>
              {sheetItem.description&&<p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded p-3">{sheetItem.description}</p>}
              {sheetItem.preventive_measure&&<div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 p-3"><p className="text-[10px] font-bold text-green-700 uppercase mb-1">{t("risks.fields.preventive")}</p><p className="text-xs whitespace-pre-wrap">{sheetItem.preventive_measure}</p></div>}
              {sheetItem.contingency_measure&&<div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 p-3"><p className="text-[10px] font-bold text-blue-700 uppercase mb-1">{t("risks.fields.contingency")}</p><p className="text-xs whitespace-pre-wrap">{sheetItem.contingency_measure}</p></div>}
              {sheetItem.residual_level&&<div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground mb-1">Residual</p><Badge className={cn("text-[10px]",LEVEL_STYLES[sheetItem.residual_level])}>{t(`risks.level.${sheetItem.residual_level}`)} ({sheetItem.residual_probability}×{sheetItem.residual_impact})</Badge></div>}
              <Separator/>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("tc.attachments")}</p>
              <AttachmentsPanel projectId={pid} entityType={"risk_register" as any} entityId={sheetItem.id}/>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={()=>exportRisksPdf([sheetItem],activeProject?.name??"",logoBase64??null,buildLabels())}><Download className="h-3.5 w-3.5"/>PDF</Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={()=>{setSheetOpen(false);openEdit(sheetItem);}}><Pencil className="h-3.5 w-3.5"/>{t("common.edit")}</Button>
              </div>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v=>{if(!v)setDeleteTarget(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("risks.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("risks.deleteDesc",{code:deleteTarget?.code??""})}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
