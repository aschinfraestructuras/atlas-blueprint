import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban, LayoutDashboard, FileText, AlertTriangle,
  ClipboardCheck, Rocket, X, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "atlas_onboarding_completed";

interface TourStep {
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  route?: string;
}

const STEPS: TourStep[] = [
  {
    icon: Rocket,
    titleKey: "onboarding.steps.welcome.title",
    descKey: "onboarding.steps.welcome.desc",
  },
  {
    icon: FolderKanban,
    titleKey: "onboarding.steps.projects.title",
    descKey: "onboarding.steps.projects.desc",
    route: "/projects",
  },
  {
    icon: LayoutDashboard,
    titleKey: "onboarding.steps.dashboard.title",
    descKey: "onboarding.steps.dashboard.desc",
    route: "/",
  },
  {
    icon: FileText,
    titleKey: "onboarding.steps.documents.title",
    descKey: "onboarding.steps.documents.desc",
    route: "/documents",
  },
  {
    icon: AlertTriangle,
    titleKey: "onboarding.steps.nc.title",
    descKey: "onboarding.steps.nc.desc",
    route: "/non-conformities",
  },
  {
    icon: ClipboardCheck,
    titleKey: "onboarding.steps.ready.title",
    descKey: "onboarding.steps.ready.desc",
  },
];

export function OnboardingTour() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  }, []);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      if (STEPS[next].route) navigate(STEPS[next].route!);
    } else {
      finish();
    }
  }, [step, navigate, finish]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      const prev = step - 1;
      setStep(prev);
      if (STEPS[prev].route) navigate(STEPS[prev].route!);
    }
  }, [step, navigate]);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-300" />

      {/* Card */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl",
            "animate-in zoom-in-95 fade-in duration-300"
          )}
        >
          {/* Close */}
          <button
            onClick={finish}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Progress bar */}
          <div className="h-1 w-full rounded-t-2xl bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="flex flex-col items-center px-8 pt-10 pb-8 text-center">
            {/* Icon ring */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Icon className="h-8 w-8 text-primary" />
            </div>

            <h2 className="text-lg font-bold text-card-foreground mb-2">
              {t(current.titleKey)}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t(current.descKey)}
            </p>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 mt-6 mb-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step
                      ? "w-6 bg-primary"
                      : i < step
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 w-full">
              {step > 0 ? (
                <Button variant="outline" size="sm" onClick={goPrev} className="gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t("common.back")}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
                  {t("onboarding.skip")}
                </Button>
              )}
              <div className="flex-1" />
              <Button size="sm" onClick={goNext} className="gap-1">
                {isLast ? t("onboarding.finish") : t("common.next")}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
