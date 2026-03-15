import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

type Strength = "weak" | "medium" | "strong";

function getStrength(password: string): { strength: Strength; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { strength: "weak", score };
  if (score <= 3) return { strength: "medium", score };
  return { strength: "strong", score };
}

const COLORS: Record<Strength, string> = {
  weak: "bg-destructive",
  medium: "bg-amber-500",
  strong: "bg-chart-2",
};

const WIDTHS: Record<Strength, string> = {
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();
  const { strength } = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            WIDTHS[strength],
            COLORS[strength]
          )}
        />
      </div>
      <p className={cn(
        "text-[10px] font-medium",
        strength === "weak" && "text-destructive",
        strength === "medium" && "text-amber-500",
        strength === "strong" && "text-chart-2",
      )}>
        {t(`auth.passwordStrength.${strength}`, {
          defaultValue: strength === "weak" ? "Fraca" : strength === "medium" ? "Média" : "Forte",
        })}
      </p>
    </div>
  );
}
