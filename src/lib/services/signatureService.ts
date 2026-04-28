/**
 * signatureService — gestão de assinaturas digitais para PDFs
 *
 * Cada trabalhador (project_workers) pode ter uma imagem de assinatura
 * guardada no bucket 'signatures' do Supabase Storage.
 *
 * Fluxo:
 *  1. Upload da imagem PNG/JPG para storage (signatures/{project_id}/{worker_id}.png)
 *  2. Fetch como base64 para embeber em PDFs
 *  3. signatureBlockHtml() gera o HTML do bloco de assinatura para PDFs
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "signatures";

export interface SignatureSlot {
  slot_label: string;
  slot_order: number;
  worker_id:  string | null;
  worker_name?: string;
  worker_function?: string;
  signature_b64?: string | null; // base64 da imagem
}

// ── Upload da assinatura ──────────────────────────────────────────────────────
export async function uploadSignature(
  projectId: string,
  workerId: string,
  file: File
): Promise<string> {
  const path = `${projectId}/${workerId}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: "image/png" });
  if (error) throw error;

  // Actualizar o caminho no worker
  const { error: dbErr } = await supabase
    .from("project_workers")
    .update({
      signature_storage_path: path,
      signature_updated_at: new Date().toISOString(),
    } as any)
    .eq("id", workerId);
  if (dbErr) throw dbErr;

  return path;
}

// ── Remover assinatura ────────────────────────────────────────────────────────
export async function removeSignature(
  projectId: string,
  workerId: string
): Promise<void> {
  const path = `${projectId}/${workerId}.png`;
  await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("project_workers")
    .update({ signature_storage_path: null, signature_updated_at: null } as any)
    .eq("id", workerId);
}

// ── Buscar assinatura como base64 ─────────────────────────────────────────────
export async function fetchSignatureBase64(
  storagePath: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);
    if (error || !data) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(data);
    });
  } catch {
    return null;
  }
}

// ── Carregar slots de assinatura para um tipo de documento ────────────────────
export async function loadSignatureSlots(
  projectId: string,
  docType: string
): Promise<SignatureSlot[]> {
  const { data: configs } = await supabase
    .from("document_signature_config" as any)
    .select("slot_label, slot_order, worker_id")
    .eq("project_id", projectId)
    .eq("doc_type", docType)
    .order("slot_order");

  if (!configs || configs.length === 0) return [];

  // Buscar dados dos workers e assinaturas em paralelo
  const workerIds = (configs as any[])
    .map((c: any) => c.worker_id)
    .filter(Boolean);

  const workers = workerIds.length > 0
    ? ((await supabase
        .from("project_workers")
        .select("id, name, org_function, role_function, signature_storage_path")
        .in("id", workerIds)).data ?? []) as any[]
    : [];

  const slots: SignatureSlot[] = await Promise.all(
    (configs as any[]).map(async (cfg: any) => {
      const worker = workers.find((w: any) => w.id === cfg.worker_id);
      const sig_b64 = worker?.signature_storage_path
        ? await fetchSignatureBase64(worker.signature_storage_path)
        : null;
      return {
        slot_label:      cfg.slot_label,
        slot_order:      cfg.slot_order,
        worker_id:       cfg.worker_id,
        worker_name:     worker?.name,
        worker_function: worker?.org_function || worker?.role_function,
        signature_b64:   sig_b64,
      };
    })
  );
  return slots;
}

// ── HTML do bloco de assinaturas para PDFs ────────────────────────────────────
export function signatureBlockHtml(slots: SignatureSlot[], date?: string): string {
  if (!slots || slots.length === 0) return "";
  const dateStr = date ?? new Date().toLocaleDateString("pt-PT");

  const slotHtml = slots.map(slot => `
    <div style="flex:1; min-width:140px; text-align:center; padding:0 12px;">
      <div style="
        border-bottom: 1.5px solid #1e3a5f;
        min-height: 52px;
        margin-bottom: 4px;
        display:flex; align-items:flex-end; justify-content:center;
      ">
        ${slot.signature_b64
          ? `<img src="${slot.signature_b64}" style="max-height:48px; max-width:120px; object-fit:contain;" />`
          : `<span style="color:#ccc; font-size:9px;">Assinatura</span>`}
      </div>
      <div style="font-size:8.5px; font-weight:600; color:#1e3a5f; margin-bottom:1px;">
        ${slot.worker_name ?? slot.slot_label}
      </div>
      <div style="font-size:7.5px; color:#6b7280;">
        ${slot.worker_function ?? slot.slot_label}
      </div>
      <div style="font-size:7px; color:#9ca3af; margin-top:1px;">
        Data: ${dateStr}
      </div>
    </div>
  `).join("");

  return `
    <div style="
      margin-top: 28px;
      border-top: 2px solid #1e3a5f;
      padding-top: 14px;
    ">
      <div style="
        font-size: 8px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
        margin-bottom: 12px;
      ">Aprovação e Assinaturas</div>
      <div style="display:flex; gap:0; flex-wrap:wrap;">
        ${slotHtml}
      </div>
    </div>
  `;
}
