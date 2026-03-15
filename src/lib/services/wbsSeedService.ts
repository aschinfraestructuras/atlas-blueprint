/**
 * WBS Seed Service — PF17A Linha do Sul
 * Populates the full WBS structure for the PF17A railway project.
 */
import { planningService, type WbsInput } from "./planningService";

interface WbsSeedNode {
  wbs_code: string;
  description: string;
  children?: WbsSeedNode[];
}

const WBS_PF17A: WbsSeedNode[] = [
  {
    wbs_code: "0", description: "PF17A · Linha do Sul", children: [
      {
        wbs_code: "1", description: "Trabalhos Preparatórios", children: [
          { wbs_code: "1.1", description: "Instalação de Estaleiro" },
          { wbs_code: "1.2", description: "Topografia de Base e Implantação" },
          { wbs_code: "1.3", description: "Demolições e Desmatação" },
        ],
      },
      {
        wbs_code: "2", description: "Terraplenagem e Geotecnia", children: [
          { wbs_code: "2.1", description: "Escavação Geral" },
          { wbs_code: "2.2", description: "Aterros e Compactação" },
          { wbs_code: "2.3", description: "Tratamento de Fundações" },
          { wbs_code: "2.4", description: "Capping Layer e Sub-base" },
        ],
      },
      {
        wbs_code: "3", description: "Drenagem", children: [
          { wbs_code: "3.1", description: "Valas e Colectores" },
          { wbs_code: "3.2", description: "Passagens Hidráulicas (PH)" },
          { wbs_code: "3.3", description: "Valetas e Drenos Longitudinais" },
        ],
      },
      {
        wbs_code: "4", description: "Obras de Arte", children: [
          { wbs_code: "4.1", description: "PSR Cachofarra DC01 — Fundações" },
          { wbs_code: "4.2", description: "PSR Cachofarra DC01 — Elevação" },
          { wbs_code: "4.3", description: "PSR Cachofarra DC01 — Acabamentos" },
        ],
      },
      {
        wbs_code: "5", description: "Via-Férrea", children: [
          { wbs_code: "5.1", description: "Balastro e Preparação de Plataforma" },
          { wbs_code: "5.2", description: "Assentamento de Carril (60E1)" },
          { wbs_code: "5.3", description: "Soldadura e AMV" },
          { wbs_code: "5.4", description: "Geometria e Nivelamento" },
        ],
      },
      {
        wbs_code: "6", description: "Catenária e OFE", children: [
          { wbs_code: "6.1", description: "Fundações e Postes" },
          { wbs_code: "6.2", description: "Catenária 1×25 kV" },
          { wbs_code: "6.3", description: "Subestação e Seccionamentos" },
        ],
      },
      {
        wbs_code: "7", description: "Retorno de Corrente e Terra", children: [
          { wbs_code: "7.1", description: "RCT — Cabos de Retorno" },
          { wbs_code: "7.2", description: "TP — Terra de Protecção" },
        ],
      },
      {
        wbs_code: "8", description: "Sinalização e Telecomunicações", children: [
          { wbs_code: "8.1", description: "Sinalização Ferroviária" },
          { wbs_code: "8.2", description: "Supressão PN PK 31+670" },
          { wbs_code: "8.3", description: "GSM-R e Telecomunicações" },
        ],
      },
      {
        wbs_code: "9", description: "Construção Civil e Edificações", children: [
          { wbs_code: "9.1", description: "Salas Técnicas e Edificações" },
          { wbs_code: "9.2", description: "Vedações e Muros" },
          { wbs_code: "9.3", description: "Reposição de Serviços e Acessos" },
        ],
      },
      {
        wbs_code: "10", description: "Caminho de Cabos e BT", children: [
          { wbs_code: "10.1", description: "Caminho de Cabos Ferroviário" },
          { wbs_code: "10.2", description: "Instalações de Baixa Tensão" },
          { wbs_code: "10.3", description: "Fibra Óptica e OTDR" },
        ],
      },
      {
        wbs_code: "11", description: "Acabamentos e Ensaios Finais", children: [
          { wbs_code: "11.1", description: "Limpeza e Inspecção Final" },
          { wbs_code: "11.2", description: "Ensaios de Interoperabilidade" },
          { wbs_code: "11.3", description: "Levantamento Topográfico Final" },
        ],
      },
    ],
  },
];

async function insertNodes(
  nodes: WbsSeedNode[],
  projectId: string,
  createdBy: string,
  parentId: string | null,
): Promise<number> {
  let count = 0;
  for (const node of nodes) {
    const input: WbsInput = {
      project_id: projectId,
      parent_id: parentId,
      wbs_code: node.wbs_code,
      description: node.description,
      created_by: createdBy,
    };
    const created = await planningService.createWbs(input);
    count++;
    if (node.children && node.children.length > 0) {
      count += await insertNodes(node.children, projectId, createdBy, created.id);
    }
  }
  return count;
}

export async function seedWbsPF17A(projectId: string, createdBy: string): Promise<number> {
  return insertNodes(WBS_PF17A, projectId, createdBy, null);
}
