import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { memberService } from "@/lib/services/memberService";
import { useProject } from "@/contexts/ProjectContext";
import { classifySupabaseError } from "@/lib/utils/supabaseError";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AcceptState = "loading" | "success" | "error" | "set-password";

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refetchProjects } = useProject();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<AcceptState>("loading");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Flow A: Magic link from email — Supabase sets session via hash fragment
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      // Session is established by Supabase automatically via onAuthStateChange
      // Show the set-password form
      setState("set-password");
      return;
    }

    // Flow B: Manual token via query param
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

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorText(t("auth.passwordsMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      setErrorText(t("auth.errors.passwordTooShort"));
      return;
    }

    setSubmitting(true);
    setErrorText(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await refetchProjects();
      setState("success");
      toast.success(t("settings.members.inviteAccepted"));
      setTimeout(() => navigate("/", { replace: true }), 900);
    } catch (err) {
      const info = classifySupabaseError(err, t);
      setErrorText(info.description ?? info.raw);
    } finally {
      setSubmitting(false);
    }
  };

  // Set-password form for magic link flow
  if (state === "set-password") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">{t("auth.welcomeAtlas", "Bem-vindo ao Atlas QMS")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.setPasswordSubtitle", "Defina a sua password para começar.")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              {errorText && (
                <p className="text-sm text-destructive text-center">{errorText}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={submitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={submitting}
                />
              </div>

              <Button
                type="submit"
                className="w-full min-h-[48px]"
                disabled={submitting || !newPassword || !confirmPassword}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  t("auth.setPassword", "Definir password")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
