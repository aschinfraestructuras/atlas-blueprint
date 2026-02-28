/**
 * HealthCheckPage — /admin/health
 * Self-check page for admins to verify system integrity.
 * Tests table access, RLS, and module availability.
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Loader2, Database, Lock, Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

// ─── Check definitions ───────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  category: "table" | "rls" | "function" | "storage";
  status: "pass" | "fail" | "warn" | "pending";
  message: string;
  durationMs?: number;
}

const TABLES_TO_CHECK = [
  "projects",
  "documents",
  "work_items",
  "test_results",
  "tests_catalog",
  "non_conformities",
  "ppi_instances",
  "ppi_templates",
  "ppi_instance_items",
  "suppliers",
  "subcontractors",
  "plans",
  "survey_records",
  "technical_office_items",
  "attachments",
  "audit_log",
  "profiles",
  "project_members",
  "topography_equipment",
  "equipment_calibrations",
  "topography_requests",
  "topography_controls",
] as const;

const RPC_FUNCTIONS = [
  "fn_next_ppi_code",
  "is_project_member",
  "is_project_admin",
  "get_project_role",
] as const;

const STORAGE_BUCKETS = ["atlas_files", "qms-files"] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function HealthCheckPage() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    if (!activeProject || !user) return;
    setRunning(true);
    const checks: CheckResult[] = [];

    // ── 1. Table access checks ────────────────────────────────────────────
    for (const table of TABLES_TO_CHECK) {
      const start = performance.now();
      try {
        // project_members has no 'id' column (composite PK)
        const selectCol = table === "project_members" ? "user_id" : "id";
        const { data, error } = await (supabase.from(table as any) as any)
          .select(selectCol, { count: "exact", head: true })
          .limit(1);
        const dur = Math.round(performance.now() - start);
        if (error) {
          checks.push({
            name: table,
            category: "table",
            status: "fail",
            message: error.message,
            durationMs: dur,
          });
        } else {
          checks.push({
            name: table,
            category: "table",
            status: "pass",
            message: `OK (${dur}ms)`,
            durationMs: dur,
          });
        }
      } catch (err) {
        checks.push({
          name: table,
          category: "table",
          status: "fail",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ── 2. RLS / membership checks ────────────────────────────────────────
    try {
      const start = performance.now();
      const { data, error } = await supabase.rpc("is_project_member", {
        _user_id: user.id,
        _project_id: activeProject.id,
      });
      const dur = Math.round(performance.now() - start);
      checks.push({
        name: "is_project_member",
        category: "rls",
        status: data ? "pass" : "warn",
        message: data
          ? `Membro confirmado (${dur}ms)`
          : `Não é membro do projeto ativo (${dur}ms)`,
        durationMs: dur,
      });
    } catch (err) {
      checks.push({
        name: "is_project_member",
        category: "rls",
        status: "fail",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      const start = performance.now();
      const { data, error } = await supabase.rpc("get_project_role", {
        _user_id: user.id,
        _project_id: activeProject.id,
      });
      const dur = Math.round(performance.now() - start);
      checks.push({
        name: "get_project_role",
        category: "rls",
        status: data ? "pass" : "warn",
        message: data ? `Role: ${data} (${dur}ms)` : `Sem role atribuída (${dur}ms)`,
        durationMs: dur,
      });
    } catch (err) {
      checks.push({
        name: "get_project_role",
        category: "rls",
        status: "fail",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // ── 3. RPC function checks ────────────────────────────────────────────
    try {
      const start = performance.now();
      const { data, error } = await supabase.rpc("fn_next_ppi_code", {
        p_project_id: activeProject.id,
      });
      const dur = Math.round(performance.now() - start);
      checks.push({
        name: "fn_next_ppi_code",
        category: "function",
        status: error ? "fail" : "pass",
        message: error ? error.message : `Next: ${data} (${dur}ms)`,
        durationMs: dur,
      });
    } catch (err) {
      checks.push({
        name: "fn_next_ppi_code",
        category: "function",
        status: "fail",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // ── 4. Storage bucket checks ──────────────────────────────────────────
    for (const bucket of STORAGE_BUCKETS) {
      const start = performance.now();
      try {
        const { data, error } = await supabase.storage.from(bucket).list("", { limit: 1 });
        const dur = Math.round(performance.now() - start);
        checks.push({
          name: bucket,
          category: "storage",
          status: error ? "warn" : "pass",
          message: error ? error.message : `Acessível (${dur}ms)`,
          durationMs: dur,
        });
      } catch (err) {
        checks.push({
          name: bucket,
          category: "storage",
          status: "fail",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setResults(checks);
    setLastRun(new Date());
    setRunning(false);
  }, [activeProject, user]);

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warn").length;
  const totalCount = results.length;

  const statusIcon = (s: CheckResult["status"]) => {
    if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === "fail") return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === "warn") return <AlertCircle className="h-4 w-4 text-amber-500" />;
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const categoryIcon = (c: CheckResult["category"]) => {
    if (c === "table") return <Database className="h-3.5 w-3.5" />;
    if (c === "rls") return <Lock className="h-3.5 w-3.5" />;
    if (c === "function") return <Globe className="h-3.5 w-3.5" />;
    return <Database className="h-3.5 w-3.5" />;
  };

  const grouped = {
    table: results.filter((r) => r.category === "table"),
    rls: results.filter((r) => r.category === "rls"),
    function: results.filter((r) => r.category === "function"),
    storage: results.filter((r) => r.category === "storage"),
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        module={t("health.module", { defaultValue: "Sistema" })}
        title={t("health.title", { defaultValue: "Verificação de Saúde" })}
        subtitle={t("health.subtitle", { defaultValue: "Testes automáticos de integridade do sistema" })}
        icon={ShieldCheck}
        iconColor="hsl(158, 45%, 32%)"
        actions={
          <Button
            onClick={runChecks}
            disabled={running || !activeProject}
            className="gap-2"
          >
            {running
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            {t("health.runChecks", { defaultValue: "Executar verificações" })}
          </Button>
        }
      />

      {/* Summary */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5 text-xs bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle2 className="h-3 w-3" /> {passCount} OK
          </Badge>
          {warnCount > 0 && (
            <Badge variant="outline" className="gap-1.5 text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
              <AlertCircle className="h-3 w-3" /> {warnCount} Avisos
            </Badge>
          )}
          {failCount > 0 && (
            <Badge variant="outline" className="gap-1.5 text-xs bg-destructive/10 text-destructive border-destructive/20">
              <XCircle className="h-3 w-3" /> {failCount} Falhas
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {lastRun && `${t("health.lastRun", { defaultValue: "Última execução" })}: ${lastRun.toLocaleTimeString()}`}
          </span>
        </div>
      )}

      {/* No project guard */}
      {!activeProject && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-5 text-sm text-amber-700">
            {t("health.noProject", { defaultValue: "Selecione um projeto ativo para executar as verificações." })}
          </CardContent>
        </Card>
      )}

      {/* Results by category */}
      {(["table", "rls", "function", "storage"] as const).map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const catLabels: Record<string, string> = {
          table: t("health.cat.tables", { defaultValue: "Tabelas" }),
          rls: t("health.cat.rls", { defaultValue: "RLS / Permissões" }),
          function: t("health.cat.functions", { defaultValue: "Funções RPC" }),
          storage: t("health.cat.storage", { defaultValue: "Storage" }),
        };
        return (
          <Card key={cat} className="border bg-card shadow-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {categoryIcon(cat)} {catLabels[cat]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="divide-y divide-border">
                {items.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    {statusIcon(r.status)}
                    <span className="font-mono text-xs font-semibold text-foreground min-w-[180px]">
                      {r.name}
                    </span>
                    <span className={cn(
                      "text-xs flex-1",
                      r.status === "fail" ? "text-destructive" :
                      r.status === "warn" ? "text-amber-600" :
                      "text-muted-foreground",
                    )}>
                      {r.message}
                    </span>
                    {r.durationMs != null && (
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        {r.durationMs}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Empty state before first run */}
      {totalCount === 0 && activeProject && (
        <Card className="border bg-card shadow-card">
          <CardContent className="p-10 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {t("health.ready", { defaultValue: "Clique em «Executar verificações» para testar a integridade do sistema." })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
