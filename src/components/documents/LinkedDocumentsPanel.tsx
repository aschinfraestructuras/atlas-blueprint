import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Plus, Eye, Trash2, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { documentService } from "@/lib/services/documentService";
import type { Document, DocumentLink } from "@/lib/services/documentService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LinkedDocumentsPanelProps {
  entityType: string;   // e.g. "work_item", "ppi_instance", "test_result", "non_conformity"
  entityId: string;
  projectId: string;
}

const STATUS_DOT: Record<string, string> = {
  draft:     "bg-muted-foreground",
  in_review: "bg-primary",
  approved:  "bg-chart-2",
  obsolete:  "bg-amber-500",
  archived:  "bg-muted-foreground/50",
};

export function LinkedDocumentsPanel({ entityType, entityId, projectId }: LinkedDocumentsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [links, setLinks] = useState<(DocumentLink & { document?: Document })[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get all links pointing to this entity
      const { data: linkData } = await supabase
        .from("document_links")
        .select("*")
        .eq("linked_entity_type", entityType)
        .eq("linked_entity_id", entityId);

      if (!linkData || linkData.length === 0) {
        setLinks([]);
        setLoading(false);
        return;
      }

      // Fetch the documents
      const docIds = linkData.map((l) => l.document_id);
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .in("id", docIds)
        .eq("is_deleted", false);

      const docMap = new Map((docs ?? []).map((d) => [d.id, d]));
      setLinks(
        linkData.map((l) => ({
          ...l,
          document: docMap.get(l.document_id) as Document | undefined,
        }))
      );
    } catch { /* */ } finally { setLoading(false); }
  }, [entityType, entityId]);

  const loadAllDocs = useCallback(async () => {
    if (!projectId) return;
    try {
      const docs = await documentService.getByProject(projectId);
      setAllDocs(docs);
    } catch { /* */ }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!selectedDocId) return;
    setSubmitting(true);
    try {
      await documentService.addLink(selectedDocId, entityType, entityId);
      toast({ title: t("documents.links.added") });
      setAdding(false);
      setSelectedDocId("");
      load();
    } catch {
      toast({ title: t("documents.toast.error"), variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleRemove = async (linkId: string) => {
    try {
      await documentService.removeLink(linkId);
      toast({ title: t("documents.links.removed") });
      load();
    } catch {
      toast({ title: t("documents.toast.error"), variant: "destructive" });
    }
  };

  const handleStartAdd = () => {
    setAdding(true);
    loadAllDocs();
  };

  // Filter out already linked docs
  const linkedDocIds = new Set(links.map((l) => l.document_id));
  const availableDocs = allDocs.filter((d) => !linkedDocIds.has(d.id));

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3 pt-4 px-5 flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t("documents.linkedPanel.title")}
          {links.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
              {links.length}
            </span>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleStartAdd}>
          <Plus className="h-3 w-3" />
          {t("documents.linkedPanel.addDoc")}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {adding && (
          <div className="flex items-end gap-2 px-5 py-3 bg-muted/30 border-b border-border">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{t("documents.linkedPanel.selectDoc")}</label>
              <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  {availableDocs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-mono text-[10px] mr-1">{d.code}</span> {d.title}
                    </SelectItem>
                  ))}
                  {availableDocs.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">{t("documents.linkedPanel.noAvailable")}</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={submitting || !selectedDocId}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : t("common.save")}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : links.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <FileText className="h-6 w-6 opacity-40" />
            <p className="text-sm">{t("documents.linkedPanel.empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {links.map((link) => {
              const doc = link.document;
              if (!doc) return null;
              return (
                <li key={link.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer group"
                  onClick={() => navigate(`/documents/${doc.id}`)}>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[doc.status] ?? "bg-muted-foreground")} />
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{doc.code}</span>
                      <span>·</span>
                      <span>{t(`documents.docTypes.${doc.doc_type}`, { defaultValue: doc.doc_type })}</span>
                      {doc.revision && <><span>·</span><span>Rev. {doc.revision}</span></>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] py-0 flex-shrink-0">
                    {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                  </Badge>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleRemove(link.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
