import { useState } from "react";
import { useTranslation } from "react-i18next";
import { planningService, type CompletionCheck } from "@/lib/services/planningService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activityId: string;
  activityDesc: string;
}

export function CompletionCheckDialog({ open, onOpenChange, activityId, activityDesc }: Props) {
  const { t } = useTranslation();
  const [result, setResult] = useState<CompletionCheck | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const r = await planningService.checkCompletion(activityId);
      setResult(r);
    } catch (e: any) {
      setResult({ can_complete: false, blocks: [e.message] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResult(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("planning.completion.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">{activityDesc}</p>

        {!result ? (
          <Button onClick={check} disabled={loading} className="w-full">
            {loading ? t("common.loading") : t("planning.completion.runCheck")}
          </Button>
        ) : result.can_complete ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{t("planning.completion.canComplete")}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">{t("planning.completion.blocked")}</span>
            </div>
            <ul className="space-y-1 pl-7 list-disc text-sm text-muted-foreground">
              {result.blocks.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
