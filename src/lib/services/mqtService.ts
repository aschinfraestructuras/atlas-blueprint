/**
 * mqtService — Mapa de Quantidades e Trabalhos
 *
 * Importação e parsing de ficheiros XML do MQT contratual.
 * - Extrai estrutura hierárquica via CodeRubrica (ex: F-08.03.06.99.01.02.04.04)
 * - Distingue agrupadores de itens folha
 * - Extrai PKs da designação via regex (ex: "km 32+653 a km 32+825")
 * - Determina família a partir do prefixo nível 1 (F-01, F-02, ...)
 *
 * Apenas administradores podem importar/atualizar (enforced por RLS).
 */

import { supabase } from "@/integrations/supabase/client";

export interface MqtItem {
  id: string;
  project_id: string;
  code_rubrica: string;
  parent_code: string | null;
  nivel: number;
  familia: string | null;
  is_leaf: boolean;
  designacao: string;
  unidade: string | null;
  quantidade: number | null;
  prazo_garantia: string | null;
  preco_unitario: number | null;
  preco_total: number | null;
  pk_inicio_mqt: string | null;
  pk_fim_mqt: string | null;
  mqt_version: string | null;
  imported_at: string;
  imported_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MqtSummaryRow {
  project_id: string;
  familia: string | null;
  total_itens_folha: number;
  itens_com_pk: number;
  volume_m3: number | null;
  area_m2: number | null;
  comprimento_m: number | null;
  unidades: number | null;
  peso_kg: number | null;
  valor_total_eur: number | null;
}

export interface ParsedMqtItem {
  code_rubrica: string;
  parent_code: string | null;
  nivel: number;
  familia: string | null;
  is_leaf: boolean;
  designacao: string;
  unidade: string | null;
  quantidade: number | null;
  prazo_garantia: string | null;
  preco_unitario: number | null;
  preco_total: number | null;
  pk_inicio_mqt: string | null;
  pk_fim_mqt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcula o nível hierárquico a partir do código.
 * Ex: F-01 → 1, F-01.02 → 2, F-08.03.06.99.01.02.04.04 → 8
 */
function calcNivel(code: string): number {
  // Remove o prefixo "F-" e conta os segmentos separados por "."
  const stripped = code.replace(/^F-/i, "");
  return stripped.split(".").length;
}

/**
 * Determina a família (prefixo nível 1) a partir do código.
 * Ex: F-08.03.06 → "F-08"
 */
function calcFamilia(code: string): string | null {
  const m = code.match(/^(F-\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Calcula o código do pai removendo o último segmento.
 * Ex: F-08.03.06 → F-08.03; F-08 → null
 */
function calcParentCode(code: string): string | null {
  const stripped = code.replace(/^F-/i, "");
  const segments = stripped.split(".");
  if (segments.length <= 1) return null;
  segments.pop();
  return "F-" + segments.join(".");
}

/**
 * Extrai PKs da designação.
 * Suporta formatos como:
 *   "km 32+653 a km 32+825"
 *   "PK 32+653 a 32+825"
 *   "do km 0+000 ao km 1+250"
 */
function extractPKs(designacao: string): { pk_inicio: string | null; pk_fim: string | null } {
  if (!designacao) return { pk_inicio: null, pk_fim: null };
  // Padrão: dois PKs (X+YYY) separados por "a", "ao", "até", "-"
  const re = /(\d{1,4}\+\d{3})\s*(?:a|ao|at[ée]|-|–|—|to)\s*(?:km\s*)?(\d{1,4}\+\d{3})/i;
  const m = designacao.match(re);
  if (m) return { pk_inicio: m[1], pk_fim: m[2] };
  // Padrão: um único PK
  const single = designacao.match(/(\d{1,4}\+\d{3})/);
  if (single) return { pk_inicio: single[1], pk_fim: null };
  return { pk_inicio: null, pk_fim: null };
}

/**
 * Converte string para número aceitando vírgula ou ponto decimal.
 */
function toNumber(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ─── XML Parser ──────────────────────────────────────────────────────────────

/**
 * Extrai o texto de um elemento filho por nome (case-insensitive).
 */
function getChildText(el: Element, ...names: string[]): string | null {
  for (const name of names) {
    const child = Array.from(el.children).find(
      (c) => c.tagName.toLowerCase() === name.toLowerCase()
    );
    if (child && child.textContent != null) {
      const t = child.textContent.trim();
      if (t !== "") return t;
    }
  }
  return null;
}

/**
 * Faz o parsing do ficheiro XML do MQT e devolve uma lista de itens.
 *
 * O parser é tolerante a diferentes nomes de tags (CodeRubrica/Codigo,
 * Designacao/Descricao, Quantidade/Qtd, Unidade/Un, etc.).
 */
export function parseMqtXml(xmlText: string): ParsedMqtItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Ficheiro XML inválido. Verifique a estrutura.");
  }

  // Procura todos os elementos que contenham um CodeRubrica (ou variantes)
  const allElements = doc.getElementsByTagName("*");
  const items: ParsedMqtItem[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const code = getChildText(el, "CodeRubrica", "Codigo", "Code", "Rubrica");
    if (!code) continue;

    // Evitar duplicados do mesmo código
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const designacao =
      getChildText(el, "Designacao", "Descricao", "Designation", "Description") ?? code;
    const unidade = getChildText(el, "Unidade", "Un", "Unit");
    const quantidadeStr = getChildText(el, "Quantidade", "Qtd", "Quantity");
    const prazoGarantia = getChildText(el, "PrazoGarantia", "Garantia", "Warranty");
    const precoUnitarioStr = getChildText(el, "PrecoUnitario", "PrecoUnit", "UnitPrice", "Preco");
    const precoTotalStr = getChildText(el, "PrecoTotal", "Total", "TotalPrice");

    const quantidade = toNumber(quantidadeStr);
    const preco_unitario = toNumber(precoUnitarioStr);
    const preco_total = toNumber(precoTotalStr);

    const is_leaf = quantidade !== null && unidade !== null;
    const { pk_inicio, pk_fim } = extractPKs(designacao);

    items.push({
      code_rubrica: code,
      parent_code: calcParentCode(code),
      nivel: calcNivel(code),
      familia: calcFamilia(code),
      is_leaf,
      designacao,
      unidade,
      quantidade,
      prazo_garantia: prazoGarantia,
      preco_unitario,
      preco_total,
      pk_inicio_mqt: pk_inicio,
      pk_fim_mqt: pk_fim,
    });
  }

  if (items.length === 0) {
    throw new Error(
      "Nenhum item MQT encontrado no XML. Verifique se o ficheiro contém elementos <CodeRubrica>."
    );
  }

  return items;
}

// ─── Database ────────────────────────────────────────────────────────────────

/**
 * Importa itens MQT para um projeto. Substitui a versão anterior do mesmo `mqt_version`.
 */
export async function importMqtItems(
  projectId: string,
  items: ParsedMqtItem[],
  mqtVersion: string,
  userId: string | null
): Promise<{ inserted: number }> {
  // Apaga importação anterior da mesma versão (se existir)
  await supabase
    .from("mqt_items")
    .delete()
    .eq("project_id", projectId)
    .eq("mqt_version", mqtVersion);

  const rows = items.map((it) => ({
    ...it,
    project_id: projectId,
    mqt_version: mqtVersion,
    imported_by: userId,
  }));

  // Insere em lotes de 500
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("mqt_items").insert(slice);
    if (error) throw error;
    inserted += slice.length;
  }

  return { inserted };
}

/**
 * Lista itens MQT de um projeto via vista segura (preços mascarados para não-admin).
 */
export async function listMqtItems(projectId: string): Promise<MqtItem[]> {
  const { data, error } = await supabase
    .from("vw_mqt_items_safe" as never)
    .select("*")
    .eq("project_id", projectId)
    .order("code_rubrica", { ascending: true })
    .limit(5000);

  if (error) throw error;
  return (data as unknown as MqtItem[]) ?? [];
}

/**
 * Devolve as agregações por família.
 */
export async function getMqtSummary(projectId: string): Promise<MqtSummaryRow[]> {
  const { data, error } = await supabase
    .from("vw_mqt_summary" as never)
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  return (data as unknown as MqtSummaryRow[]) ?? [];
}

/**
 * Apaga todos os itens MQT de um projeto. Apenas admin via RLS.
 */
export async function clearMqtItems(projectId: string): Promise<void> {
  const { error } = await supabase
    .from("mqt_items")
    .delete()
    .eq("project_id", projectId);
  if (error) throw error;
}
