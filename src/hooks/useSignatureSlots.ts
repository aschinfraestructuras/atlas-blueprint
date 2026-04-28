/**
 * Hook reutilizável para carregar slots de assinatura para qualquer tipo de documento.
 * Usado em todas as páginas que geram PDFs com assinaturas.
 */
import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { loadSignatureSlots, type SignatureSlot } from "@/lib/services/signatureService";

export function useSignatureSlots(docType: string) {
  const { activeProject } = useProject();
  const [slots, setSlots] = useState<SignatureSlot[]>([]);

  useEffect(() => {
    if (!activeProject) return;
    loadSignatureSlots(activeProject.id, docType).then(setSlots).catch(() => setSlots([]));
  }, [activeProject, docType]);

  return slots;
}
