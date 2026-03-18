/**
 * Submittal metadata serialization/deserialization.
 *
 * Since technical_office_items has no submittal-specific columns,
 * we serialize structured metadata in the `description` field
 * using a {{SUBMITTAL_META}} delimiter (same pattern as TRANSMITTAL).
 */

export const SUBMITTAL_SUBTYPES = [
  "ficha_tecnica",
  "certificado",
  "desenho",
  "metodo_trabalho",
  "plano_qualidade",
  "amostra",
  "calculo",
  "ensaio_tipo",
  "outros",
] as const;
export type SubmittalSubtype = (typeof SUBMITTAL_SUBTYPES)[number];

export const SUBMITTAL_DISCIPLINES = [
  "geral",
  "terras",
  "betao",
  "estruturas",
  "drenagem",
  "ferrovia",
  "catenaria",
  "firmes",
  "instalacoes",
  "ambiente",
  "seguranca",
  "outros",
] as const;
export type SubmittalDiscipline = (typeof SUBMITTAL_DISCIPLINES)[number];

export const APPROVAL_RESULTS = [
  "pending",
  "approved",
  "approved_as_noted",
  "rejected",
  "revise_resubmit",
] as const;
export type ApprovalResult = (typeof APPROVAL_RESULTS)[number];

export interface SubmittalMeta {
  discipline: string;
  subtype: string;
  supplier_name: string;
  subcontractor_name: string;
  spec_reference: string;
  approval_result: string;
  revision: string;
  submitted_at: string;
  response_due: string;
}

const META_DELIMITER = "{{SUBMITTAL_META}}";

const EMPTY_META: SubmittalMeta = {
  discipline: "",
  subtype: "",
  supplier_name: "",
  subcontractor_name: "",
  spec_reference: "",
  approval_result: "pending",
  revision: "",
  submitted_at: "",
  response_due: "",
};

/**
 * Parse submittal metadata from the description field.
 * Returns the user-visible description and the structured metadata.
 */
export function parseSubmittalMeta(description: string | null): {
  visibleDescription: string;
  meta: SubmittalMeta;
} {
  if (!description || !description.includes(META_DELIMITER)) {
    return { visibleDescription: description ?? "", meta: { ...EMPTY_META } };
  }

  const [userPart, metaPart] = description.split(META_DELIMITER);
  const meta: SubmittalMeta = { ...EMPTY_META };

  if (metaPart) {
    const lines = metaPart.split("\n").filter(Boolean);
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      switch (key) {
        case "DISCIPLINE": meta.discipline = val; break;
        case "SUBTYPE": meta.subtype = val; break;
        case "SUPPLIER": meta.supplier_name = val; break;
        case "SUBCONTRACTOR": meta.subcontractor_name = val; break;
        case "SPEC_REF": meta.spec_reference = val; break;
        case "APPROVAL": meta.approval_result = val; break;
        case "REVISION": meta.revision = val; break;
        case "SUBMITTED_AT": meta.submitted_at = val; break;
        case "RESPONSE_DUE": meta.response_due = val; break;
      }
    }
  }

  return { visibleDescription: (userPart ?? "").trim(), meta };
}

/**
 * Build the full description field with embedded submittal metadata.
 */
export function buildSubmittalDescription(
  visibleDescription: string,
  meta: Partial<SubmittalMeta>,
): string {
  const lines: string[] = [];
  if (meta.discipline) lines.push(`DISCIPLINE:${meta.discipline}`);
  if (meta.subtype) lines.push(`SUBTYPE:${meta.subtype}`);
  if (meta.supplier_name) lines.push(`SUPPLIER:${meta.supplier_name}`);
  if (meta.subcontractor_name) lines.push(`SUBCONTRACTOR:${meta.subcontractor_name}`);
  if (meta.spec_reference) lines.push(`SPEC_REF:${meta.spec_reference}`);
  if (meta.approval_result) lines.push(`APPROVAL:${meta.approval_result}`);
  if (meta.revision) lines.push(`REVISION:${meta.revision}`);
  if (meta.submitted_at) lines.push(`SUBMITTED_AT:${meta.submitted_at}`);
  if (meta.response_due) lines.push(`RESPONSE_DUE:${meta.response_due}`);

  if (lines.length === 0) return visibleDescription;
  return `${visibleDescription}\n${META_DELIMITER}\n${lines.join("\n")}`;
}
