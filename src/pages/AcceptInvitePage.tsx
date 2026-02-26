import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { memberService } from "@/lib/services/memberService";
import { useProject } from "@/contexts/ProjectContext";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { toast } from "sonner";

type AcceptState = "loading" | "success" | "error";

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refetchProjects } = useProject();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<AcceptState>("loading");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState("error");
      setErrorText(t("settings.members.invalidInviteToken"));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await memberService.acceptInvite(token);
        await refetchProjects();
        if (cancelled) return;
        setState("success");
        toast.success(t("settings.members.inviteAccepted"));
        setTimeout(() => navigate("/", { replace: true }), 900);
      } catch (err) {
        if (cancelled) return;
        const info = classifySupabaseError(err, t);
        setState("error");
        setErrorText(info.description ?? info.raw);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, refetchProjects, searchParams, t]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {state === "loading" && t("settings.members.acceptInviteLoading")}
            {state === "success" && t("settings.members.inviteAccepted")}
            {state === "error" && t("errors.generic.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-3">
            {state === "loading" && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
            {state === "success" && <CheckCircle2 className="h-8 w-8 text-primary" />}
            {state === "error" && <AlertTriangle className="h-8 w-8 text-destructive" />}
          </div>

          {errorText && <p className="text-sm text-destructive text-center">{errorText}</p>}

          <div className="flex justify-center">
            {state !== "loading" && (
              <Button variant="outline" onClick={() => navigate("/", { replace: true })}>
                {t("common.back")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
