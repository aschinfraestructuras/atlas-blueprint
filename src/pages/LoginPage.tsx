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
    <div className="flex min-h-screen" style={{ background: "hsl(210 20% 98%)" }}>
      {/* Left panel – Quality checklist animation */}
      <div className="hidden lg:flex w-[58%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "hsl(215 80% 38%)" }}>

        {/* Grelha subtil de fundo */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Gradiente radial suave */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 60% at 60% 45%, hsl(215 90% 48% / 0.4) 0%, transparent 70%)" }}
        />

        {/* CSS das animações */}
        <style>{`
          @keyframes qlFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes qlCheck {
            0%   { stroke-dashoffset: 24; opacity: 0; }
            30%  { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes qlBar {
            from { width: 0; }
            to   { width: var(--bar-w); }
          }
          @keyframes qlPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.08); }
          }
          @keyframes qlFloat {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-6px); }
          }
          .ql-item { animation: qlFadeIn 0.5s ease both; }
          .ql-item:nth-child(1) { animation-delay: 0.3s; }
          .ql-item:nth-child(2) { animation-delay: 0.9s; }
          .ql-item:nth-child(3) { animation-delay: 1.5s; }
          .ql-item:nth-child(4) { animation-delay: 2.1s; }
          .ql-item:nth-child(5) { animation-delay: 2.7s; }
          .ql-item:nth-child(6) { animation-delay: 3.3s; }
          .ql-check { stroke-dasharray: 24; animation: qlCheck 0.4s ease both; }
          .ql-check-1 { animation-delay: 0.7s; }
          .ql-check-2 { animation-delay: 1.3s; }
          .ql-check-3 { animation-delay: 1.9s; }
          .ql-check-4 { animation-delay: 2.5s; }
          .ql-check-5 { animation-delay: 3.1s; }
          .ql-bar-fill { animation: qlBar 0.7s cubic-bezier(0.16,1,0.3,1) both; }
          .ql-bar-1 { animation-delay: 0.8s; --bar-w: 92%; }
          .ql-bar-2 { animation-delay: 1.4s; --bar-w: 78%; }
          .ql-bar-3 { animation-delay: 2.0s; --bar-w: 65%; }
          .ql-bar-4 { animation-delay: 2.6s; --bar-w: 88%; }
          .ql-bar-5 { animation-delay: 3.2s; --bar-w: 55%; }
          .ql-score-ring { animation: qlFadeIn 0.6s ease 0.4s both; }
          .ql-float { animation: qlFloat 4s ease-in-out infinite; }
        `}</style>

        {/* Card central — checklist animada */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="ql-float" style={{ width: "340px" }}>
            <div style={{
              background: "hsl(0 0% 100% / 0.06)",
              border: "1px solid hsl(0 0% 100% / 0.12)",
              borderRadius: "20px",
              padding: "28px 24px",
              backdropFilter: "blur(12px)",
            }}>
              {/* Header do card */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "hsl(0 0% 100% / 0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                </div>
                <div>
                  <p style={{ color: "hsl(0 0% 100% / 0.9)", fontWeight: 700, fontSize: "13px", margin: 0 }}>Quality Checklist</p>
                  <p style={{ color: "hsl(0 0% 100% / 0.45)", fontSize: "11px", margin: 0 }}>PPI-PF17A · Rev.00</p>
                </div>
                {/* Score badge */}
                <div className="ql-score-ring" style={{ marginLeft: "auto", textAlign: "center" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="19" fill="none" stroke="hsl(0 0% 100% / 0.12)" strokeWidth="3"/>
                    <circle cx="24" cy="24" r="19" fill="none" stroke="hsl(145 60% 55%)" strokeWidth="3"
                      strokeDasharray="119.4" strokeDashoffset="14.3"
                      strokeLinecap="round" transform="rotate(-90 24 24)"
                      style={{ transition: "stroke-dashoffset 1.2s ease 3.5s" }}/>
                    <text x="24" y="28" textAnchor="middle" fill="white" fontSize="12" fontWeight="800">88%</text>
                  </svg>
                </div>
              </div>

              {/* Itens da checklist */}
              {[
                { label: "Compactação GC ≥ 95%",    ok: true,  bar: "ql-bar-1" },
                { label: "Geometria de via",          ok: true,  bar: "ql-bar-2" },
                { label: "Resistência betão fck",     ok: true,  bar: "ql-bar-3" },
                { label: "Gabarit catenária",         ok: true,  bar: "ql-bar-4" },
                { label: "Ensaio de soldadura US",    ok: false, bar: "ql-bar-5" },
                { label: "Drenagem PH 32.1",          ok: true,  bar: null },
              ].map((item, i) => (
                <div key={i} className="ql-item" style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  marginBottom: i < 5 ? "12px" : "0",
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0,
                    background: item.ok ? "hsl(145 60% 45% / 0.25)" : "hsl(0 65% 55% / 0.20)",
                    border: `1.5px solid ${item.ok ? "hsl(145 60% 55% / 0.6)" : "hsl(0 65% 55% / 0.5)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 13 13">
                      {item.ok
                        ? <path className={`ql-check ql-check-${i + 1}`}
                            d="M2.5 6.5l3 3 5-6"
                            fill="none" stroke="hsl(145 60% 65%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        : <path className={`ql-check ql-check-${i + 1}`}
                            d="M3.5 3.5l6 6M9.5 3.5l-6 6"
                            fill="none" stroke="hsl(0 65% 65%)" strokeWidth="2" strokeLinecap="round"/>}
                    </svg>
                  </div>
                  {/* Label + barra */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "hsl(0 0% 100% / 0.80)", fontSize: "11px", fontWeight: 600, margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label}
                    </p>
                    {item.bar && (
                      <div style={{ height: "4px", background: "hsl(0 0% 100% / 0.10)", borderRadius: "2px", overflow: "hidden" }}>
                        <div className={`ql-bar-fill ${item.bar}`} style={{
                          height: "100%", borderRadius: "2px",
                          background: item.ok ? "hsl(145 60% 55%)" : "hsl(0 65% 55%)",
                        }}/>
                      </div>
                    )}
                  </div>
                  {/* Status badge */}
                  <span style={{
                    fontSize: "9px", fontWeight: 700, padding: "2px 6px",
                    borderRadius: "4px", flexShrink: 0,
                    background: item.ok ? "hsl(145 60% 45% / 0.2)" : "hsl(0 65% 55% / 0.2)",
                    color: item.ok ? "hsl(145 60% 70%)" : "hsl(0 65% 70%)",
                    border: `1px solid ${item.ok ? "hsl(145 60% 55% / 0.3)" : "hsl(0 65% 55% / 0.3)"}`,
                  }}>
                    {item.ok ? "OK" : "NC"}
                  </span>
                </div>
              ))}

              {/* Footer */}
              <div style={{
                marginTop: "16px", paddingTop: "12px",
                borderTop: "1px solid hsl(0 0% 100% / 0.08)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: "10px", color: "hsl(0 0% 100% / 0.35)" }}>5 / 6 conformes</span>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px",
                  background: "hsl(38 88% 50% / 0.20)", color: "hsl(38 88% 70%)",
                  border: "1px solid hsl(38 88% 50% / 0.30)",
                }}>
                  CONF. C/ OBS.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo — logo e quote */}
        <div className="relative z-10 flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6" style={{ color: "hsl(0 0% 100% / 0.85)" }} />
          <span className="text-base font-bold tracking-[0.2em] uppercase" style={{ color: "hsl(0 0% 100% / 0.85)" }}>
            {t("common.appName")}
          </span>
        </div>

        <div className="relative z-10">
          <blockquote className="space-y-3">
            <p className="text-2xl font-light leading-relaxed" style={{ color: "hsl(0 0% 100%)" }}>
              {t("auth.qualityQuote")}
            </p>
            <footer className="text-sm" style={{ color: "hsl(0 0% 100% / 0.55)" }}>
              — {t("auth.qualityQuoteAuthor")}
            </footer>
          </blockquote>
        </div>

        <p className="relative z-10 text-[10px] tracking-[0.3em] uppercase" style={{ color: "hsl(0 0% 100% / 0.35)" }}>
          {t("auth.qmsLabel")}
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col" style={{ background: "hsl(210 20% 98%)" }}>
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

            <div className="space-y-1.5">
              <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground">
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
