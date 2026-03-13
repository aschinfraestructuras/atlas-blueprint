import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import {
  Settings, Users, ShieldCheck, Sliders, Globe, Bell, Lock,
  Building2, Mail, UserCheck, Key, Database, ChevronRight,
  Plus, Trash2, UserMinus, Loader2, Sun, Moon, Monitor,
  ImageIcon, Upload, X, ClipboardList, HardDrive, Check, Eye, Pencil, ShieldAlert, Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectRole } from "@/hooks/useProjectRole";
import { memberService, type ProjectMember, type ProjectInvite } from "@/lib/services/memberService";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "sonner";

const MOD = {
  documents: "hsl(215, 70%, 38%)", tests: "hsl(252, 55%, 45%)",
  nc: "hsl(2, 60%, 44%)", suppliers: "hsl(158, 45%, 32%)",
  plans: "hsl(188, 55%, 32%)", projects: "hsl(221, 50%, 40%)",
  muted: "hsl(215, 15%, 65%)",
} as const;

const PROJECT_ROLES = ["admin", "project_manager", "quality_manager", "technician", "viewer"];

const ROLE_COLOR: Record<string, string> = {
  admin: MOD.nc, project_manager: MOD.plans, quality_manager: MOD.suppliers,
  technician: MOD.tests, viewer: MOD.muted,
};

// ── Section block ─────────────────────────────────────────────────────────────
function SettingsSection({ icon: Icon, title, subtitle, color, badge, children }: {
  icon: React.ElementType; title: string; subtitle: string; color: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <Card className="border bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[13px] font-bold tracking-tight text-foreground">{title}</CardTitle>
              {badge && <span className="inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide border" style={{ color, borderColor: `${color}30`, background: `${color}0e` }}>{badge}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">{children}</CardContent>
    </Card>
  );
}

function SettingsRow({ label, description, value, icon: Icon, comingSoon = false, comingSoonLabel }: {
  label: string; description?: string; value?: string; icon?: React.ElementType; comingSoon?: boolean; comingSoonLabel?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-3 border-b border-border/50 last:border-0", comingSoon ? "opacity-50" : "hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150 cursor-default")}>
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-foreground leading-none">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {comingSoon ? (
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full border border-border text-muted-foreground">{comingSoonLabel}</span>
        ) : (
          <>{value && <span className="text-[11px] text-muted-foreground">{value}</span>}<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" /></>
        )}
      </div>
    </div>
  );
}

// ── Branding Section ──────────────────────────────────────────────────────────
function BrandingSection() {
  const { t } = useTranslation();
  const { logoUrl, uploading, uploadLogo, removeLogo } = useProjectLogo();
  const { isAdmin } = useProjectRole();
  const fileRef = useRef<HTMLInputElement>(null);
  const sb = (key: string) => t(`pages.settings.sections.branding.${key}`);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(sb("uploadError"));
      return;
    }
    const ok = await uploadLogo(file);
    if (ok) toast.success(sb("uploadSuccess"));
    else toast.error(sb("uploadError"));
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = async () => {
    const ok = await removeLogo();
    if (ok) toast.success(sb("removeSuccess"));
  };

  if (!isAdmin) return null;

  return (
    <SettingsSection icon={ImageIcon} title={sb("title")} subtitle={sb("subtitle")} color="hsl(252, 55%, 45%)">
      <div className="flex items-start gap-4 py-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted/30 overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[11px] text-muted-foreground leading-snug">{sb("uploadDesc")}</p>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleFile} />
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? sb("uploading") : sb("upload")}
            </Button>
            {logoUrl && (
              <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-destructive hover:text-destructive" onClick={handleRemove}>
                <X className="h-3 w-3" /> {sb("remove")}
              </Button>
            )}
          </div>
          {!logoUrl && <p className="text-[10px] text-muted-foreground/60">{sb("noLogo")}</p>}
        </div>
      </div>
    </SettingsSection>
  );
}

// ── Notification Preferences Section ──────────────────────────────────────────
const NOTIF_PREFS_KEY = "atlas_notif_prefs";
const DEFAULT_NOTIF_PREFS = { nc_new: true, doc_approval: true, deadline_overdue: true, test_new: true, ppi_submitted: false, member_joined: false };

function NotificationPreferencesSection() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}") }; }
    catch { return DEFAULT_NOTIF_PREFS; }
  });

  const toggle = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key as keyof typeof prefs] };
    setPrefs(next);
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
  };

  const items: { key: string; label: string; desc: string }[] = [
    { key: "nc_new", label: t("pages.settings.sections.notifications.ncNew", { defaultValue: "Nova Não Conformidade" }), desc: t("pages.settings.sections.notifications.ncNewDesc", { defaultValue: "Quando uma NC é criada no projeto" }) },
    { key: "doc_approval", label: t("pages.settings.sections.notifications.docApproval", { defaultValue: "Documento para Aprovação" }), desc: t("pages.settings.sections.notifications.docApprovalDesc", { defaultValue: "Quando um documento necessita de aprovação" }) },
    { key: "deadline_overdue", label: t("pages.settings.sections.notifications.deadlineOverdue", { defaultValue: "Prazo de Ação Vencido" }), desc: t("pages.settings.sections.notifications.deadlineOverdueDesc", { defaultValue: "Quando uma ação ultrapassa o prazo" }) },
    { key: "test_new", label: t("pages.settings.sections.notifications.testNew", { defaultValue: "Novo Ensaio Registado" }), desc: t("pages.settings.sections.notifications.testNewDesc", { defaultValue: "Quando é registado um resultado de ensaio" }) },
    { key: "ppi_submitted", label: t("pages.settings.sections.notifications.ppiSubmitted", { defaultValue: "PPI Submetido" }), desc: t("pages.settings.sections.notifications.ppiSubmittedDesc", { defaultValue: "Quando um PPI é submetido para aprovação" }) },
    { key: "member_joined", label: t("pages.settings.sections.notifications.memberJoined", { defaultValue: "Novo Membro" }), desc: t("pages.settings.sections.notifications.memberJoinedDesc", { defaultValue: "Quando alguém aceita um convite" }) },
  ];

  return (
    <SettingsSection icon={Bell} title={t("pages.settings.sections.notifications.title", { defaultValue: "Preferências de Notificação" })} subtitle={t("pages.settings.sections.notifications.subtitle", { defaultValue: "Escolha quais eventos geram alertas" })} color="hsl(36, 70%, 50%)">
      <div className="space-y-0.5">
        {items.map(item => (
          <label key={item.key} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={prefs[item.key as keyof typeof prefs] ?? false}
              onChange={() => toggle(item.key)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground leading-none">{item.label}</p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          </label>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 italic">
        {t("pages.settings.sections.notifications.emailNote", { defaultValue: "Notificações por email — em breve. As preferências ficam guardadas para quando a funcionalidade for ativada." })}
      </p>
    </SettingsSection>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const { isAdmin, role: myRole } = useProjectRole();
  const { theme, setTheme } = useTheme();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [inviting, setInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"create" | "invite">("create");
  const [invitePassword, setInvitePassword] = useState("");
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const cs = t("pages.settings.comingSoon");
  const s = (key: string) => t(`pages.settings.sections.${key}`);

  const fetchMembers = useCallback(async () => {
    if (!activeProject) return;
    setLoadingMembers(true);
    try {
      const [m, inv] = await Promise.all([
        memberService.getMembers(activeProject.id),
        isAdmin ? memberService.getPendingInvites(activeProject.id) : Promise.resolve([]),
      ]);
      setMembers(m);
      setInvites(inv);
    } catch (err) {
      console.error("[SettingsPage] fetchMembers", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [activeProject, isAdmin]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleInvite = async () => {
    if (!activeProject || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      if (inviteMode === "create") {
        // Direct account creation via Edge Function
        if (!invitePassword || invitePassword.length < 6) {
          toast.error(t("settings.members.passwordTooShort", { defaultValue: "A senha deve ter pelo menos 6 caracteres." }));
          setInviting(false);
          return;
        }
        const result = await memberService.createMember(activeProject.id, inviteEmail.trim(), invitePassword, inviteRole);
        if (result.status === "added_existing") {
          toast.success(t("settings.members.addedDirectly", { defaultValue: "Utilizador existente adicionado ao projecto." }));
        } else {
          toast.success(t("settings.members.accountCreated", { defaultValue: "Conta criada com sucesso. O membro pode agora aceder com o email e senha definidos." }));
        }
      } else {
        // Token-based invite (original flow)
        const result = await memberService.invite(activeProject.id, inviteEmail.trim(), inviteRole);
        if (result.status === "added_directly") {
          toast.success(t("settings.members.addedDirectly"));
        } else {
          if (result.token) {
            const inviteUrl = `${window.location.origin}/invite/accept?token=${result.token}`;
            try {
              await navigator.clipboard.writeText(inviteUrl);
              toast.success(t("settings.members.inviteSent"), { description: inviteUrl });
            } catch {
              toast.success(t("settings.members.inviteSent"), { description: inviteUrl });
            }
          } else {
            toast.success(t("settings.members.inviteSent"));
          }
        }
      }
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("technician");
      setInviteDialogOpen(false);
      fetchMembers();
    } catch (err: any) {
      const msg = err?.message || err?.toString() || "";
      if (msg.includes("already an active member")) {
        toast.error(t("settings.members.alreadyMember", { defaultValue: "Este utilizador já é membro activo deste projecto." }));
      } else {
        const classified = classifySupabaseError(err, t);
        toast.error(classified.title, { description: classified.description ?? classified.raw });
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!activeProject) return;
    try {
      await memberService.updateRole(activeProject.id, userId, newRole);
      toast.success(t("settings.members.roleUpdated"));
      fetchMembers();
    } catch (err: any) {
      const classified = classifySupabaseError(err, t);
      toast.error(classified.title, { description: classified.description ?? classified.raw });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeProject) return;
    try {
      await memberService.removeMember(activeProject.id, userId);
      toast.success(t("settings.members.memberRemoved"));
      fetchMembers();
    } catch (err: any) {
      const classified = classifySupabaseError(err, t);
      toast.error(classified.title, { description: classified.description ?? classified.raw });
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await memberService.deleteInvite(inviteId);
      toast.success(t("settings.members.inviteDeleted"));
      fetchMembers();
    } catch (err: any) {
      const classified = classifySupabaseError(err, t);
      toast.error(classified.title, { description: classified.description ?? classified.raw });
    }
  };

  const userEmail = user?.email ?? "—";
  const roleColor = ROLE_COLOR[myRole ?? "viewer"] ?? MOD.muted;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t("pages.settings.system")}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-none">{t("pages.settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("pages.settings.subtitle")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card shadow-card px-4 py-2.5">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("pages.settings.version")}</span>
        </div>
      </div>

      {/* ── 1. Project Settings ──────────────────────────────────────── */}
      <SettingsSection icon={Building2} title={s("project.title")} subtitle={s("project.subtitle")} color={MOD.projects} badge={activeProject ? s("project.badgeActive") : undefined}>
        <SettingsRow label={s("project.activeProject")} description={activeProject?.name ?? s("project.noProject")} value={activeProject?.code} icon={Building2} />
        <SettingsRow label={s("project.location")} description={activeProject?.location ?? "—"} icon={Globe} comingSoon comingSoonLabel={cs} />
        <SettingsRow label={s("project.notifications")} description={s("project.notificationsDesc")} icon={Bell} comingSoon comingSoonLabel={cs} />
        <div
          className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150 cursor-pointer"
          onClick={() => {
            if (!activeProject) return;
            const exportData = {
              project: { name: activeProject.name, code: activeProject.code, location: activeProject.location, status: activeProject.status, start_date: (activeProject as any).start_date },
              exported_at: new Date().toISOString(),
              exported_by: user?.email ?? "—",
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${activeProject.code}_export.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(t("pages.settings.sections.project.exportDone", { defaultValue: "Dados exportados com sucesso." }));
          }}
        >
          <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-foreground leading-none">{s("project.exportData")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s("project.exportDataDesc")}</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      </SettingsSection>

      {/* ── 2. User Profile ──────────────────────────────────────────── */}
      <SettingsSection icon={UserCheck} title={s("profile.title")} subtitle={s("profile.subtitle")} color={MOD.documents}>
        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold flex-shrink-0" style={{ background: `${MOD.documents}18`, color: MOD.documents, border: `1px solid ${MOD.documents}28` }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold text-foreground leading-none">{userEmail}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide border" style={{ color: roleColor, borderColor: `${roleColor}30`, background: `${roleColor}0e` }}>
                {t(`settings.roles.${myRole ?? "viewer"}`)}
              </span>
            </div>
          </div>
        </div>
        <SettingsRow label={s("profile.changeEmail")} description={s("profile.changeEmailDesc")} icon={Mail} comingSoon comingSoonLabel={cs} />

        {/* Password change */}
        <div className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150 cursor-pointer" onClick={() => setPasswordDialogOpen(true)}>
          <Key className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-foreground leading-none">{s("profile.changePassword")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s("profile.changePasswordDesc")}</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>

        {/* Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{s("profile.changePassword")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>{t("settings.password.newPasswordLabel")}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("settings.password.newPasswordPlaceholder")} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
              <Button
                disabled={changingPassword || newPassword.length < 6}
                onClick={async () => {
                  setChangingPassword(true);
                  try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    toast.success(t("settings.password.success"));
                    setNewPassword("");
                    setPasswordDialogOpen(false);
                  } catch (err: any) {
                    toast.error(t("settings.password.error"), { description: err?.message });
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                {changingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {t("settings.password.changeBtn")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsSection>

      {/* ── 3. User Management — FUNCTIONAL ──────────────────────────── */}
      <SettingsSection icon={Users} title={s("users.title")} subtitle={s("users.subtitle")} color={MOD.plans}>
        {/* Invite button */}
        {isAdmin && (
          <div className="mb-4">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {t("settings.members.inviteBtn")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("settings.members.inviteTitle", { defaultValue: "Adicionar Membro" })}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Mode toggle */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={inviteMode === "create" ? "default" : "outline"}
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setInviteMode("create")}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {t("settings.members.createAccount", { defaultValue: "Criar Conta" })}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={inviteMode === "invite" ? "default" : "outline"}
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setInviteMode("invite")}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {t("settings.members.inviteToken", { defaultValue: "Convite (Token)" })}
                    </Button>
                  </div>

                  <div>
                    <Label>{t("settings.members.emailLabel")}</Label>
                    <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t("settings.members.emailPlaceholder")} />
                  </div>

                  {inviteMode === "create" && (
                    <div>
                      <Label>{t("settings.members.passwordLabel", { defaultValue: "Senha de acesso" })}</Label>
                      <div className="relative">
                        <Input
                          type={showInvitePassword ? "text" : "password"}
                          value={invitePassword}
                          onChange={(e) => setInvitePassword(e.target.value)}
                          placeholder={t("settings.members.passwordPlaceholder", { defaultValue: "Mínimo 6 caracteres" })}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowInvitePassword((v) => !v)}
                          tabIndex={-1}
                        >
                          {showInvitePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {t("settings.members.passwordHint", { defaultValue: "O membro pode alterar a senha nas Definições após o primeiro login." })}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label>{t("settings.members.roleLabel")}</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROJECT_ROLES.map(r => (
                          <SelectItem key={r} value={r}>{t(`settings.roles.${r}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
                  <Button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim() || (inviteMode === "create" && invitePassword.length < 6)}
                  >
                    {inviting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    {inviteMode === "create"
                      ? t("settings.members.createBtn", { defaultValue: "Criar Membro" })
                      : t("settings.members.sendInvite")
                    }
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Members table */}
        {loadingMembers ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("settings.members.noMembers")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.members.colName")}</TableHead>
                <TableHead>{t("settings.members.colEmail")}</TableHead>
                <TableHead>{t("settings.members.colRole")}</TableHead>
                {isAdmin && <TableHead className="w-[100px]">{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => {
                const isMe = m.user_id === user?.id;
                const displayEmail = m.profile?.email || (isMe ? user?.email : null) || m.user_id.substring(0, 8);
                const displayName = m.profile?.full_name || displayEmail;
                const color = ROLE_COLOR[m.role] ?? MOD.muted;
                return (
                  <TableRow key={m.user_id}>
                    <TableCell className="text-sm font-medium">{displayName}{isMe && <span className="text-muted-foreground ml-1 text-xs">({t("settings.members.you")})</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{displayEmail}</TableCell>
                    <TableCell>
                      {isAdmin && !isMe ? (
                        <Select value={m.role} onValueChange={(v) => handleRoleChange(m.user_id, v)}>
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_ROLES.map(r => (
                              <SelectItem key={r} value={r}>{t(`settings.roles.${r}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]" style={{ color, borderColor: `${color}30`, background: `${color}0e` }}>
                          {t(`settings.roles.${m.role}`)}
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {!isMe && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("settings.members.removeTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("settings.members.removeDesc", { name: displayName })}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleRemoveMember(m.user_id)}>
                                  {t("settings.members.removeConfirm")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pending invites */}
        {isAdmin && invites.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("settings.members.pendingInvites")}</p>
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{inv.email}</p>
                    <p className="text-[10px] text-muted-foreground">{t(`settings.roles.${inv.role}`)} · {t("settings.members.expires")} {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteInvite(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsSection>

      {/* ── 4. Permissions Matrix ────────────────────────────────── */}
      <SettingsSection icon={ShieldCheck} title={s("permissions.title")} subtitle={s("permissions.subtitle")} color={MOD.suppliers}>
        {/* Role legend */}
        <div className="space-y-1.5 pt-1 mb-4">
          {PROJECT_ROLES.map(key => {
            const color = ROLE_COLOR[key] ?? MOD.muted;
            return (
              <div key={key} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border w-[130px] justify-center" style={{ color, borderColor: `${color}30`, background: `${color}0e` }}>
                  {t(`settings.roles.${key}`)}
                </span>
                <p className="text-[11.5px] text-muted-foreground leading-snug flex-1">
                  {t(`settings.roleDescriptions.${key}`)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Module permissions matrix */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {t("pages.settings.sections.permissions.matrixTitle", { defaultValue: "Permissões por módulo" })}
        </p>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider w-[120px]">
                  {t("pages.settings.sections.permissions.module", { defaultValue: "Módulo" })}
                </TableHead>
                {PROJECT_ROLES.map(r => (
                  <TableHead key={r} className="text-center text-[9px] font-bold uppercase tracking-wider px-1">
                    <span style={{ color: ROLE_COLOR[r] ?? MOD.muted }}>{t(`settings.roles.${r}`)}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(["documents", "tests", "nc", "ppi", "materials", "suppliers", "subcontractors", "plans", "planning", "daily_reports", "topography", "recycled"] as const).map(mod => {
                const modPerms: Record<string, { view: boolean; edit: boolean; approve: boolean }> = {
                  admin:           { view: true, edit: true, approve: true },
                  project_manager: { view: true, edit: true, approve: true },
                  quality_manager: { view: true, edit: true, approve: true },
                  technician:      { view: true, edit: true, approve: false },
                  viewer:          { view: true, edit: false, approve: false },
                };
                return (
                  <TableRow key={mod} className="hover:bg-muted/20">
                    <TableCell className="text-[11px] font-medium capitalize py-2">
                      {t(`pages.settings.sections.permissions.modules.${mod}`, { defaultValue: mod.replace("_", " ") })}
                    </TableCell>
                    {PROJECT_ROLES.map(role => {
                      const p = modPerms[role];
                      return (
                        <TableCell key={role} className="text-center py-2">
                          <div className="flex items-center justify-center gap-0.5">
                            {p?.view && <Eye className="h-3 w-3 text-muted-foreground" />}
                            {p?.edit && <Pencil className="h-3 w-3 text-blue-500" />}
                            {p?.approve && <ShieldAlert className="h-3 w-3 text-green-600" />}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {t("pages.settings.sections.permissions.view", { defaultValue: "Ver" })}</span>
          <span className="flex items-center gap-1"><Pencil className="h-3 w-3 text-blue-500" /> {t("pages.settings.sections.permissions.edit", { defaultValue: "Editar" })}</span>
          <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-green-600" /> {t("pages.settings.sections.permissions.approve", { defaultValue: "Aprovar" })}</span>
        </div>
      </SettingsSection>

      {/* ── 5. Preferences ───────────────────────────────────────────── */}
      <SettingsSection icon={Sliders} title={s("preferences.title")} subtitle={s("preferences.subtitle")} color={MOD.tests}>
        {/* Language Switcher - Functional */}
        <div className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150">
          <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-foreground leading-none">{s("preferences.language")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s("preferences.languageDesc")}</p>
          </div>
          <Select
            value={i18n.language?.startsWith("es") ? "es" : "pt"}
            onValueChange={(lang) => {
              i18n.changeLanguage(lang);
              localStorage.setItem("atlas_lang", lang);
            }}
          >
            <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SettingsRow label={s("preferences.timezone")} description={s("preferences.timezoneDesc")} icon={Sliders} comingSoon comingSoonLabel={cs} />
        {/* Theme Selector - Functional */}
        <div className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150">
          <Settings className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-foreground leading-none">{s("preferences.theme")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s("preferences.themeDesc")}</p>
          </div>
          <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
            <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light"><div className="flex items-center gap-1.5"><Sun className="h-3 w-3" />{t("topbar.themeLight")}</div></SelectItem>
              <SelectItem value="dark"><div className="flex items-center gap-1.5"><Moon className="h-3 w-3" />{t("topbar.themeDark")}</div></SelectItem>
              <SelectItem value="system"><div className="flex items-center gap-1.5"><Monitor className="h-3 w-3" />{t("topbar.themeSystem")}</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Restart Onboarding Tour */}
        <div className="flex items-center gap-3 py-3 border-b border-border/50 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-150">
          <Rocket className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-foreground leading-none">{t("pages.settings.sections.preferences.tour", { defaultValue: "Tour de boas-vindas" })}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t("pages.settings.sections.preferences.tourDesc", { defaultValue: "Rever o guia introdutório da plataforma" })}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              localStorage.removeItem("atlas_onboarding_completed");
              navigate("/");
              window.location.reload();
            }}
          >
            <Rocket className="h-3 w-3" />
            {t("pages.settings.sections.preferences.restartTour", { defaultValue: "Repetir tour" })}
          </Button>
        </div>
      </SettingsSection>

      {/* ── 6. Notification Preferences ──────────────────────────────── */}
      <NotificationPreferencesSection />

      {/* ── 7. Branding / Logo ───────────────────────────────────────── */}
      <BrandingSection />

      {/* ── 8. System Audit ──────────────────────────────────────────── */}
      {(isAdmin || myRole === "project_manager" || myRole === "quality_manager") && (
        <SettingsSection icon={ClipboardList} title={t("pages.settings.sections.audit.title", { defaultValue: "Auditoria do Sistema" })} subtitle={t("pages.settings.sections.audit.subtitle", { defaultValue: "Logs de ações, alterações e aprovações — ISO 9001" })} color={MOD.nc}>
          <div className="space-y-2">
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              {t("pages.settings.sections.audit.desc", { defaultValue: "O sistema regista automaticamente todas as ações críticas: criação, edição, aprovação, eliminação e mudanças de estado em todos os módulos." })}
            </p>
            <div className="flex flex-wrap gap-1.5 py-2">
              {["LOGIN", "INSERT", "UPDATE", "DELETE", "STATUS_CHANGE", "EXPORT", "APPROVE", "ROLE_CHANGED"].map(action => (
                <Badge key={action} variant="secondary" className="text-[9px] font-mono">{action}</Badge>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 mt-2"
              onClick={() => navigate("/audit-log")}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {t("pages.settings.sections.audit.viewLogs", { defaultValue: "Ver Logs do Sistema" })}
            </Button>
          </div>
        </SettingsSection>
      )}

      {/* ── 9. Backup & Security ─────────────────────────────────────── */}
      {isAdmin && (
        <SettingsSection icon={HardDrive} title={t("pages.settings.sections.backup.title", { defaultValue: "Backup e Segurança" })} subtitle={t("pages.settings.sections.backup.subtitle", { defaultValue: "Proteção de dados e continuidade operacional" })} color={MOD.plans}>
          <div className="space-y-3">
            <div className="flex items-start gap-3 py-2 border-b border-border/40">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{t("pages.settings.sections.backup.autoBackup", { defaultValue: "Backup Automático Diário" })}</p>
                <p className="text-[11px] text-muted-foreground">{t("pages.settings.sections.backup.autoBackupDesc", { defaultValue: "Supabase realiza backups automáticos diários com retenção de 7 dias (Pro) ou 30 dias (Enterprise)." })}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-border/40">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{t("pages.settings.sections.backup.rls", { defaultValue: "Row-Level Security (RLS)" })}</p>
                <p className="text-[11px] text-muted-foreground">{t("pages.settings.sections.backup.rlsDesc", { defaultValue: "Todas as tabelas possuem políticas RLS ativas — isolamento total entre projetos e utilizadores." })}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-border/40">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{t("pages.settings.sections.backup.encryption", { defaultValue: "Encriptação em Trânsito e Repouso" })}</p>
                <p className="text-[11px] text-muted-foreground">{t("pages.settings.sections.backup.encryptionDesc", { defaultValue: "TLS 1.3 para comunicação, AES-256 para dados em repouso." })}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground">{t("pages.settings.sections.backup.session", { defaultValue: "Auto-Logout por Inatividade" })}</p>
                <p className="text-[11px] text-muted-foreground">{t("pages.settings.sections.backup.sessionDesc", { defaultValue: "Sessão termina automaticamente após 30 minutos de inatividade, com aviso aos 25 minutos." })}</p>
              </div>
            </div>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
