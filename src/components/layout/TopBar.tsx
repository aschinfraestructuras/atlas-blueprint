import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, LogOut, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "pt", label: "PT", name: "Português" },
  { code: "es", label: "ES", name: "Español" },
];

export function TopBar() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4 flex-shrink-0 z-10">
      {/* Left – app identity (mobile only, sidebar hidden) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
          <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold tracking-widest uppercase text-foreground">
          {t("common.appName")}
        </span>
      </div>

      {/* Spacer (desktop) */}
      <div className="hidden md:block" />

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {currentLang.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs">{t("topbar.language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={cn(
                  "text-sm gap-2",
                  i18n.language === lang.code && "font-semibold text-primary"
                )}
              >
                <span className="w-6 text-xs font-bold">{lang.label}</span>
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="hidden sm:block text-xs truncate text-muted-foreground">
                {user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-sm text-destructive focus:text-destructive gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("topbar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
