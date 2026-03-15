import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check URL hash for recovery type
    const hash = window.location.hash;
    const search = window.location.search;
    const hasRecoveryToken = hash.includes("type=recovery") || search.includes("type=recovery");

    if (hasRecoveryToken) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    setChecking(false);

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.errors.passwordTooShort", { defaultValue: "A password deve ter pelo menos 8 caracteres." }));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.errors.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid/expired link — no recovery token detected
  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-10 shadow-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground">
            {t("auth.invalidRecoveryTitle", { defaultValue: "Link inválido ou expirado" })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("auth.invalidRecoveryText", { defaultValue: "Solicite um novo link de recuperação na página de login." })}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => navigate("/login", { replace: true })}
          >
            {t("auth.backToSignIn", { defaultValue: "Voltar ao login" })}
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-10 shadow-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground">
            {t("auth.passwordUpdatedTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("auth.passwordUpdatedText")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-2 justify-center">
          <ShieldCheck className="h-5 w-5 text-foreground" />
          <span className="text-base font-semibold tracking-widest uppercase">
            {t("common.appName")}
          </span>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              {t("auth.resetPasswordTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("auth.resetPasswordSubtitle")}
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={t("auth.passwordPlaceholderSignup")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !password || !confirmPassword}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.updatingPassword")}
                </>
              ) : (
                t("auth.updatePassword")
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
