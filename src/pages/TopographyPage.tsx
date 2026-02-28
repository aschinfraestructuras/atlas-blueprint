import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { NoProjectBanner } from "@/components/NoProjectBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, AlertTriangle, CheckCircle, Clock, Wrench, FileText, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useTopographyEquipment,
  useCalibrations,
  useTopographyRequests,
  useTopographyControls,
} from "@/hooks/useTopography";
import {
  topographyEquipmentService,
  calibrationService,
  topographyRequestService,
  topographyControlService,
} from "@/lib/services/topographyService";
import { EquipmentFormDialog } from "@/components/topography/EquipmentFormDialog";
import { CalibrationFormDialog } from "@/components/topography/CalibrationFormDialog";
import { RequestFormDialog } from "@/components/topography/RequestFormDialog";
import { ControlFormDialog } from "@/components/topography/ControlFormDialog";

function CalibrationBadge({ status }: { status: string }) {
  if (status === "valid") return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Válido</Badge>;
  if (status === "expiring_soon") return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expira em breve</Badge>;
  return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Expirado</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "secondary", in_progress: "default", completed: "outline", cancelled: "destructive" };
  return <Badge variant={(map[status] || "secondary") as any}>{status}</Badge>;
}

function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
          <AlertDialogDescription>
            {label || "Este registo será eliminado permanentemente. Tem a certeza?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function TopographyPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { isAdmin } = useProjectRole();
  const [activeTab, setActiveTab] = useState("equipment");

  const { data: equipment, loading: eqLoading, refetch: refetchEq } = useTopographyEquipment();
  const { data: calibrations, refetch: refetchCal } = useCalibrations();
  const { data: requests, loading: reqLoading, refetch: refetchReq } = useTopographyRequests();
  const { data: controls, loading: ctrlLoading, refetch: refetchCtrl } = useTopographyControls();

  const [eqDialogOpen, setEqDialogOpen] = useState(false);
  const [calDialogOpen, setCalDialogOpen] = useState(false);
  const [calEquipmentId, setCalEquipmentId] = useState<string | null>(null);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [ctrlDialogOpen, setCtrlDialogOpen] = useState(false);

  if (!activeProject) return <NoProjectBanner />;

  const expiredCount = equipment.filter(e => e.calibration_status === "expired").length;
  const expiringCount = equipment.filter(e => e.calibration_status === "expiring_soon").length;
  const validCount = equipment.filter(e => e.calibration_status === "valid").length;

  const handleAddCalibration = (equipmentId: string) => {
    setCalEquipmentId(equipmentId);
    setCalDialogOpen(true);
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await topographyEquipmentService.delete(id, activeProject.id);
      toast.success("Equipamento eliminado");
      refetchEq();
    } catch { toast.error("Erro ao eliminar equipamento"); }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await topographyRequestService.delete(id, activeProject.id);
      toast.success("Pedido eliminado");
      refetchReq();
    } catch { toast.error("Erro ao eliminar pedido"); }
  };

  const handleDeleteControl = async (id: string) => {
    try {
      await topographyControlService.delete(id, activeProject.id);
      toast.success("Controlo eliminado");
      refetchCtrl();
    } catch { toast.error("Erro ao eliminar controlo"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("topography.title", "Topografia")}
        subtitle={t("topography.subtitle", "Equipamentos, calibrações, pedidos e controlo geométrico")}
      />

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Equipamentos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{equipment.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-primary"><CheckCircle className="inline h-4 w-4 mr-1" />Calibração Válida</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{validCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground"><Clock className="inline h-4 w-4 mr-1" />Expira em Breve</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{expiringCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-destructive"><AlertTriangle className="inline h-4 w-4 mr-1" />Expirado</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{expiredCount}</div></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipment"><Wrench className="h-4 w-4 mr-1" />Equipamentos</TabsTrigger>
          <TabsTrigger value="requests"><FileText className="h-4 w-4 mr-1" />Pedidos</TabsTrigger>
          <TabsTrigger value="controls"><Target className="h-4 w-4 mr-1" />Controlo Geométrico</TabsTrigger>
        </TabsList>

        {/* ─── Equipment Tab ─── */}
        <TabsContent value="equipment" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setEqDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo Equipamento</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Marca/Modelo</TableHead>
                  <TableHead>Nº Série</TableHead><TableHead>Responsável</TableHead><TableHead>Calibração</TableHead>
                  <TableHead>Validade</TableHead><TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium">{eq.code}</TableCell>
                    <TableCell>{eq.equipment_type}</TableCell>
                    <TableCell>{[eq.brand, eq.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{eq.serial_number || "—"}</TableCell>
                    <TableCell>{eq.responsible || "—"}</TableCell>
                    <TableCell><CalibrationBadge status={eq.calibration_status} /></TableCell>
                    <TableCell>{eq.calibration_valid_until || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleAddCalibration(eq.id)}>
                          <Plus className="h-3 w-3 mr-1" />Calibração
                        </Button>
                        {isAdmin && <DeleteButton onConfirm={() => handleDeleteEquipment(eq.id)} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {equipment.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem equipamentos registados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Requests Tab ─── */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setReqDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo Pedido</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Zona</TableHead>
                  <TableHead>Data</TableHead><TableHead>Prioridade</TableHead><TableHead>Estado</TableHead><TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.request_type}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{req.description}</TableCell>
                    <TableCell>{req.zone || "—"}</TableCell>
                    <TableCell>{req.request_date}</TableCell>
                    <TableCell><Badge variant={req.priority === "urgent" ? "destructive" : "secondary"}>{req.priority}</Badge></TableCell>
                    <TableCell><StatusBadge status={req.status} /></TableCell>
                    <TableCell>
                      <DeleteButton onConfirm={() => handleDeleteRequest(req.id)} />
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem pedidos registados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Controls Tab ─── */}
        <TabsContent value="controls" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCtrlDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo Controlo</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Elemento</TableHead><TableHead>Zona</TableHead><TableHead>Tolerância</TableHead>
                  <TableHead>Valor Medido</TableHead><TableHead>Desvio</TableHead><TableHead>Resultado</TableHead>
                  <TableHead>Data</TableHead><TableHead>Técnico</TableHead><TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((ctrl) => (
                  <TableRow key={ctrl.id}>
                    <TableCell className="font-medium">{ctrl.element}</TableCell>
                    <TableCell>{ctrl.zone || "—"}</TableCell>
                    <TableCell>{ctrl.tolerance || "—"}</TableCell>
                    <TableCell>{ctrl.measured_value || "—"}</TableCell>
                    <TableCell>{ctrl.deviation || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={ctrl.result === "conforme" ? "default" : "destructive"}>
                        {ctrl.result === "conforme" ? "Conforme" : "Não conforme"}
                      </Badge>
                    </TableCell>
                    <TableCell>{ctrl.execution_date}</TableCell>
                    <TableCell>{ctrl.technician || "—"}</TableCell>
                    <TableCell>
                      <DeleteButton onConfirm={() => handleDeleteControl(ctrl.id)} />
                    </TableCell>
                  </TableRow>
                ))}
                {controls.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sem controlos registados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EquipmentFormDialog open={eqDialogOpen} onOpenChange={setEqDialogOpen} projectId={activeProject.id} onSuccess={() => { refetchEq(); setEqDialogOpen(false); }} />
      <CalibrationFormDialog open={calDialogOpen} onOpenChange={setCalDialogOpen} projectId={activeProject.id} equipmentId={calEquipmentId} onSuccess={() => { refetchCal(); refetchEq(); setCalDialogOpen(false); }} />
      <RequestFormDialog open={reqDialogOpen} onOpenChange={setReqDialogOpen} projectId={activeProject.id} onSuccess={() => { refetchReq(); setReqDialogOpen(false); }} />
      <ControlFormDialog open={ctrlDialogOpen} onOpenChange={setCtrlDialogOpen} projectId={activeProject.id} equipment={equipment} onSuccess={() => { refetchCtrl(); setCtrlDialogOpen(false); }} />
    </div>
  );
}
