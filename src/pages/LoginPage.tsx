import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ShieldCheck, Loader2, Globe, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

type Mode = "login" | "forgot";

const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "es", label: "ES" },
];

const COOLDOWN_MS = 2000;

const RAW_ERRORS: Record<string, string> = {
  "Invalid login credentials": "errors.invalidCredentials",
  "Email not confirmed": "errors.emailNotConfirmed",
  "Password should be at least 6 characters": "errors.passwordTooShort",
  "Signups not allowed for this instance": "errors.signupsDisabled",
  "For security purposes": "errors.rateLimited",
};

function mapError(msg: string, t: (k: string) => string): string {
  for (const [raw, key] of Object.entries(RAW_ERRORS)) {
    if (msg.includes(raw)) return t(`auth.${key}`);
  }
  return msg || t("auth.errors.unexpected");
}

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_MS / 1000);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(mapError(msg, t));
      startCooldown();
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(mapError(msg, t));
    } finally {
      setSubmitting(false);
    }
  };

  const isLoginDisabled = submitting || !email || !password || cooldown > 0;

  // Reset email sent confirmation
  if (resetSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-10 shadow-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground">
            {t("auth.resetSentTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("auth.resetSentText", { email })}
          </p>
          <button
            className="mt-6 text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setResetSent(false);
              setMode("login");
              setPassword("");
            }}
          >
            {t("auth.backToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary">
      {/* Left panel – branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 lg:flex">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary-foreground/80" />
          <span className="text-lg font-semibold tracking-widest text-primary-foreground/80 uppercase">
            {t("common.appName")}
          </span>
        </div>
        <div>
          <blockquote className="space-y-2">
            <p className="text-2xl font-light leading-relaxed text-primary-foreground">
              {t("auth.qualityQuote")}
            </p>
            <footer className="text-sm text-primary-foreground/60">
              {t("auth.qualityQuoteAuthor")}
            </footer>
          </blockquote>
        </div>
        <p className="text-xs text-primary-foreground/40 uppercase tracking-widest">
          {t("auth.qmsLabel")}
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col">
        {/* Language switcher top-right */}
        <div className="flex justify-end p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                {LANGUAGES.find((l) => l.code === i18n.language)?.label ?? "PT"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-28">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={cn(
                    "text-sm",
                    i18n.language === lang.code && "font-semibold text-primary"
                  )}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <ShieldCheck className="h-5 w-5 text-foreground" />
              <span className="text-base font-semibold tracking-widest uppercase">
                {t("common.appName")}
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {mode === "login" ? t("auth.signInTitle") : t("auth.forgotPasswordTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? t("auth.signInSubtitle") : t("auth.forgotPasswordSubtitle")}
              </p>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => { setMode("forgot"); setError(null); }}
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder={t("auth.passwordPlaceholder")}
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
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[48px]"
                  disabled={isLoginDisabled}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : cooldown > 0 ? (
                    t("auth.cooldown", { seconds: cooldown, defaultValue: `Aguarda ${cooldown}s…` })
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5" noValidate>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t("auth.email")}</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !email}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.sendingReset")}
                    </>
                  ) : (
                    t("auth.sendResetLink")
                  )}
                </Button>
              </form>
            )}

            {/* Invite-only notice + back to login */}
            <div className="space-y-3 text-center">
              {mode === "forgot" && (
                <button
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => { setMode("login"); setError(null); }}
                >
                  {t("auth.backToSignIn")}
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                {t("auth.inviteOnlyNotice")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
