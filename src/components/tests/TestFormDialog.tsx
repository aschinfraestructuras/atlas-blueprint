import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { testService } from "@/lib/services/testService";
import type { TestResult, TestCatalogEntry } from "@/lib/services/testService";
import { toast } from "@/hooks/use-toast";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

const schema = (t: (k: string) => string) =>
  z.object({
    test_id:    z.string().min(1, t("tests.form.validation.testRequired")),
    date:       z.string().min(1, t("tests.form.validation.dateRequired")),
    status:     z.string().min(1),
    sample_ref: z.string().trim().max(100).optional().or(z.literal("")),
    location:   z.string().trim().max(200).optional().or(z.literal("")),
  });

type FormValues = z.infer<ReturnType<typeof schema>>;

interface TestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testResult?: TestResult | null;
  onSuccess: () => void;
}

export function TestFormDialog({ open, onOpenChange, testResult, onSuccess }: TestFormDialogProps) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [submitting, setSubmitting]       = useState(false);
  const [catalog, setCatalog]             = useState<TestCatalogEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [newTestName, setNewTestName]     = useState("");
  const [newTestCode, setNewTestCode]     = useState("");
  const [creatingNew, setCreatingNew]     = useState(false);
  const isEdit = !!testResult;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema(t)),
    defaultValues: {
      test_id: "", date: new Date().toISOString().split("T")[0],
      status: "pending", sample_ref: "", location: "",
    },
  });

  useEffect(() => {
    if (open && activeProject) {
      setLoadingCatalog(true);
      testService
        .getCatalogByProject(activeProject.id)
        .then(setCatalog)
        .catch((err) => console.error("Catalog load error:", err))
        .finally(() => setLoadingCatalog(false));
    }
  }, [open, activeProject]);

  useEffect(() => {
    if (open) {
      form.reset(
        testResult
          ? {
              test_id: testResult.test_id, date: testResult.date,
              status: testResult.status, sample_ref: testResult.sample_ref ?? "",
              location: testResult.location ?? "",
            }
          : {
              test_id: "", date: new Date().toISOString().split("T")[0],
              status: "pending", sample_ref: "", location: "",
            }
      );
      setCreatingNew(false);
      setNewTestName("");
      setNewTestCode("");
    }
  }, [open, testResult, form]);

  const handleCreateCatalogEntry = async () => {
    if (!activeProject || !newTestName.trim() || !newTestCode.trim()) return;
    setSubmitting(true);
    try {
      const entry = await testService.createCatalogEntry({
        project_id: activeProject.id,
        name: newTestName.trim(),
        code: newTestCode.trim().toUpperCase(),
      });
      setCatalog((prev) => [...prev, entry]);
      form.setValue("test_id", entry.id);
      setCreatingNew(false);
      setNewTestName("");
      setNewTestCode("");
      toast({ title: t("tests.toast.catalogCreated") });
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw || t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeProject) return;
    setSubmitting(true);
    try {
      if (isEdit && testResult) {
        await testService.update(testResult.id, activeProject.id, {
          test_id: values.test_id, date: values.date, status: values.status,
          sample_ref: values.sample_ref || undefined,
          location: values.location || undefined,
        });
        toast({ title: t("tests.toast.updated") });
      } else {
        await testService.create({
          project_id: activeProject.id,
          test_id: values.test_id, date: values.date, status: values.status,
          sample_ref: values.sample_ref || undefined,
          location: values.location || undefined,
        });
        toast({ title: t("tests.toast.created") });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const info = classifySupabaseError(err);
      toast({
        title: t(info.titleKey),
        description: info.descriptionKey ? t(info.descriptionKey) : info.raw || t("auth.errors.unexpected"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("tests.form.titleEdit") : t("tests.form.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Test type */}
            <FormField
              control={form.control}
              name="test_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tests.form.testType")}</FormLabel>
                  {loadingCatalog ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("common.loading")}
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("tests.form.testTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {catalog.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.code} — {entry.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick create catalog entry */}
            {!creatingNew ? (
              <button
                type="button"
                className="text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => setCreatingNew(true)}
              >
                + {t("tests.form.addNewTestType")}
              </button>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("tests.form.newTestTypeLabel")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t("tests.form.newTestCodePlaceholder")}
                    value={newTestCode}
                    onChange={(e) => setNewTestCode(e.target.value.toUpperCase())}
                    className="font-mono text-sm"
                  />
                  <Input
                    placeholder={t("tests.form.newTestNamePlaceholder")}
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="text-xs"
                    onClick={() => { setCreatingNew(false); setNewTestName(""); setNewTestCode(""); }}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" size="sm" className="text-xs"
                    onClick={handleCreateCatalogEntry}
                    disabled={!newTestName.trim() || !newTestCode.trim() || submitting}>
                    {t("tests.form.addTestTypeBtn")}
                  </Button>
                </div>
              </div>
            )}

            {/* Date + Status */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.date")}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">{t("tests.status.pending")}</SelectItem>
                      <SelectItem value="compliant">{t("tests.status.compliant")}</SelectItem>
                      <SelectItem value="non_compliant">{t("tests.status.non_compliant")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Sample ref + Location */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="sample_ref" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("tests.table.sampleRef")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl><Input placeholder={t("tests.form.sampleRefPlaceholder")} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("tests.table.location")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({t("common.optional")})</span>
                  </FormLabel>
                  <FormControl><Input placeholder={t("tests.form.locationPlaceholder")} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Attachments section (only for existing records) ── */}
            {activeProject && (
              <>
                <Separator />
                <AttachmentsPanel
                  projectId={activeProject.id}
                  entityType="test"
                  entityId={testResult?.id ?? null}
                />
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {isEdit ? t("common.save") : t("tests.form.createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
