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
import loginHero from "@/assets/login-hero-quality.jpg";


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
    <div className="flex min-h-screen" style={{ background: "hsl(210 20% 98%)" }}>
      {/* Left panel – Hero image (quality / infrastructure) */}
      <div className="hidden lg:flex w-[58%] flex-col justify-between p-12 relative overflow-hidden bg-[hsl(215_80%_15%)]">

        {/* Imagem hero em fullscreen */}
        <img
          src={loginHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Overlay gradient para contraste do texto */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(215 80% 12% / 0.55) 0%, hsl(215 80% 12% / 0.25) 40%, hsl(215 80% 12% / 0.30) 70%, hsl(215 80% 8% / 0.85) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Vinheta lateral subtil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, hsl(215 80% 8% / 0.35) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Animações sobrepostas — movimento subtil */}
        <style>{`
          @keyframes loginTrail {
            0%   { transform: translateX(-30%); opacity: 0; }
            15%  { opacity: 0.8; }
            85%  { opacity: 0.8; }
            100% { transform: translateX(130%); opacity: 0; }
          }
          @keyframes loginPulse {
            0%, 100% { transform: scale(1);   opacity: 0.55; box-shadow: 0 0 0 0 hsl(180 90% 60% / 0.5); }
            50%      { transform: scale(1.4); opacity: 1;    box-shadow: 0 0 0 10px hsl(180 90% 60% / 0); }
          }
          @keyframes loginOrbit {
            from { transform: rotate(0deg) translateX(48px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(48px) rotate(-360deg); }
          }
          @keyframes loginRing {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50%      { opacity: 0.55; transform: scale(1.05); }
          }
          @keyframes loginShimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .lg-trail   { animation: loginTrail 7s ease-in-out infinite; }
          .lg-trail-2 { animation: loginTrail 9s ease-in-out infinite 2.5s; }
          .lg-trail-3 { animation: loginTrail 11s ease-in-out infinite 5s; }
          .lg-pulse   { animation: loginPulse 2.6s ease-in-out infinite; }
          .lg-orbit   { animation: loginOrbit 8s linear infinite; }
          .lg-ring    { animation: loginRing 4s ease-in-out infinite; }
          .lg-shimmer { animation: loginShimmer 6s ease-in-out infinite; }
        `}</style>

        {/* Light trails horizontais (acompanham as linhas da imagem) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="lg-trail absolute h-[2px] w-[35%]"
            style={{
              top: "42%",
              background: "linear-gradient(90deg, transparent 0%, hsl(180 95% 65% / 0.9) 50%, transparent 100%)",
              filter: "blur(0.5px)",
              boxShadow: "0 0 12px hsl(180 95% 65% / 0.7)",
            }}
          />
          <div
            className="lg-trail-2 absolute h-[1.5px] w-[28%]"
            style={{
              top: "58%",
              background: "linear-gradient(90deg, transparent 0%, hsl(190 90% 70% / 0.8) 50%, transparent 100%)",
              filter: "blur(0.5px)",
              boxShadow: "0 0 10px hsl(180 95% 65% / 0.6)",
            }}
          />
          <div
            className="lg-trail-3 absolute h-[1px] w-[22%]"
            style={{
              top: "72%",
              background: "linear-gradient(90deg, transparent 0%, hsl(180 95% 75% / 0.7) 50%, transparent 100%)",
              filter: "blur(0.5px)",
            }}
          />

          {/* Shimmer diagonal subtil (toda a área) */}
          <div
            className="lg-shimmer absolute -inset-y-10 w-1/3"
            style={{
              background:
                "linear-gradient(115deg, transparent 0%, hsl(0 0% 100% / 0.04) 50%, transparent 100%)",
            }}
          />

          {/* Sensores pulsantes (pontos cyan) */}
          <span
            className="lg-pulse absolute h-2 w-2 rounded-full"
            style={{ top: "30%", left: "22%", background: "hsl(180 95% 65%)" }}
          />
          <span
            className="lg-pulse absolute h-1.5 w-1.5 rounded-full"
            style={{ top: "65%", left: "78%", background: "hsl(180 95% 70%)", animationDelay: "1.3s" }}
          />
          <span
            className="lg-pulse absolute h-1.5 w-1.5 rounded-full"
            style={{ top: "48%", left: "12%", background: "hsl(190 90% 72%)", animationDelay: "0.7s" }}
          />

          {/* Órbita: anel + bolinha que rola */}
          <div
            className="absolute"
            style={{ top: "38%", right: "14%", width: "112px", height: "112px" }}
          >
            <div
              className="lg-ring absolute inset-0 rounded-full border"
              style={{ borderColor: "hsl(180 95% 65% / 0.35)" }}
            />
            <div
              className="absolute inset-0 rounded-full border border-dashed"
              style={{ borderColor: "hsl(180 95% 65% / 0.2)" }}
            />
            <div
              className="absolute"
              style={{ top: "50%", left: "50%", width: 0, height: 0 }}
            >
              <span
                className="lg-orbit absolute block h-2.5 w-2.5 rounded-full"
                style={{
                  marginLeft: "-5px",
                  marginTop: "-5px",
                  background: "hsl(180 95% 70%)",
                  boxShadow: "0 0 12px hsl(180 95% 65% / 0.9), 0 0 24px hsl(180 95% 65% / 0.5)",
                }}
              />
            </div>
          </div>
        </div>


        {/* Logo top */}
        <div className="relative z-10 flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-white/90" />
          <span className="text-base font-bold tracking-[0.22em] uppercase text-white/95">
            {t("common.appName")}
          </span>
        </div>

        {/* Spacer central — deixa a imagem respirar */}
        <div className="relative z-10 flex-1" />

        {/* Bottom: tagline elegante */}
        <div className="relative z-10 space-y-4 max-w-md">
          <div className="h-px w-12 bg-white/40" />
          <blockquote className="space-y-2">
            <p className="text-2xl font-light leading-snug text-white tracking-tight">
              {t("auth.qualityQuote")}
            </p>
            <footer className="text-xs uppercase tracking-[0.2em] text-white/60">
              — {t("auth.qualityQuoteAuthor")}
            </footer>
          </blockquote>
          <p className="text-[10px] tracking-[0.32em] uppercase text-white/45 pt-2">
            {t("auth.qmsLabel")}
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[hsl(210_20%_98%)] lg:bg-[hsl(210_20%_98%)]">
        {/* === Mobile/Tablet only: background moderno (escondido em lg+) === */}
        <div className="absolute inset-0 lg:hidden pointer-events-none" aria-hidden="true">
          {/* Imagem hero também em tablet/mobile */}
          <img
            src={loginHero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Overlay para contraste do form */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(215 80% 12% / 0.70) 0%, hsl(215 80% 14% / 0.78) 50%, hsl(215 80% 10% / 0.92) 100%)",
            }}
          />
          {/* Light trails subtis (mobile) */}
          <style>{`
            @keyframes mobTrail {
              0%   { transform: translateX(-30%); opacity: 0; }
              20%  { opacity: 0.7; }
              80%  { opacity: 0.7; }
              100% { transform: translateX(130%); opacity: 0; }
            }
            @keyframes mobBlob {
              0%, 100% { transform: translate(0,0) scale(1); }
              50%      { transform: translate(20px,-15px) scale(1.08); }
            }
            .mob-trail   { animation: mobTrail 8s ease-in-out infinite; }
            .mob-trail-2 { animation: mobTrail 11s ease-in-out infinite 3s; }
            .mob-blob    { animation: mobBlob 10s ease-in-out infinite; }
          `}</style>
          <div
            className="mob-trail absolute h-[1.5px] w-[40%]"
            style={{
              top: "28%",
              background: "linear-gradient(90deg, transparent, hsl(180 95% 65% / 0.8), transparent)",
              boxShadow: "0 0 12px hsl(180 95% 65% / 0.6)",
            }}
          />
          <div
            className="mob-trail-2 absolute h-[1px] w-[30%]"
            style={{
              top: "75%",
              background: "linear-gradient(90deg, transparent, hsl(190 90% 70% / 0.7), transparent)",
            }}
          />
          {/* Blobs cyan (atmosfera) */}
          <div
            className="mob-blob absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl"
            style={{ background: "hsl(180 95% 50% / 0.18)" }}
          />
          <div
            className="mob-blob absolute -bottom-24 -left-16 w-80 h-80 rounded-full blur-3xl"
            style={{ background: "hsl(215 90% 50% / 0.25)", animationDelay: "3s" }}
          />
        </div>

        {/* Language switcher top-right */}
        <div className="relative z-10 flex justify-end p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-semibold text-muted-foreground lg:text-muted-foreground text-white/80 hover:text-white hover:bg-white/10 lg:hover:bg-accent lg:hover:text-foreground"
              >
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

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-8 lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0 lg:backdrop-blur-none rounded-2xl border border-white/15 bg-white/[0.06] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_-15px_hsl(215_80%_5%/0.6)] lg:!bg-transparent lg:!border-0 lg:!shadow-none lg:!p-0 lg:!backdrop-blur-none">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <ShieldCheck className="h-5 w-5 text-white lg:text-foreground" />
              <span className="text-base font-semibold tracking-widest uppercase text-white lg:text-foreground">
                {t("common.appName")}
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[1.75rem] font-bold tracking-tight text-white lg:text-foreground">
                {mode === "login" ? t("auth.signInTitle") : t("auth.forgotPasswordTitle")}
              </h1>
              <p className="text-sm text-white/70 lg:text-muted-foreground">
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
                  className="w-full min-h-[48px] text-base font-semibold"
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
                  className="text-sm font-medium text-white lg:text-foreground underline-offset-4 hover:underline"
                  onClick={() => { setMode("login"); setError(null); }}
                >
                  {t("auth.backToSignIn")}
                </button>
              )}
              <p className="text-xs text-white/65 lg:text-muted-foreground">
                {t("auth.inviteOnlyNotice")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
