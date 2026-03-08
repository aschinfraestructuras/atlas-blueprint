import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import { dailyReportService } from "@/lib/services/dailyReportService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export const DailyReportFormDialog = React.forwardRef<HTMLDivElement, Props>(
  function DailyReportFormDialog({ open, onOpenChange, onCreated }, ref) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { activeProject } = useProject();
    const { user } = useAuth();
    const { data: workItems } = useWorkItems();

    const today = new Date().toISOString().slice(0, 10);
    const [reportDate, setReportDate] = useState(today);
    const [reportNumber, setReportNumber] = useState("");
    const [workItemId, setWorkItemId] = useState<string>("");
    const [weather, setWeather] = useState("");
    const [tempMin, setTempMin] = useState("");
    const [tempMax, setTempMax] = useState("");
    const [foremanName, setForemanName] = useState("");
    const [contractorRep, setContractorRep] = useState("");
    const [supervisorRep, setSupervisorRep] = useState("");
    const [ipRep, setIpRep] = useState("");
    const [observations, setObservations] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (open && activeProject) {
        dailyReportService.nextReportNumber(activeProject.id, reportDate).then(setReportNumber);
      }
    }, [open, activeProject, reportDate]);

    const handleSave = async () => {
      if (!activeProject || !user) return;
      setSaving(true);
      try {
        const dr = await dailyReportService.create({
          project_id: activeProject.id,
          report_date: reportDate,
          report_number: reportNumber,
          work_item_id: workItemId || null,
          weather: weather || null,
          temperature_min: tempMin ? Number(tempMin) : null,
          temperature_max: tempMax ? Number(tempMax) : null,
          foreman_name: foremanName || null,
          contractor_rep: contractorRep || null,
          supervisor_rep: supervisorRep || null,
          ip_rep: ipRep || null,
          observations: observations || null,
        }, user.id);
        toast({ title: t("dailyReports.toast.created") });
        onOpenChange(false);
        onCreated?.();
        navigate(`/daily-reports/${dr.id}`);
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={ref} className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dailyReports.new")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.reportDate")}</Label>
                <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.reportNumber")}</Label>
                <Input value={reportNumber} onChange={e => setReportNumber(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("nav.workItems")}</Label>
              <Select value={workItemId} onValueChange={setWorkItemId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {workItems.map(wi => (
                    <SelectItem key={wi.id} value={wi.id}>
                      {wi.sector} — {wi.obra ?? wi.disciplina}
                      {wi.elemento ? ` / ${wi.elemento}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.weather")}</Label>
                <Input value={weather} onChange={e => setWeather(e.target.value)} placeholder="Sol, nublado…" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.tempMin")}</Label>
                <Input type="number" value={tempMin} onChange={e => setTempMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.tempMax")}</Label>
                <Input type="number" value={tempMax} onChange={e => setTempMax(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.foremanName")}</Label>
                <Input value={foremanName} onChange={e => setForemanName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.contractorRep")}</Label>
                <Input value={contractorRep} onChange={e => setContractorRep(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.supervisorRep")}</Label>
                <Input value={supervisorRep} onChange={e => setSupervisorRep(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dailyReports.fields.ipRep")}</Label>
                <Input value={ipRep} onChange={e => setIpRep(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("dailyReports.sections.observations")}</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !reportNumber || !reportDate}>
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
