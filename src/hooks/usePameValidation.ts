/**
 * usePameValidation — validação cruzada PAME ↔ Betonagem
 *
 * Dado um fornecedor e uma classe de betão, verifica se:
 *  1. Existe um material aprovado na PAME com essa classe
 *  2. O fornecedor está aprovado para esse material
 *  3. Há lotes disponíveis e aprovados
 *
 * Usado na ConcretePage ao criar/editar uma amassadura.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";

export interface PameValidationResult {
  loading: boolean;
  materialApproved: boolean;       // material com essa classe está na PAME
  supplierApproved: boolean;       // fornecedor aprovado para esse material
  lotAvailable: boolean;           // existe lote aprovado
  materialName: string | null;     // nome do material PAME correspondente
  materialId: string | null;       // id do material PAME
  lotId: string | null;            // id do lote aprovado (para auto-preencher)
  lotRef: string | null;           // referência do lote
  warnings: string[];              // alertas não bloqueantes
  errors: string[];                // erros bloqueantes
}

const EMPTY: PameValidationResult = {
  loading: false,
  materialApproved: false,
  supplierApproved: false,
  lotAvailable: false,
  materialName: null,
  materialId: null,
  lotId: null,
  lotRef: null,
  warnings: [],
  errors: [],
};

/**
 * Normaliza a classe de betão para comparação:
 * "C30/37", "c30/37 xc3", "C30/37XC3" → "C30/37"
 */
function normalizeClass(cls: string): string {
  return cls.toUpperCase().replace(/\s+/g, "").split("XC")[0].split("XF")[0].trim();
}

export function usePameValidation(
  concreteClass: string | null,
  supplierId: string | null
): PameValidationResult {
  const { activeProject } = useProject();
  const [result, setResult] = useState<PameValidationResult>(EMPTY);

  useEffect(() => {
    if (!activeProject || !concreteClass) {
      setResult(EMPTY);
      return;
    }

    const run = async () => {
      setResult(prev => ({ ...prev, loading: true, warnings: [], errors: [] }));

      const warnings: string[] = [];
      const errors: string[] = [];
      const normalClass = normalizeClass(concreteClass);

      // 1. Procurar material na PAME com categoria betão e nome/ref que inclua a classe
      const { data: materials } = await supabase
        .from("materials")
        .select("id, name, status, supplier_id")
        .eq("project_id", activeProject.id)
        .eq("category", "betao")
        .neq("status", "rejected");

      const matchingMaterials = (materials ?? []).filter(m => {
        const normalName = normalizeClass(m.name ?? "");
        return normalName.includes(normalClass) || normalClass.includes(normalName.replace("C",""));
      });

      if (matchingMaterials.length === 0) {
        errors.push(`A classe ${concreteClass} não está aprovada na PAME. Aprova o material antes de registar betonagens.`);
        setResult({ ...EMPTY, loading: false, errors });
        return;
      }

      const material = matchingMaterials[0];
      const materialApproved = material.status === "approved";

      if (!materialApproved) {
        warnings.push(`O material ${material.name} está em estado "${material.status}" — ainda não totalmente aprovado.`);
      }

      // 2. Verificar se o fornecedor está associado ao material
      let supplierApproved = false;
      if (supplierId) {
        // Verificar na tabela materials (fornecedor do material)
        const supplierMatchesMaterial = material.supplier_id === supplierId;

        // Verificar também em material_lots (pode ter lotes de fornecedores diferentes)
        const { data: lots } = await supabase
          .from("material_lots")
          .select("id, lot_number, status, supplier_id")
          .eq("material_id", material.id)
          .neq("status", "rejected");

        const supplierLots = (lots ?? []).filter(l => l.supplier_id === supplierId || supplierMatchesMaterial);
        supplierApproved = supplierMatchesMaterial || supplierLots.length > 0;

        if (!supplierApproved) {
          errors.push(`Este fornecedor não está aprovado para ${material.name}. Verifica a PAME.`);
        }

        // 3. Verificar lotes aprovados
        const approvedLots = (lots ?? []).filter(l =>
          (l.supplier_id === supplierId || supplierMatchesMaterial) && l.status === "approved"
        );

        const lotAvailable = approvedLots.length > 0;
        if (!lotAvailable && supplierApproved) {
          warnings.push(`Não há lotes aprovados para este fornecedor. Considera criar um lote em Materiais.`);
        }

        const bestLot = approvedLots[0] ?? null;

        setResult({
          loading: false,
          materialApproved,
          supplierApproved,
          lotAvailable,
          materialName: material.name,
          materialId: material.id,
          lotId: bestLot?.id ?? null,
          lotRef: bestLot?.lot_number ?? null,
          warnings,
          errors,
        });
      } else {
        // Sem fornecedor seleccionado — só mostrar info do material
        setResult({
          loading: false,
          materialApproved,
          supplierApproved: false,
          lotAvailable: false,
          materialName: material.name,
          materialId: material.id,
          lotId: null,
          lotRef: null,
          warnings: materialApproved ? [] : warnings,
          errors: [],
        });
      }
    };

    run();
  }, [activeProject, concreteClass, supplierId]);

  return result;
}
