import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface TestTemplate {
  id: string;
  project_id: string;
  test_id: string;
  version: number;
  title: string;
  form_schema: TestFormSchema;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tests_catalog?: { id: string; name: string; code: string } | null;
}

export interface TestFormField {
  key: string;
  label_pt: string;
  label_es: string;
  type: "number" | "text" | "select" | "date" | "boolean";
  unit?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  computed?: string; // formula expression e.g. "field_a / field_b * 100"
}

export interface TestFormCriteria {
  field: string;
  operator: ">=" | "<=" | ">" | "<" | "==" | "range";
  value: number;
  value_max?: number; // for range
  label_pt: string;
  label_es: string;
}

export interface TestFormSchema {
  fields: TestFormField[];
  criteria: TestFormCriteria[];
  auto_pass_fail?: boolean;
}

export interface TestTemplateInput {
  project_id: string;
  test_id: string;
  title: string;
  form_schema: TestFormSchema;
}

const SELECT = `*, tests_catalog(id, name, code)` as const;

export const testTemplateService = {
  async getByProject(projectId: string): Promise<TestTemplate[]> {
    const { data, error } = await (supabase as any)
      .from("test_templates")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TestTemplate[];
  },

  async getActiveForTest(projectId: string, testId: string): Promise<TestTemplate | null> {
    const { data, error } = await (supabase as any)
      .from("test_templates")
      .select(SELECT)
      .eq("project_id", projectId)
      .eq("test_id", testId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },

  async create(input: TestTemplateInput): Promise<TestTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("test_templates")
      .insert({ ...input, created_by: user?.id })
      .select(SELECT)
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "test_templates", entityId: data.id,
      action: "INSERT", module: "tests",
      diff: { title: input.title, test_id: input.test_id },
    });
    return data;
  },

  async update(id: string, projectId: string, updates: Partial<TestTemplateInput>): Promise<TestTemplate> {
    const { data, error } = await (supabase as any)
      .from("test_templates")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    await auditService.log({
      projectId, entity: "test_templates", entityId: id,
      action: "UPDATE", module: "tests",
      diff: updates as Record<string, unknown>,
    });
    return data;
  },

  async toggleActive(id: string, projectId: string, active: boolean): Promise<void> {
    const { error } = await (supabase as any)
      .from("test_templates")
      .update({ is_active: active })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "test_templates", entityId: id,
      action: "UPDATE", module: "tests",
      diff: { is_active: active },
    });
  },
};

// ─── Built-in template schemas ──────────────────────────────────────────────

export const BUILTIN_TEMPLATES: Record<string, TestFormSchema> = {
  "density_in_situ": {
    fields: [
      { key: "method", label_pt: "Método", label_es: "Método", type: "select", options: ["areia", "nuclear", "outro"], required: true },
      { key: "location", label_pt: "Local / PK", label_es: "Ubicación / PK", type: "text", required: true },
      { key: "layer", label_pt: "Camada", label_es: "Capa", type: "text" },
      { key: "thickness", label_pt: "Espessura (cm)", label_es: "Espesor (cm)", type: "number", unit: "cm" },
      { key: "w_natural", label_pt: "w% natural", label_es: "w% natural", type: "number", unit: "%" },
      { key: "rho_d", label_pt: "ρd (g/cm³)", label_es: "ρd (g/cm³)", type: "number", unit: "g/cm³", required: true },
      { key: "rho_max", label_pt: "ρmáx Proctor (g/cm³)", label_es: "ρmáx Proctor (g/cm³)", type: "number", unit: "g/cm³", required: true },
      { key: "compaction_pct", label_pt: "% Compactação", label_es: "% Compactación", type: "number", unit: "%", computed: "rho_d / rho_max * 100" },
    ],
    criteria: [
      { field: "compaction_pct", operator: ">=", value: 95, label_pt: "Compactação ≥ 95%", label_es: "Compactación ≥ 95%" },
    ],
    auto_pass_fail: true,
  },
  "plate_load": {
    fields: [
      { key: "location", label_pt: "Local / PK", label_es: "Ubicación / PK", type: "text", required: true },
      { key: "layer", label_pt: "Camada", label_es: "Capa", type: "text" },
      { key: "ev1", label_pt: "Ev1 (MPa)", label_es: "Ev1 (MPa)", type: "number", unit: "MPa", required: true },
      { key: "ev2", label_pt: "Ev2 (MPa)", label_es: "Ev2 (MPa)", type: "number", unit: "MPa", required: true },
      { key: "k", label_pt: "k (MN/m³)", label_es: "k (MN/m³)", type: "number", unit: "MN/m³" },
      { key: "ev2_ev1_ratio", label_pt: "Ev2/Ev1", label_es: "Ev2/Ev1", type: "number", computed: "ev2 / ev1" },
    ],
    criteria: [
      { field: "ev2", operator: ">=", value: 60, label_pt: "Ev2 ≥ 60 MPa", label_es: "Ev2 ≥ 60 MPa" },
      { field: "ev2_ev1_ratio", operator: "<=", value: 2.2, label_pt: "Ev2/Ev1 ≤ 2.2", label_es: "Ev2/Ev1 ≤ 2.2" },
    ],
    auto_pass_fail: true,
  },
  "concrete_control": {
    fields: [
      { key: "slump_value", label_pt: "Abaixamento (mm)", label_es: "Asentamiento (mm)", type: "number", unit: "mm", required: true },
      { key: "slump_class", label_pt: "Classe de Abaixamento", label_es: "Clase de Asentamiento", type: "select", options: ["S1","S2","S3","S4","S5"] },
      { key: "temperature", label_pt: "Temperatura (°C)", label_es: "Temperatura (°C)", type: "number", unit: "°C" },
      { key: "mix_time", label_pt: "Hora de amassadura", label_es: "Hora de amasado", type: "text" },
      { key: "location", label_pt: "Local de aplicação", label_es: "Lugar de aplicación", type: "text", required: true },
      { key: "specimen_ids", label_pt: "ID Provetes", label_es: "ID Probetas", type: "text" },
      { key: "specimen_type", label_pt: "Tipo (cúbico/cilíndrico)", label_es: "Tipo (cúbico/cilíndrico)", type: "select", options: ["cubico","cilindrico"] },
      { key: "age_days", label_pt: "Idade (dias)", label_es: "Edad (días)", type: "number", unit: "dias" },
      { key: "strength_1", label_pt: "Resistência 1 (MPa)", label_es: "Resistencia 1 (MPa)", type: "number", unit: "MPa" },
      { key: "strength_2", label_pt: "Resistência 2 (MPa)", label_es: "Resistencia 2 (MPa)", type: "number", unit: "MPa" },
      { key: "strength_3", label_pt: "Resistência 3 (MPa)", label_es: "Resistencia 3 (MPa)", type: "number", unit: "MPa" },
      { key: "strength_avg", label_pt: "Resistência Média (MPa)", label_es: "Resistencia Media (MPa)", type: "number", unit: "MPa", computed: "(strength_1 + strength_2 + strength_3) / 3" },
    ],
    criteria: [
      { field: "slump_value", operator: "range", value: 50, value_max: 210, label_pt: "Abaixamento 50–210 mm", label_es: "Asentamiento 50–210 mm" },
    ],
    auto_pass_fail: false,
  },
};
