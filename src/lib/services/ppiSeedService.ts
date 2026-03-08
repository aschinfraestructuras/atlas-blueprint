/**
 * ppiSeedService — All 11 PPI templates for PF17A (Linha do Sul IP).
 *
 * Each template mirrors the real contractual PPI documents:
 *   PPI-01 Terraplenagem, PPI-02 Drenagem, PPI-03 Geometria Ferroviária,
 *   PPI-04 Estruturas (PSR Cachofarra), PPI-05 Catenária e OFE,
 *   PPI-06 Reforço da Catenária + TP, PPI-07 Sinalização e Telecomunicações,
 *   PPI-08 Obras de Arte / Muros, PPI-09 Edificações,
 *   PPI-10 Passagens de Nível, PPI-11 Betão Estrutural.
 *
 * IPT matrix: E = Empreiteiro, F = Fiscalização, IP = Dono de Obra
 *   hp = Hold Point, wp = Witness Point, rp = Review Point, na = N/A
 *
 * Idempotent: skips templates whose code already exists.
 */

import { supabase } from "@/integrations/supabase/client";
import { ppiService, type PpiTemplateItemInput } from "./ppiService";
import type { PpiDisciplina } from "./ppiService";

interface SeedItem {
  item_no: number;
  check_code: string;
  label: string;
  method?: string;
  acceptance_criteria?: string;
  ipt_e?: string;
  ipt_f?: string;
  ipt_ip?: string;
  evidence_required?: boolean;
  phase_name?: string;
  phase_no?: number;
  doc_record?: string;
  test_pe_code?: string;
}

interface SeedTemplate {
  code: string;
  disciplina: PpiDisciplina;
  title: string;
  description: string;
  items: SeedItem[];
}

// ════════════════════════════════════════════════════════════════════════════
// PPI-01 — Terraplenagem
// ════════════════════════════════════════════════════════════════════════════
const PPI_01: SeedTemplate = {
  code: "PPI-PF17A-01",
  disciplina: "terras",
  title: "Terraplenagem",
  description: "Controlo de atividades de escavação, aterro, compactação e acabamentos de terraplenagem.",
  items: [
    { item_no: 1, check_code: "01.01", label: "Implantação topográfica da plataforma", method: "Levantamento topográfico", acceptance_criteria: "Conforme projeto; tolerância ±50 mm", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Preparação", phase_no: 1, doc_record: "Relatório topográfico" },
    { item_no: 2, check_code: "01.02", label: "Desmatação e decapagem da terra vegetal", method: "Visual + medição espessura", acceptance_criteria: "Remoção total conforme PE; espessura mín. 0,30 m", ipt_e: "rp", ipt_f: "rp", ipt_ip: "na", phase_name: "Preparação", phase_no: 1 },
    { item_no: 3, check_code: "01.03", label: "Caracterização dos solos de escavação (classificação)", method: "Ensaio laboratorial (LNEC E-196)", acceptance_criteria: "Classificação conforme AASHTO/USCS; aptidão para reutilização", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Escavação", phase_no: 2, test_pe_code: "PE-PF17A-001" },
    { item_no: 4, check_code: "01.04", label: "Escavação a céu aberto — controlo de cotas e taludes", method: "Topografia + visual", acceptance_criteria: "Cotas conforme projeto; inclinação taludes ±2°", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Escavação", phase_no: 2 },
    { item_no: 5, check_code: "01.05", label: "Preparação do leito de fundação (escarificação e recompactação)", method: "Ensaio Proctor/CBR", acceptance_criteria: "Gc ≥ 95% PM; CBR conforme PE", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Fundação", phase_no: 3, test_pe_code: "PE-PF17A-002" },
    { item_no: 6, check_code: "01.06", label: "Colocação e espalhamento de aterro (camadas ≤ 0,30 m)", method: "Visual + medição espessura camada", acceptance_criteria: "Espessura camada solta ≤ 0,30 m; material aprovado", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Aterro", phase_no: 4 },
    { item_no: 7, check_code: "01.07", label: "Compactação de aterro — grau de compactação", method: "Ensaio Proctor in situ (gamadensímetro)", acceptance_criteria: "Gc ≥ 95% PM (corpo) / ≥ 97% PM (leito)", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Aterro", phase_no: 4, test_pe_code: "PE-PF17A-003" },
    { item_no: 8, check_code: "01.08", label: "Controlo de teor em água ótimo", method: "Estufa / speedy moisture", acceptance_criteria: "w = wopt ± 2%", ipt_e: "rp", ipt_f: "rp", ipt_ip: "na", phase_name: "Aterro", phase_no: 4 },
    { item_no: 9, check_code: "01.09", label: "Sub-balastro — espessura e compactação", method: "Topografia + ensaio de carga com placa", acceptance_criteria: "Espessura conforme PE; Ev2 ≥ 80 MPa; Ev2/Ev1 ≤ 2.2", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Sub-balastro", phase_no: 5, test_pe_code: "PE-PF17A-004" },
    { item_no: 10, check_code: "01.10", label: "Acabamento de taludes (regularização e proteção)", method: "Visual + topografia", acceptance_criteria: "Perfil conforme projeto; sem erosão; proteção vegetal aplicada", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Acabamentos", phase_no: 6 },
    { item_no: 11, check_code: "01.11", label: "Geossintéticos — aplicação e sobreposição", method: "Visual + medição sobreposição", acceptance_criteria: "Sobreposição mín. 0,50 m; sem rasgos ou perfurações", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Aterro", phase_no: 4, doc_record: "Ficha de aplicação" },
    { item_no: 12, check_code: "01.12", label: "Receção de materiais de aterro (fornecimento externo)", method: "Boletim de ensaio + visual", acceptance_criteria: "Material conforme PAME; documentação CE", ipt_e: "hp", ipt_f: "rp", ipt_ip: "na", evidence_required: true, phase_name: "Aterro", phase_no: 4 },
    { item_no: 13, check_code: "01.13", label: "Controlo topográfico final da plataforma (as-built)", method: "Levantamento topográfico", acceptance_criteria: "Tela final aprovada; tolerância ±30 mm", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Acabamentos", phase_no: 6, doc_record: "Tela final" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-02 — Drenagem
// ════════════════════════════════════════════════════════════════════════════
const PPI_02: SeedTemplate = {
  code: "PPI-PF17A-02",
  disciplina: "drenagem",
  title: "Drenagem",
  description: "Controlo de drenagem longitudinal, transversal e superficial.",
  items: [
    { item_no: 1, check_code: "02.01", label: "Implantação topográfica das valas e traçado", method: "Topografia", acceptance_criteria: "Conforme projeto; tolerância ±50 mm", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Implantação", phase_no: 1 },
    { item_no: 2, check_code: "02.02", label: "Escavação das valas — cotas e dimensões", method: "Topografia + medição", acceptance_criteria: "Largura e profundidade conforme PE; fundo nivelado", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Escavação", phase_no: 2 },
    { item_no: 3, check_code: "02.03", label: "Preparação do leito de assentamento (granulometria e espessura)", method: "Visual + medição", acceptance_criteria: "Espessura mín. 100 mm; material britado conforme PE", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", phase_name: "Tubagem", phase_no: 3 },
    { item_no: 4, check_code: "02.04", label: "Assentamento de condutas — inclinação e alinhamento", method: "Nível laser / nivelamento", acceptance_criteria: "Inclinação mín. 0,5%; sem desalinhamento > 5 mm", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Tubagem", phase_no: 3 },
    { item_no: 5, check_code: "02.05", label: "Juntas e ligações (vedação e continuidade)", method: "Visual", acceptance_criteria: "Juntas encaixadas; vedação íntegra; sem folgas", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Tubagem", phase_no: 3 },
    { item_no: 6, check_code: "02.06", label: "Caixas de visita — cotas, tampas e ligações", method: "Topografia + visual", acceptance_criteria: "Cota tampa conforme rasante; ligações estanques", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Caixas", phase_no: 4 },
    { item_no: 7, check_code: "02.07", label: "Aterro envolvente e compactação lateral", method: "Ensaio Proctor", acceptance_criteria: "Gc ≥ 95% PM; compactação por camadas ≤ 0,20 m", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Aterro", phase_no: 5, test_pe_code: "PE-PF17A-005" },
    { item_no: 8, check_code: "02.08", label: "Ensaio de estanquidade (condutas)", method: "Ensaio de pressão EN 1610", acceptance_criteria: "Sem perda de pressão > 0,5 kPa em 15 min", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Ensaios", phase_no: 6, test_pe_code: "PE-PF17A-006" },
    { item_no: 9, check_code: "02.09", label: "Valetas — revestimento e secção", method: "Visual + medição", acceptance_criteria: "Secção conforme projeto; revestimento sem fissuras", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Valetas", phase_no: 7 },
    { item_no: 10, check_code: "02.10", label: "Órgãos de descarga e dissipação de energia", method: "Visual + topografia", acceptance_criteria: "Conforme projeto; sem erosão a jusante", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Acabamentos", phase_no: 8 },
    { item_no: 11, check_code: "02.11", label: "Tela final (as-built) — rede de drenagem", method: "Levantamento topográfico", acceptance_criteria: "Tela aprovada e assinada", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Acabamentos", phase_no: 8, doc_record: "Tela final" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-03 — Geometria Ferroviária (Via)
// ════════════════════════════════════════════════════════════════════════════
const PPI_03: SeedTemplate = {
  code: "PPI-PF17A-03",
  disciplina: "ferrovia",
  title: "Geometria Ferroviária (Via)",
  description: "Controlo do balastro, assentamento de via e geometria de alinhamento.",
  items: [
    { item_no: 1, check_code: "03.01", label: "Receção e aprovação do balastro", method: "Ensaio granulométrico + Los Angeles", acceptance_criteria: "Conforme EN 13450; LA ≤ 20%; partículas finas < 1%", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Balastro", phase_no: 1, test_pe_code: "PE-PF17A-007" },
    { item_no: 2, check_code: "03.02", label: "Espalhamento da 1ª camada de balastro (espessura)", method: "Topografia + medição", acceptance_criteria: "Espessura mín. 150 mm sob travessa", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Balastro", phase_no: 1 },
    { item_no: 3, check_code: "03.03", label: "Descarga e posicionamento dos carris (alinhamento provisório)", method: "Visual", acceptance_criteria: "Carris sem defeitos visíveis; certificados CE verificados", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Via", phase_no: 2 },
    { item_no: 4, check_code: "03.04", label: "Assentamento de travessas (espaçamento e tipo)", method: "Medição", acceptance_criteria: "Espaçamento conforme projeto (600 mm typ.); tipo conforme zona", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Via", phase_no: 2 },
    { item_no: 5, check_code: "03.05", label: "Fixações e palmilhas — tipo e aperto", method: "Visual + torquímetro", acceptance_criteria: "Fixações Vossloh/Pandrol conforme especificação; torque aplicado", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Via", phase_no: 2 },
    { item_no: 6, check_code: "03.06", label: "Soldaduras de carris (aluminotérmica)", method: "Ensaio visual + END (ultrassons)", acceptance_criteria: "Sem defeitos internos; rebarbas < 0,5 mm; ensaio US OK", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Soldaduras", phase_no: 3, test_pe_code: "PE-PF17A-008" },
    { item_no: 7, check_code: "03.07", label: "Ataque mecânico pesado (1ª passagem atacadeira)", method: "Registo de máquina", acceptance_criteria: "Parâmetros de ataque conforme procedimento; registo automático", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Geometria", phase_no: 4 },
    { item_no: 8, check_code: "03.08", label: "Nivelamento e alinhamento — controlo geométrico intermédio", method: "Veículo de medição / cordel", acceptance_criteria: "Tolerâncias classe QN1 (EN 13848-5)", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Geometria", phase_no: 4 },
    { item_no: 9, check_code: "03.09", label: "Ataque mecânico final (2ª/3ª passagem)", method: "Registo de máquina", acceptance_criteria: "Conformidade QN1; registo automático arquivado", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Geometria", phase_no: 4 },
    { item_no: 10, check_code: "03.10", label: "Controlo geométrico final — veículo de medição", method: "Veículo EM120/EM130", acceptance_criteria: "Todos os parâmetros QN1; sem defeitos QN2 isolados", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Geometria", phase_no: 4, doc_record: "Relatório EM" },
    { item_no: 11, check_code: "03.11", label: "Libertação de tensões em BLS (barra longa soldada)", method: "Procedimento de libertação conforme IT", acceptance_criteria: "Temperatura de referência: 25 ± 3 °C; marcações realizadas", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "BLS", phase_no: 5 },
    { item_no: 12, check_code: "03.12", label: "Aparelhos de mudança de via (AMV) — posicionamento e regulação", method: "Medição + ensaio funcional", acceptance_criteria: "Folga agulha ≤ 1 mm; concordância de raio conforme projeto", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "AMV", phase_no: 6 },
    { item_no: 13, check_code: "03.13", label: "Espaçamento e bitola — medição final", method: "Bitolímetro calibrado", acceptance_criteria: "1668 mm ± 2 mm (via larga) ou 1435 mm ± 2 mm", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Geometria", phase_no: 4 },
    { item_no: 14, check_code: "03.14", label: "Tela final (as-built) — geometria da via", method: "Levantamento topográfico", acceptance_criteria: "Tela final assinada e entregue à Fiscalização", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Receção", phase_no: 7, doc_record: "Tela final" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-04 — Estruturas (PSR Cachofarra)
// ════════════════════════════════════════════════════════════════════════════
const PPI_04: SeedTemplate = {
  code: "PPI-PF17A-04",
  disciplina: "estruturas",
  title: "Estruturas — PSR Cachofarra",
  description: "Controlo de fundações, pilares, tabuleiro e acabamentos da Passagem Superior Rodoviária.",
  items: [
    { item_no: 1, check_code: "04.01", label: "Implantação topográfica das fundações", method: "Topografia", acceptance_criteria: "Conforme projeto; tolerância ±20 mm", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Fundações", phase_no: 1 },
    { item_no: 2, check_code: "04.02", label: "Escavação para fundações — cotas e dimensões", method: "Topografia + visual", acceptance_criteria: "Solo de fundação conforme estudo geotécnico", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", phase_name: "Fundações", phase_no: 1 },
    { item_no: 3, check_code: "04.03", label: "Betão de limpeza e regularização", method: "Visual + medição", acceptance_criteria: "Espessura mín. 100 mm; superfície regular", ipt_e: "rp", ipt_f: "rp", ipt_ip: "na", phase_name: "Fundações", phase_no: 1 },
    { item_no: 4, check_code: "04.04", label: "Armaduras de fundação — posicionamento e recobrimento", method: "Medição + visual", acceptance_criteria: "Conforme desenho; recobrimento mín. 50 mm; espaçadores verificados", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Fundações", phase_no: 1 },
    { item_no: 5, check_code: "04.05", label: "Cofragem de fundação — estanquidade e dimensões", method: "Visual + medição", acceptance_criteria: "Sem folgas; dimensões conforme projeto ± 10 mm", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Fundações", phase_no: 1 },
    { item_no: 6, check_code: "04.06", label: "Betonagem de fundação — receção e colocação do betão", method: "Guia de remessa + slump", acceptance_criteria: "Classe betão conforme PE; slump dentro da classe; T < 30 °C", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Fundações", phase_no: 1, test_pe_code: "PE-PF17A-009" },
    { item_no: 7, check_code: "04.07", label: "Pilares — cofragem, armaduras e verticalidade", method: "Medição + prumo", acceptance_criteria: "Verticalidade < H/500; armaduras conforme desenho", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Pilares", phase_no: 2 },
    { item_no: 8, check_code: "04.08", label: "Betonagem de pilares", method: "Guia + slump + provetes", acceptance_criteria: "Conforme fundações; provetes de controlo recolhidos", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Pilares", phase_no: 2, test_pe_code: "PE-PF17A-010" },
    { item_no: 9, check_code: "04.09", label: "Cimbre / escoramento do tabuleiro — estabilidade", method: "Cálculo + visual", acceptance_criteria: "Conforme nota de cálculo; bases apoiadas em terreno firme", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Tabuleiro", phase_no: 3 },
    { item_no: 10, check_code: "04.10", label: "Armaduras do tabuleiro — pré-esforço e passivos", method: "Medição + visual", acceptance_criteria: "Conforme desenho; bainhas de pré-esforço posicionadas", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Tabuleiro", phase_no: 3 },
    { item_no: 11, check_code: "04.11", label: "Betonagem do tabuleiro", method: "Guia + slump + provetes", acceptance_criteria: "Classe conforme PE; betonagem contínua; cura > 7 dias", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Tabuleiro", phase_no: 3, test_pe_code: "PE-PF17A-011" },
    { item_no: 12, check_code: "04.12", label: "Aplicação de pré-esforço — tensionamento", method: "Manómetro + extensão calibrada", acceptance_criteria: "Força e extensão conformes com nota de cálculo ± 5%", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Pré-esforço", phase_no: 4, doc_record: "Ficha de tensionamento" },
    { item_no: 13, check_code: "04.13", label: "Injeção de bainhas de pré-esforço", method: "Registo de injeção", acceptance_criteria: "Calda conforme especificação; sem vazios", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Pré-esforço", phase_no: 4 },
    { item_no: 14, check_code: "04.14", label: "Aparelhos de apoio — posicionamento e nivelamento", method: "Topografia + medição", acceptance_criteria: "Conforme projeto; tolerância ±2 mm", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Apoios", phase_no: 5 },
    { item_no: 15, check_code: "04.15", label: "Juntas de dilatação — instalação", method: "Medição + visual", acceptance_criteria: "Abertura conforme temperatura de instalação", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Acabamentos", phase_no: 6 },
    { item_no: 16, check_code: "04.16", label: "Impermeabilização do tabuleiro", method: "Visual + ensaio de aderência", acceptance_criteria: "Membrana sem bolhas; aderência ≥ 0,5 MPa", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Acabamentos", phase_no: 6 },
    { item_no: 17, check_code: "04.17", label: "Ensaio de carga estática da estrutura", method: "Ensaio de carga conforme regulamento", acceptance_criteria: "Flechas e recuperação dentro dos limites regulamentares", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Receção", phase_no: 7, test_pe_code: "PE-PF17A-012", doc_record: "Relatório de ensaio de carga" },
    { item_no: 18, check_code: "04.18", label: "Tela final (as-built) — estrutura completa", method: "Levantamento topográfico", acceptance_criteria: "Tela final assinada", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Receção", phase_no: 7, doc_record: "Tela final" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-05 — Catenária e OFE
// ════════════════════════════════════════════════════════════════════════════
const PPI_05: SeedTemplate = {
  code: "PPI-PF17A-05",
  disciplina: "instalacoes",
  title: "Catenária e OFE",
  description: "Controlo de fundações de postes, montagem de catenária, regulação e ensaios pré-energização.",
  items: [
    { item_no: 1, check_code: "05.01", label: "Implantação das fundações dos postes de catenária", method: "Topografia", acceptance_criteria: "Posição conforme projeto; tolerância ±30 mm", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Fundações", phase_no: 1 },
    { item_no: 2, check_code: "05.02", label: "Fundações dos postes — armaduras e betonagem", method: "Medição + guia betão", acceptance_criteria: "Recobrimento e classe betão conforme PE", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Fundações", phase_no: 1 },
    { item_no: 3, check_code: "05.03", label: "Montagem dos postes — verticalidade e fixação", method: "Prumo + torquímetro", acceptance_criteria: "Verticalidade < H/200; apertos conforme tabela fabricante", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Montagem", phase_no: 2 },
    { item_no: 4, check_code: "05.04", label: "Consolas e braços de catenária — tipo e orientação", method: "Visual + medição", acceptance_criteria: "Tipo conforme esquema de catenária; orientação correcta", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Montagem", phase_no: 2 },
    { item_no: 5, check_code: "05.05", label: "Desenrolamento do fio de contacto e cabo portante", method: "Visual", acceptance_criteria: "Sem torções; tensão de desenrolamento controlada", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Cableamento", phase_no: 3 },
    { item_no: 6, check_code: "05.06", label: "Tensionamento dos cabos (portante + contacto)", method: "Dinamómetro / célula de carga", acceptance_criteria: "Tensões conforme tabela de regulação (ex: 10 kN fio contacto)", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Regulação", phase_no: 4 },
    { item_no: 7, check_code: "05.07", label: "Regulação de alturas e escalonamento (zigzag)", method: "Medição (vareta calibrada)", acceptance_criteria: "Altura fio contacto: 5,30 m ± 30 mm; zigzag conforme projeto", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Regulação", phase_no: 4 },
    { item_no: 8, check_code: "05.08", label: "Ligações eléctricas e pontos de seccionamento", method: "Megóhmetro + visual", acceptance_criteria: "Isolamento ≥ 100 MΩ; continuidade confirmada", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Eléctrica", phase_no: 5 },
    { item_no: 9, check_code: "05.09", label: "Circuito de retorno de tracção (terras)", method: "Medição de resistência de terra", acceptance_criteria: "Rt < 1 Ω conforme especificação", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Eléctrica", phase_no: 5, test_pe_code: "PE-PF17A-013" },
    { item_no: 10, check_code: "05.10", label: "Equipamentos de OFE (seccionadores, transformadores)", method: "Ensaio funcional", acceptance_criteria: "Operação conforme manual do fabricante; sem alarmes", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "OFE", phase_no: 6 },
    { item_no: 11, check_code: "05.11", label: "Ensaio de isolamento antes da energização", method: "Ensaio de tensão aplicada", acceptance_criteria: "Sem descarga disruptiva; conforme EN 50119", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Pré-energização", phase_no: 7, test_pe_code: "PE-PF17A-014" },
    { item_no: 12, check_code: "05.12", label: "Ensaio dinâmico com pantógrafo (veículo de medição)", method: "Veículo de medição de catenária", acceptance_criteria: "Descolamentos e arcos conforme EN 50317; sem pontos quentes", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Receção", phase_no: 8, doc_record: "Relatório de ensaio dinâmico" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-06 — Reforço da Catenária Tipo (RCT) e Troço de Transição (TP)
// ════════════════════════════════════════════════════════════════════════════
const PPI_06: SeedTemplate = {
  code: "PPI-PF17A-06",
  disciplina: "instalacoes",
  title: "Reforço Catenária Tipo (RCT) e Transição (TP)",
  description: "Controlo de desativação, montagem e regulação de catenária reforçada e troços de transição.",
  items: [
    { item_no: 1, check_code: "06.01", label: "Verificação da desativação e consignação da catenária existente", method: "Procedimento de consignação", acceptance_criteria: "Confirmação escrita de catenária sem tensão; sinalização colocada", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Preparação", phase_no: 1, doc_record: "Ficha de consignação" },
    { item_no: 2, check_code: "06.02", label: "Desmontagem de catenária existente (componentes a reutilizar)", method: "Visual + inventário", acceptance_criteria: "Componentes identificados e armazenados; sem danos", ipt_e: "rp", ipt_f: "rp", ipt_ip: "na", phase_name: "Preparação", phase_no: 1 },
    { item_no: 3, check_code: "06.03", label: "Verificação dimensional das novas consolas/braços", method: "Medição", acceptance_criteria: "Conforme desenho de fabrico; certificados verificados", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Materiais", phase_no: 2 },
    { item_no: 4, check_code: "06.04", label: "Montagem dos novos postes/braços de RCT", method: "Visual + prumo", acceptance_criteria: "Verticalidade e fixação conforme PPI-05", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Montagem", phase_no: 3 },
    { item_no: 5, check_code: "06.05", label: "Desenrolamento e tensionamento — fio contacto RCT", method: "Dinamómetro", acceptance_criteria: "Tensão conforme tabela de regulação RCT", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Regulação", phase_no: 4 },
    { item_no: 6, check_code: "06.06", label: "Regulação de alturas e zigzag — zona de transição", method: "Medição (vareta calibrada)", acceptance_criteria: "Transição suave sem degraus; ΔH < 10 mm entre vãos", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Regulação", phase_no: 4 },
    { item_no: 7, check_code: "06.07", label: "Ligações eléctricas do troço de transição", method: "Megóhmetro", acceptance_criteria: "Isolamento ≥ 100 MΩ; continuidade OK", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Eléctrica", phase_no: 5 },
    { item_no: 8, check_code: "06.08", label: "Ensaio de isolamento da zona RCT/TP", method: "Ensaio de tensão aplicada", acceptance_criteria: "Conforme EN 50119", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Ensaios", phase_no: 6, test_pe_code: "PE-PF17A-015" },
    { item_no: 9, check_code: "06.09", label: "Ensaio dinâmico com pantógrafo — zona de transição", method: "Veículo de medição", acceptance_criteria: "Sem descolamentos anómalos; continuidade geométrica", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Receção", phase_no: 7, doc_record: "Relatório de ensaio" },
    { item_no: 10, check_code: "06.10", label: "Relatório final e as-built da zona RCT/TP", method: "Compilação documental", acceptance_criteria: "Dossiê completo entregue à Fiscalização", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Receção", phase_no: 7, doc_record: "Dossiê final" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-07 — Sinalização e Telecomunicações
// ════════════════════════════════════════════════════════════════════════════
const PPI_07: SeedTemplate = {
  code: "PPI-PF17A-07",
  disciplina: "instalacoes",
  title: "Sinalização e Telecomunicações",
  description: "Controlo de desativação S&T, instalação de equipamentos, cabos e ensaios funcionais (Supressão PN).",
  items: [
    { item_no: 1, check_code: "07.01", label: "Desativação dos equipamentos S&T existentes (PN Cachofarra)", method: "Procedimento de consignação S&T", acceptance_criteria: "Equipamentos desligados e sinalizados; confirmação IP", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Desativação", phase_no: 1, doc_record: "Auto de desativação" },
    { item_no: 2, check_code: "07.02", label: "Desmontagem de sinalização existente", method: "Visual + inventário", acceptance_criteria: "Equipamentos retirados sem danos; inventário completo", ipt_e: "rp", ipt_f: "rp", ipt_ip: "na", phase_name: "Desativação", phase_no: 1 },
    { item_no: 3, check_code: "07.03", label: "Fundações e maciços para novos postes de sinalização", method: "Medição + visual", acceptance_criteria: "Cotas e dimensões conforme projeto", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Implantação", phase_no: 2 },
    { item_no: 4, check_code: "07.04", label: "Instalação de condutas e passagem de cabos S&T", method: "Visual + medição", acceptance_criteria: "Condutas sem obstrução; raio de curvatura respeitado", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Cablagem", phase_no: 3 },
    { item_no: 5, check_code: "07.05", label: "Receção e instalação de equipamentos de sinalização (sinais, motores AMV)", method: "Certificados + visual", acceptance_criteria: "Equipamentos com certificados CE; instalação conforme manual", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Montagem", phase_no: 4 },
    { item_no: 6, check_code: "07.06", label: "Instalação de detectores de via (CDV / circuitos de via)", method: "Visual + medição", acceptance_criteria: "Posicionamento e regulação conforme projeto", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Montagem", phase_no: 4 },
    { item_no: 7, check_code: "07.07", label: "Instalação de equipamentos de telecomunicações", method: "Visual + ensaio", acceptance_criteria: "Equipamentos operacionais; comunicação confirmada", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Montagem", phase_no: 4 },
    { item_no: 8, check_code: "07.08", label: "Ligações elétricas e aterramento dos armários S&T", method: "Megóhmetro + medição de terra", acceptance_criteria: "Isolamento OK; resistência de terra < 10 Ω", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Eléctrica", phase_no: 5 },
    { item_no: 9, check_code: "07.09", label: "Ensaio funcional dos motores de AMV (S&T)", method: "Ensaio funcional", acceptance_criteria: "Mudança de agulha em < 6 s; sem alarmes; encravamento OK", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Ensaios", phase_no: 6, test_pe_code: "PE-PF17A-016" },
    { item_no: 10, check_code: "07.10", label: "Ensaio funcional dos CDV / detectores de via", method: "Ensaio funcional", acceptance_criteria: "Detecção correcta de ocupação e libertação", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Ensaios", phase_no: 6, test_pe_code: "PE-PF17A-017" },
    { item_no: 11, check_code: "07.11", label: "Ensaio funcional da sinalização luminosa", method: "Visual + medição fotométrica", acceptance_criteria: "Visibilidade conforme norma; sem degradação de cor", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Ensaios", phase_no: 6 },
    { item_no: 12, check_code: "07.12", label: "Ensaio funcional integrado (S&T + encravamentos)", method: "Procedimento de ensaio integrado", acceptance_criteria: "Todos os itinerários testados; sem conflitos", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Ensaios", phase_no: 6, doc_record: "Relatório de ensaios integrados" },
    { item_no: 13, check_code: "07.13", label: "Ensaio de telecomunicações (voz e dados)", method: "Medição de nível + ensaio funcional", acceptance_criteria: "Nível de sinal conforme especificação; sem ruído", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Ensaios", phase_no: 6 },
    { item_no: 14, check_code: "07.14", label: "Documentação final S&T e as-built", method: "Compilação documental", acceptance_criteria: "Dossiê completo com esquemas actualizados", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Receção", phase_no: 7, doc_record: "Dossiê S&T" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-08 — Obras de Arte / Muros
// ════════════════════════════════════════════════════════════════════════════
const PPI_08: SeedTemplate = {
  code: "PPI-PF17A-08",
  disciplina: "estruturas",
  title: "Obras de Arte Correntes / Muros",
  description: "Controlo de muros de suporte, passagens hidráulicas e pequenas obras de arte.",
  items: [
    { item_no: 1, check_code: "08.01", label: "Implantação topográfica (muros e PH)", method: "Topografia", acceptance_criteria: "Conforme projeto; tolerância ±30 mm", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Implantação", phase_no: 1 },
    { item_no: 2, check_code: "08.02", label: "Escavação de fundação — cotas e solo", method: "Topografia + visual", acceptance_criteria: "Solo conforme estudo geotécnico; sem água", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", phase_name: "Fundações", phase_no: 2 },
    { item_no: 3, check_code: "08.03", label: "Armaduras de fundação e sapata", method: "Medição + visual", acceptance_criteria: "Conforme desenho; recobrimento verificado", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Fundações", phase_no: 2 },
    { item_no: 4, check_code: "08.04", label: "Betonagem de fundação", method: "Guia + slump + provetes", acceptance_criteria: "Classe betão conforme PE; provetes recolhidos", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Fundações", phase_no: 2, test_pe_code: "PE-PF17A-018" },
    { item_no: 5, check_code: "08.05", label: "Paramento — cofragem, armaduras e verticalidade", method: "Medição + prumo", acceptance_criteria: "Verticalidade < H/500; conforme desenho", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Muro", phase_no: 3 },
    { item_no: 6, check_code: "08.06", label: "Betonagem do muro / paramento", method: "Guia + slump + provetes", acceptance_criteria: "Classe conforme PE; betonagem por camadas", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Muro", phase_no: 3 },
    { item_no: 7, check_code: "08.07", label: "Drenagem do tardoz (geodreno + brita)", method: "Visual + medição", acceptance_criteria: "Geodreno contínuo; brita conforme granulometria", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Drenagem", phase_no: 4 },
    { item_no: 8, check_code: "08.08", label: "Impermeabilização do tardoz", method: "Visual", acceptance_criteria: "Membrana contínua; sem perfurações; sobreposições OK", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Drenagem", phase_no: 4 },
    { item_no: 9, check_code: "08.09", label: "Aterro de tardoz — compactação", method: "Ensaio Proctor", acceptance_criteria: "Gc ≥ 95% PM; camadas ≤ 0,30 m", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Aterro", phase_no: 5, test_pe_code: "PE-PF17A-019" },
    { item_no: 10, check_code: "08.10", label: "Acabamentos — juntas de dilatação e remates", method: "Visual + medição", acceptance_criteria: "Juntas seladas; remates conforme projeto", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Acabamentos", phase_no: 6 },
    { item_no: 11, check_code: "08.11", label: "Passagens hidráulicas — tubagem e leito", method: "Visual + topografia", acceptance_criteria: "Inclinação conforme; leito de assentamento verificado", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "PH", phase_no: 7 },
    { item_no: 12, check_code: "08.12", label: "Tela final (as-built) — muros e PH", method: "Levantamento topográfico", acceptance_criteria: "Tela final assinada", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Receção", phase_no: 8, doc_record: "Tela final" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-09 — Edificações
// ════════════════════════════════════════════════════════════════════════════
const PPI_09: SeedTemplate = {
  code: "PPI-PF17A-09",
  disciplina: "instalacoes",
  title: "Edificações",
  description: "Controlo de construção e reabilitação de edifícios técnicos e de apoio.",
  items: [
    { item_no: 1, check_code: "09.01", label: "Implantação topográfica do edifício", method: "Topografia", acceptance_criteria: "Conforme projeto; tolerância ±20 mm", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Implantação", phase_no: 1 },
    { item_no: 2, check_code: "09.02", label: "Fundações — armaduras e betonagem", method: "Medição + guia betão", acceptance_criteria: "Conforme PPI-11 (betão estrutural); recobrimento verificado", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Fundações", phase_no: 2 },
    { item_no: 3, check_code: "09.03", label: "Estrutura — pilares, vigas e lajes", method: "Medição + visual", acceptance_criteria: "Dimensões e armaduras conforme desenho", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Estrutura", phase_no: 3 },
    { item_no: 4, check_code: "09.04", label: "Alvenarias e divisórias", method: "Visual + prumo", acceptance_criteria: "Prumo < 5 mm/m; argamassa conforme", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Arquitetura", phase_no: 4 },
    { item_no: 5, check_code: "09.05", label: "Cobertura — impermeabilização e isolamento", method: "Visual + ensaio de estanquidade", acceptance_criteria: "Sem infiltrações; isolamento conforme projeto térmico", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Cobertura", phase_no: 5 },
    { item_no: 6, check_code: "09.06", label: "Caixilharias e serralharias", method: "Visual + medição", acceptance_criteria: "Funcionamento correcto; estanquidade ao ar e água", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Acabamentos", phase_no: 6 },
    { item_no: 7, check_code: "09.07", label: "Instalações eléctricas interiores", method: "Ensaio de isolamento + funcional", acceptance_criteria: "Isolamento OK; quadros eléctricos conforme esquema", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Instalações", phase_no: 7 },
    { item_no: 8, check_code: "09.08", label: "Instalações hidráulicas e AVAC", method: "Ensaio de pressão + funcional", acceptance_criteria: "Sem fugas; caudais e temperaturas conforme", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Instalações", phase_no: 7 },
    { item_no: 9, check_code: "09.09", label: "Acabamentos interiores (revestimentos, pinturas)", method: "Visual", acceptance_criteria: "Sem defeitos visíveis; cores e materiais conforme", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Acabamentos", phase_no: 6 },
    { item_no: 10, check_code: "09.10", label: "Tela final (as-built) e dossiê técnico", method: "Compilação documental", acceptance_criteria: "Dossiê completo; telas actualizadas", ipt_e: "hp", ipt_f: "hp", ipt_ip: "rp", evidence_required: true, phase_name: "Receção", phase_no: 8, doc_record: "Dossiê técnico" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-10 — Passagens de Nível
// ════════════════════════════════════════════════════════════════════════════
const PPI_10: SeedTemplate = {
  code: "PPI-PF17A-10",
  disciplina: "ferrovia",
  title: "Passagens de Nível",
  description: "Controlo da supressão de PN e construção de alternativas (PSR/PI).",
  items: [
    { item_no: 1, check_code: "10.01", label: "Desativação dos equipamentos existentes da PN", method: "Procedimento de consignação", acceptance_criteria: "Equipamentos desligados; sinalização conforme", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Desativação", phase_no: 1, doc_record: "Auto de desativação" },
    { item_no: 2, check_code: "10.02", label: "Demolição de pavimento e infra-estrutura da PN", method: "Visual", acceptance_criteria: "Remoção total; área limpa", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Demolição", phase_no: 2 },
    { item_no: 3, check_code: "10.03", label: "Vedação e sinalização permanente (supressão)", method: "Visual + medição", acceptance_criteria: "Vedação conforme projeto; sinalização vertical instalada", ipt_e: "hp", ipt_f: "wp", ipt_ip: "rp", evidence_required: true, phase_name: "Vedação", phase_no: 3 },
    { item_no: 4, check_code: "10.04", label: "Reposição da via na zona da PN suprimida", method: "Topografia + geometria", acceptance_criteria: "Continuidade geométrica; conforme PPI-03", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Via", phase_no: 4 },
    { item_no: 5, check_code: "10.05", label: "Construção de caminho/estrada alternativa", method: "Topografia + ensaio", acceptance_criteria: "Perfil e pavimento conforme projeto rodoviário", ipt_e: "hp", ipt_f: "wp", ipt_ip: "wp", evidence_required: true, phase_name: "Alternativa", phase_no: 5 },
    { item_no: 6, check_code: "10.06", label: "Sinalização rodoviária definitiva", method: "Visual", acceptance_criteria: "Sinalização horizontal e vertical conforme norma", ipt_e: "rp", ipt_f: "wp", ipt_ip: "rp", phase_name: "Sinalização", phase_no: 6 },
    { item_no: 7, check_code: "10.07", label: "Documentação final e auto de supressão", method: "Compilação documental", acceptance_criteria: "Auto assinado pelas 3 partes", ipt_e: "hp", ipt_f: "hp", ipt_ip: "hp", evidence_required: true, phase_name: "Receção", phase_no: 7, doc_record: "Auto de supressão PN" },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PPI-11 — Betão Estrutural
// ════════════════════════════════════════════════════════════════════════════
const PPI_11: SeedTemplate = {
  code: "PPI-PF17A-11",
  disciplina: "betao",
  title: "Betão Estrutural",
  description: "Controlo genérico de produção, transporte, colocação e cura de betão estrutural.",
  items: [
    { item_no: 1, check_code: "11.01", label: "Aprovação da central de betão (qualificação)", method: "Auditoria + ensaio de qualificação", acceptance_criteria: "Central qualificada; ensaio de composição aprovado", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Qualificação", phase_no: 1, doc_record: "Relatório de qualificação" },
    { item_no: 2, check_code: "11.02", label: "Receção do betão em obra (guia, slump, temperatura)", method: "Ensaio de abaixamento EN 12350-2 + termómetro", acceptance_criteria: "Slump dentro da classe ± tolerância; T < 30 °C; tempo < 90 min", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Receção", phase_no: 2, test_pe_code: "PE-PF17A-020" },
    { item_no: 3, check_code: "11.03", label: "Recolha de provetes (cubos/cilindros)", method: "EN 12390-2", acceptance_criteria: "Mín. 6 provetes por lote; identificados e curados", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Ensaios", phase_no: 3, test_pe_code: "PE-PF17A-021" },
    { item_no: 4, check_code: "11.04", label: "Cofragem — dimensões, estanquidade e descofrante", method: "Medição + visual", acceptance_criteria: "Conforme desenho ± 5 mm; sem folgas; descofrante aplicado", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Cofragem", phase_no: 4 },
    { item_no: 5, check_code: "11.05", label: "Armaduras — posicionamento, recobrimento e espaçadores", method: "Medição + visual", acceptance_criteria: "Recobrimento mín. conforme EC2/projeto; espaçadores ≤ 1 m", ipt_e: "hp", ipt_f: "hp", ipt_ip: "na", evidence_required: true, phase_name: "Armaduras", phase_no: 5 },
    { item_no: 6, check_code: "11.06", label: "Emendas e comprimentos de amarração", method: "Medição", acceptance_criteria: "Comprimentos conforme EC2; sobreposição ≥ lb", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Armaduras", phase_no: 5 },
    { item_no: 7, check_code: "11.07", label: "Betonagem — altura de queda, vibração e continuidade", method: "Visual", acceptance_criteria: "Queda ≤ 1,5 m; vibração cada 0,5 m; sem juntas frias", ipt_e: "hp", ipt_f: "wp", ipt_ip: "na", evidence_required: true, phase_name: "Betonagem", phase_no: 6 },
    { item_no: 8, check_code: "11.08", label: "Cura do betão (método e duração)", method: "Visual + registo", acceptance_criteria: "Cura húmida ≥ 7 dias ou membrana de cura aplicada", ipt_e: "rp", ipt_f: "rp", ipt_ip: "na", phase_name: "Cura", phase_no: 7 },
    { item_no: 9, check_code: "11.09", label: "Ensaio de resistência à compressão (7 e 28 dias)", method: "EN 12390-3", acceptance_criteria: "fck conforme classe especificada; conformidade estatística", ipt_e: "hp", ipt_f: "hp", ipt_ip: "wp", evidence_required: true, phase_name: "Ensaios", phase_no: 3, test_pe_code: "PE-PF17A-022" },
    { item_no: 10, check_code: "11.10", label: "Descofragem — prazo e estado da superfície", method: "Visual + registo", acceptance_criteria: "Prazo mín. conforme EC2; sem defeitos (ninhos, fissuras)", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Descofragem", phase_no: 8 },
    { item_no: 11, check_code: "11.11", label: "Reparação de defeitos superficiais", method: "Visual + ensaio pull-off", acceptance_criteria: "Reparação conforme procedimento aprovado; aderência ≥ 1,5 MPa", ipt_e: "rp", ipt_f: "wp", ipt_ip: "na", phase_name: "Acabamentos", phase_no: 9 },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Master array
// ════════════════════════════════════════════════════════════════════════════
const ALL_TEMPLATES: SeedTemplate[] = [
  PPI_01, PPI_02, PPI_03, PPI_04, PPI_05,
  PPI_06, PPI_07, PPI_08, PPI_09, PPI_10, PPI_11,
];

// ════════════════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════════════════

export const ppiSeedService = {
  /** Total templates available */
  get templateCount() { return ALL_TEMPLATES.length; },

  /** Total items across all templates */
  get totalItemCount() { return ALL_TEMPLATES.reduce((s, t) => s + t.items.length, 0); },

  /**
   * Seed all 11 PPI templates + items for `projectId`.
   * Idempotent: skips templates whose code already exists.
   */
  async seedAllTemplates(
    projectId: string,
    userId: string,
    onProgress?: (msg: string) => void,
  ): Promise<{ created: string[]; skipped: string[]; itemsCreated: number }> {
    const created: string[] = [];
    const skipped: string[] = [];
    let itemsCreated = 0;

    for (const def of ALL_TEMPLATES) {
      // Check existence
      const { data: existing } = await supabase
        .from("ppi_templates")
        .select("id")
        .eq("project_id", projectId)
        .eq("code", def.code)
        .maybeSingle();

      if (existing) {
        skipped.push(def.code);
        onProgress?.(`⏭ ${def.code} — já existe`);
        continue;
      }

      onProgress?.(`📝 ${def.code} — a criar…`);

      // Create template
      const tmpl = await ppiService.createTemplate({
        project_id:  projectId,
        code:        def.code,
        disciplina:  def.disciplina,
        title:       def.title,
        description: def.description,
        version:     1,
        created_by:  userId,
      });

      // Create items
      if (def.items.length > 0) {
        const itemInputs: PpiTemplateItemInput[] = def.items.map((it) => ({
          template_id:         tmpl.id,
          item_no:             it.item_no,
          check_code:          it.check_code,
          label:               it.label,
          method:              it.method ?? null,
          acceptance_criteria: it.acceptance_criteria ?? null,
          ipt_e:               it.ipt_e ?? "na",
          ipt_f:               it.ipt_f ?? "na",
          ipt_ip:              it.ipt_ip ?? "na",
          evidence_required:   it.evidence_required ?? false,
          phase_name:          it.phase_name ?? null,
          phase_no:            it.phase_no ?? null,
          doc_record:          it.doc_record ?? null,
          test_pe_code:        it.test_pe_code ?? null,
          required:            true,
          sort_order:          it.item_no,
        }));
        await ppiService.addTemplateItems(itemInputs);
        itemsCreated += itemInputs.length;
      }

      created.push(def.code);
      onProgress?.(`✅ ${def.code} — ${def.items.length} itens`);
    }

    return { created, skipped, itemsCreated };
  },

  /** Get template definitions (read-only, for preview) */
  getTemplateDefinitions(): { code: string; title: string; disciplina: string; itemCount: number }[] {
    return ALL_TEMPLATES.map((t) => ({
      code:       t.code,
      title:      t.title,
      disciplina: t.disciplina,
      itemCount:  t.items.length,
    }));
  },
};
