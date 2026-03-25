import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Pencil, Loader2, Users, List, ChevronDown, ChevronRight, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { projectContactService, type ProjectContact } from "@/lib/services/projectContactService";
import { distributionListService, type DistributionList } from "@/lib/services/distributionListService";

const ROLE_TYPES = ["fiscalizacao", "direccao_obra", "projectista", "cliente", "outro"];
const ENTITY_TYPES = ["all", "hp", "nc", "rfi", "submittal", "transmittal"];

interface Props {
  projectId: string;
}

export function ContactsNotificationsSection({ projectId }: Props) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(true);

  // Contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ProjectContact | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", company: "", role_title: "", role_type: "fiscalizacao", phone: "", is_active: true, notes: "" });
  const [savingContact, setSavingContact] = useState(false);

  // List dialog
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  const [listForm, setListForm] = useState({ name: "", description: "", entity_type: "all", is_default: false });
  const [listMembers, setListMembers] = useState<string[]>([]);
  const [savingList, setSavingList] = useState(false);

  // Expanded list
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [expandedMembers, setExpandedMembers] = useState<ProjectContact[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l] = await Promise.all([
        projectContactService.list(projectId),
        distributionListService.list(projectId),
      ]);
      setContacts(c);
      setLists(l);
    } catch { /* ignore */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Contact CRUD ────
  const openContactDialog = (contact?: ProjectContact) => {
    if (contact) {
      setEditingContact(contact);
      setContactForm({
        name: contact.name, email: contact.email, company: contact.company ?? "",
        role_title: contact.role_title ?? "", role_type: contact.role_type,
        phone: contact.phone ?? "", is_active: contact.is_active, notes: contact.notes ?? "",
      });
    } else {
      setEditingContact(null);
      setContactForm({ name: "", email: "", company: "", role_title: "", role_type: "fiscalizacao", phone: "", is_active: true, notes: "" });
    }
    setContactDialogOpen(true);
  };

  const saveContact = async () => {
    if (!contactForm.name.trim() || !contactForm.email.trim()) return;
    if (!/\S+@\S+\.\S+/.test(contactForm.email)) {
      toast.error("Email inválido");
      return;
    }
    setSavingContact(true);
    try {
      const payload = {
        project_id: projectId,
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        company: contactForm.company.trim() || null,
        role_title: contactForm.role_title.trim() || null,
        role_type: contactForm.role_type,
        phone: contactForm.phone.trim() || null,
        is_active: contactForm.is_active,
        notes: contactForm.notes.trim() || null,
      };
      if (editingContact) {
        await projectContactService.update(editingContact.id, payload);
      } else {
        await projectContactService.create(payload);
      }
      toast.success(t("common.saved"));
      setContactDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message ?? t("common.error"));
    }
    setSavingContact(false);
  };

  const deleteContact = async (id: string) => {
    try {
      await projectContactService.remove(id);
      toast.success(t("common.deleted"));
      loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  // ── List CRUD ────
  const openListDialog = (list?: DistributionList) => {
    if (list) {
      setEditingList(list);
      setListForm({ name: list.name, description: list.description ?? "", entity_type: list.entity_type, is_default: list.is_default });
      // Load members
      distributionListService.getMembersOfList(list.id).then(m => setListMembers(m.map(c => c.id))).catch(() => {});
    } else {
      setEditingList(null);
      setListForm({ name: "", description: "", entity_type: "all", is_default: false });
      setListMembers([]);
    }
    setListDialogOpen(true);
  };

  const saveList = async () => {
    if (!listForm.name.trim()) return;
    setSavingList(true);
    try {
      const payload = {
        project_id: projectId,
        name: listForm.name.trim(),
        description: listForm.description.trim() || null,
        entity_type: listForm.entity_type,
        is_default: listForm.is_default,
      };
      let listId: string;
      if (editingList) {
        await distributionListService.update(editingList.id, payload);
        listId = editingList.id;
      } else {
        const created = await distributionListService.create(payload);
        listId = created.id;
      }
      // Sync members
      if (editingList) {
        const current = await distributionListService.getMembersOfList(listId);
        const currentIds = current.map(c => c.id);
        const toAdd = listMembers.filter(id => !currentIds.includes(id));
        const toRemove = currentIds.filter(id => !listMembers.includes(id));
        await Promise.all([
          ...toAdd.map(id => distributionListService.addMember(listId, id)),
          ...toRemove.map(id => distributionListService.removeMember(listId, id)),
        ]);
      } else {
        await Promise.all(listMembers.map(id => distributionListService.addMember(listId, id)));
      }
      toast.success(t("common.saved"));
      setListDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message ?? t("common.error"));
    }
    setSavingList(false);
  };

  const deleteList = async (id: string) => {
    try {
      await distributionListService.remove(id);
      toast.success(t("common.deleted"));
      loadData();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const toggleExpand = async (listId: string) => {
    if (expandedListId === listId) {
      setExpandedListId(null);
      return;
    }
    try {
      const members = await distributionListService.getMembersOfList(listId);
      setExpandedMembers(members);
      setExpandedListId(listId);
    } catch { /* ignore */ }
  };

  const activeContacts = contacts.filter(c => c.is_active);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Contacts ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold">{t("contacts.title", { defaultValue: "Contactos do Projecto" })}</h3>
            <Badge variant="secondary" className="text-[10px]">{contacts.length}</Badge>
          </div>
          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => openContactDialog()}>
            <Plus className="h-3 w-3" />
            {t("contacts.add", { defaultValue: "Novo Contacto" })}
          </Button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("common.noData")}</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[10px]">{t("contacts.name")}</TableHead>
                  <TableHead className="text-[10px]">{t("contacts.company", { defaultValue: "Empresa" })}</TableHead>
                  <TableHead className="text-[10px]">{t("contacts.roleTitle", { defaultValue: "Função" })}</TableHead>
                  <TableHead className="text-[10px]">{t("contacts.email", { defaultValue: "Email" })}</TableHead>
                  <TableHead className="text-[10px] w-24">{t("common.status")}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.company ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.role_title ?? t(`contacts.roleType.${c.role_type}`, { defaultValue: c.role_type })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.is_active ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 text-[10px]" : "border-border text-muted-foreground text-[10px]"}>
                        {c.is_active ? t("workers.status.active") : t("workers.status.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openContactDialog(c)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("common.deleteConfirmDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteContact(c.id)}>{t("common.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Distribution Lists ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold">{t("distLists.title", { defaultValue: "Listas de Distribuição" })}</h3>
            <Badge variant="secondary" className="text-[10px]">{lists.length}</Badge>
          </div>
          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => openListDialog()}>
            <Plus className="h-3 w-3" />
            {t("distLists.add", { defaultValue: "Nova Lista" })}
          </Button>
        </div>

        {lists.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("common.noData")}</p>
        ) : (
          <div className="space-y-2">
            {lists.map(l => (
              <div key={l.id} className="rounded-lg border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-2.5 bg-card hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(l.id)}
                >
                  {expandedListId === l.id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <span className="text-xs font-medium flex-1">{l.name}</span>
                  <Badge variant="outline" className="text-[9px]">{t(`distLists.types.${l.entity_type}`, { defaultValue: l.entity_type })}</Badge>
                  {l.is_default && <Badge variant="secondary" className="text-[9px]">★ {t("distLists.isDefault", { defaultValue: "Padrão" })}</Badge>}
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openListDialog(l)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("common.deleteConfirmDesc")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteList(l.id)}>{t("common.delete")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {expandedListId === l.id && (
                  <div className="border-t border-border px-4 py-2 bg-muted/10">
                    {expandedMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("distLists.members", { defaultValue: "Membros" })}: 0</p>
                    ) : (
                      <div className="space-y-1">
                        {expandedMembers.map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground">{m.email}</span>
                            <span className="text-muted-foreground">({m.company ?? "—"})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Contact Dialog ── */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? t("common.edit") : t("contacts.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("contacts.name")} *</Label>
                <Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("contacts.email")} *</Label>
                <Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("contacts.company")}</Label>
                <Input value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("contacts.roleTitle")}</Label>
                <Input value={contactForm.role_title} onChange={e => setContactForm(f => ({ ...f, role_title: e.target.value }))} className="h-8 text-xs" placeholder="Ex: Fiscal Principal" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={contactForm.role_type} onValueChange={v => setContactForm(f => ({ ...f, role_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_TYPES.map(rt => (
                      <SelectItem key={rt} value={rt}>{t(`contacts.roleType.${rt}`, { defaultValue: rt })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={contactForm.is_active} onCheckedChange={v => setContactForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">{t("workers.status.active")}</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Textarea value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-xs resize-none" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={saveContact} disabled={savingContact || !contactForm.name.trim() || !contactForm.email.trim()}>
              {savingContact && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── List Dialog ── */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingList ? t("common.edit") : t("distLists.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("common.name")} *</Label>
              <Input value={listForm.name} onChange={e => setListForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" placeholder="Ex: HP Fiscalização" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.description")}</Label>
              <Input value={listForm.description} onChange={e => setListForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Entidade</Label>
                <Select value={listForm.entity_type} onValueChange={v => setListForm(f => ({ ...f, entity_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map(et => (
                      <SelectItem key={et} value={et}>{t(`distLists.types.${et}`, { defaultValue: et })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={listForm.is_default} onCheckedChange={v => setListForm(f => ({ ...f, is_default: v }))} />
                <Label className="text-xs">{t("distLists.isDefault")}</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("distLists.members")} ({listMembers.length})</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                {activeContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">{t("contacts.add")}</p>
                ) : (
                  activeContacts.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-xs hover:bg-muted/30 rounded px-1 py-0.5 cursor-pointer">
                      <Checkbox
                        checked={listMembers.includes(c.id)}
                        onCheckedChange={checked => {
                          setListMembers(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id));
                        }}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-muted-foreground truncate">{c.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={saveList} disabled={savingList || !listForm.name.trim()}>
              {savingList && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
