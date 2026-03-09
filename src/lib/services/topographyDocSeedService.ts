/**
 * Seed service for pre-populating Topography documents (Vol. 00 — Cartografia / Topografia)
 * Based on the PF17A project document index.
 */
import { documentService } from "./documentService";
import { supabase } from "@/integrations/supabase/client";

interface SeedDoc {
  title: string;
  doc_type: string;
  revision: string;
}

const TOPOGRAPHY_SEED_DOCS: SeedDoc[] = [
  // Peças Escritas
  { title: "Memória Descritiva e Justificativa — Cartografia / Topografia", doc_type: "mdj", revision: "0" },
  { title: "Índice de Peças Escritas e Desenhadas — Vol.00 Tomo 0.2", doc_type: "index", revision: "1" },
  { title: "Lista de Peças Desenhadas — Vol.00 Tomo 0.2", doc_type: "index", revision: "1" },
  // Anexos MDJ
  { title: "Anexo I — Apoio Topográfico (MDJ e Fichas)", doc_type: "mdj", revision: "0" },
  { title: "Anexo II — Fichas AMVs", doc_type: "mdj", revision: "0" },
  { title: "Anexo III — Caracterização de Passagens Hidráulicas", doc_type: "mdj", revision: "0" },
  { title: "Anexo IV — Separador", doc_type: "mdj", revision: "0" },
  // Peças Desenhadas — Cartografia
  { title: "Cartografia (folha 1 de 6)", doc_type: "drawing", revision: "1" },
  { title: "Cartografia (folha 2 de 6)", doc_type: "drawing", revision: "1" },
  { title: "Cartografia (folha 3 de 6)", doc_type: "drawing", revision: "1" },
  { title: "Cartografia (folha 4 de 6)", doc_type: "drawing", revision: "1" },
  { title: "Cartografia (folha 5 de 6)", doc_type: "drawing", revision: "1" },
  { title: "Cartografia (folha 6 de 6)", doc_type: "drawing", revision: "1" },
  // Perfis Transversais
  { title: "Perfis Transversais 1 — PT1 pk 29+800 a PT6 pk 29+925", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT7 pk 29+950 a PT12 pk 30+075", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT13 pk 30+100 a PT22 pk 30+323", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT23 pk 30+346 a PT33 pk 30+598", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT34 pk 30+624 a PT45 pk 30+899", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT46 pk 30+927 a PT57 pk 31+203", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT58 pk 31+226 a PT68 pk 31+476", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 1 — PT69 pk 31+502 a PT80 pk 31+803", doc_type: "drawing", revision: "0" },
  // Perfis Transversais 2
  { title: "Perfis Transversais 2 — PT81 pk 31+827 a PT88 pk 32+001", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 2 — PT89 pk 32+022 a PT102 pk 32+348", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 2 — PT103 pk 32+373 a PT113 pk 32+623", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 2 — PT114 pk 32+648 a PT124 pk 32+898", doc_type: "drawing", revision: "0" },
  { title: "Perfis Transversais 2 — PT125 pk 32+948 a PT131 pk 33+098", doc_type: "drawing", revision: "0" },
  // Perfil Longitudinal
  { title: "Perfil Longitudinal — pk 29+800 a pk 33+100", doc_type: "drawing", revision: "0" },
  // Poligonal de Apoio
  { title: "Poligonal de Apoio Topográfico — Planta", doc_type: "drawing", revision: "0" },
];

export async function seedTopographyDocuments(projectId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";
  let created = 0;
  for (const doc of TOPOGRAPHY_SEED_DOCS) {
    try {
      await documentService.create({
        project_id: projectId,
        title: doc.title,
        doc_type: doc.doc_type,
        disciplina: "topografia",
        revision: doc.revision,
        status: "draft",
      });
      created++;
    } catch (e) {
      // Skip duplicates or errors, continue with rest
      console.warn(`Skipped doc "${doc.title}":`, e);
    }
  }
  return created;
}

export const TOPOGRAPHY_SEED_COUNT = TOPOGRAPHY_SEED_DOCS.length;
