/**
 * ppiSeedService — 12 PPI templates for PF17A (Linha do Sul IP).
 * Source: PQO-PF17A-001 Rev.01 + physical checklists CK-*-PF17A Rev.00
 * Idempotent: skips templates whose code already exists in DB.
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

// ── PPI-01 Terraplenagem ──────────────────────────────────────────────────────
const PPI_01: SeedTemplate = {
  code: "PPI-PF17A-01",
  disciplina: "terras",
  title: "Terraplenagem, Plataforma e Geotecnia",
  description: "Controlo de escavação, aterro, compactação e acabamentos de terraplenagem e plataforma ferroviária.",
  items: [
    { item_no:1, check_code:"01.01", label:"Implantação topográfica — cotas e perfil conforme projecto", method:"Levantamento topográfico", acceptance_criteria:"Tolerância ±50 mm cota · ±100 mm planta", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Implantação", phase_no:1 },
    { item_no:2, check_code:"01.02", label:"Material de aterro — granulometria e plasticidade conformes", method:"Ensaio laboratorial", acceptance_criteria:"Solos não expansivos · IP ≤ 6% (PAME)", ipt_e:"hp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Aterro", phase_no:2 },
    { item_no:3, check_code:"01.03", label:"Espessura de camada antes de compactar", method:"Medição directa", acceptance_criteria:"≤ 30 cm compactada (material granular coeso)", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Aterro", phase_no:2 },
    { item_no:4, check_code:"01.04", label:"Compactação — gamma-densímetro ou placa de carga", method:"Gamagrafia / Placa de carga LNEC E197", acceptance_criteria:"≥ 95% PM (LNEC E197) · ou Ev2 ≥ valor proj.", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Compactação", phase_no:3, test_pe_code:"PE-PF17A-003" },
    { item_no:5, check_code:"01.05", label:"Recobrimento do geossintético (se aplicável)", method:"Visual + medição sobreposição", acceptance_criteria:"Conforme projecto · sem rasgões ou dobras · sobreposição ≥ 30 cm", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Aterro", phase_no:2 },
    { item_no:6, check_code:"01.06", label:"Perfil transversal — inclinação das bermas", method:"Topografia / nível", acceptance_criteria:"Conforme projecto (típ. 3–5% para drenagem)", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:4 },
    { item_no:7, check_code:"01.07", label:"Cota de plataforma ferroviária acabada", method:"Levantamento topográfico", acceptance_criteria:"±20 mm em relação ao projecto · TOP confirma", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Acabamentos", phase_no:4, doc_record:"Tela final" },
    { item_no:8, check_code:"01.08", label:"Ausência de material orgânico, argila expansiva ou pedras > Dmáx", method:"Inspecção visual — qualquer dúvida: ensaio", acceptance_criteria:"100% conforme — material homogéneo", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Aterro", phase_no:2 },
    { item_no:9, check_code:"01.09", label:"Registo de colheita de amostras para Proctor/CBR", method:"Ensaio laboratorial LNEC E-196/E-197", acceptance_criteria:"1 ensaio por 500 m de frente ou alteração de material", ipt_e:"hp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Compactação", phase_no:3, test_pe_code:"PE-PF17A-002" },
    { item_no:10, check_code:"01.10", label:"Protecção de geotêxtil antes de betonagem ou colocação de tubagens", method:"Visual", acceptance_criteria:"Sem rasgões · junta de sobreposição ≥ 30 cm", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:4 },
  ],
};

// ── PPI-02 Drenagem ───────────────────────────────────────────────────────────
const PPI_02: SeedTemplate = {
  code: "PPI-PF17A-02",
  disciplina: "drenagem",
  title: "Drenagem, Passagens Hidráulicas e Muros de Contenção",
  description: "Controlo de valas, colectores, passagens hidráulicas, geotêxtil e compactação de drenagem longitudinal e transversal.",
  items: [
    { item_no:1, check_code:"02.01", label:"Implantação topográfica da vala/PH: cota fundo e alinhamento", method:"Topografia", acceptance_criteria:"±20 mm cota · ±50 mm planta (TOP)", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Implantação", phase_no:1 },
    { item_no:2, check_code:"02.02", label:"Perfil de escavação da vala: dimensões conforme projecto", method:"Medição directa", acceptance_criteria:"Largura e profundidade conforme PE Drenagem", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Escavação", phase_no:2 },
    { item_no:3, check_code:"02.03", label:"Leito de areia sob tubagem: espessura e compactação", method:"Medição + visual", acceptance_criteria:"≥ 100 mm areia lavada · compactada", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", phase_name:"Tubagem", phase_no:3 },
    { item_no:4, check_code:"02.04", label:"Tubagem/manilha: tipo, diâmetro e PAME aprovado", method:"Visual + documento PAME", acceptance_criteria:"Conforme PAME aprovado · sem fissuras nem deformações", ipt_e:"hp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Tubagem", phase_no:3 },
    { item_no:5, check_code:"02.05", label:"Juntas entre elementos: argamassa ou anel borracha conforme especificação", method:"Visual", acceptance_criteria:"Juntas estanques · sem desalinhamentos > 5 mm", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Tubagem", phase_no:3 },
    { item_no:6, check_code:"02.06", label:"Pendente da tubagem: verificação com nível", method:"Nível laser / nivelamento", acceptance_criteria:"≥ 0,3% em toda a extensão", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Tubagem", phase_no:3 },
    { item_no:7, check_code:"02.07", label:"Geossintético (se aplicável): colocação e sobreposição", method:"Visual + medição sobreposição", acceptance_criteria:"Juntas de sobreposição ≥ 300 mm · sem rasgões", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Aterro", phase_no:4 },
    { item_no:8, check_code:"02.08", label:"Fita de sinalização: cor e posição", method:"Visual + medição cota", acceptance_criteria:"200 mm acima da tubagem · cor conforme norma", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Aterro", phase_no:4 },
    { item_no:9, check_code:"02.09", label:"Compactação do enchimento da vala", method:"Gamagrafia / placa LNEC E197/E198", acceptance_criteria:"≥ 95% PM", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Aterro", phase_no:4, test_pe_code:"PE-PF17A-005" },
    { item_no:10, check_code:"02.10", label:"PH — Inspecção final: escoamento livre, bocas sem obstrução, cota de saída", method:"Visual + topografia", acceptance_criteria:"Folga ≥ 2 m da fila do carril (T=100 anos) · cota conforme PE", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Acabamentos", phase_no:5 },
    { item_no:11, check_code:"02.11", label:"Coletor C.10 DN800: cota de descarga verificada topograficamente", method:"Levantamento topográfico", acceptance_criteria:"Cota 1,721 m (ALERTA: abaixo preia-mar máxima 2,000 m — risco manutenção)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"rp", evidence_required:true, phase_name:"Acabamentos", phase_no:5 },
    { item_no:12, check_code:"02.12", label:"Registo fotográfico interior da PH antes do aterro final", method:"Fotografia", acceptance_criteria:"Obrigatório — arquivo no ATLAS com ref. GR", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Acabamentos", phase_no:5, doc_record:"Registo fotográfico PH" },
  ],
};

// ── PPI-03 Via Férrea ─────────────────────────────────────────────────────────
const PPI_03: SeedTemplate = {
  code: "PPI-PF17A-03",
  disciplina: "ferrovia",
  title: "Via Férrea — Superestrutura, AMV, Soldadura Aluminotérmica, Geometria Final",
  description: "Controlo de balastro, travessas, carril, AMV, soldaduras e geometria ferroviária (bitola, nivelamento, alinhamento, empeno).",
  items: [
    { item_no:1, check_code:"03.01", label:"Sub-balastro: espessura e compactação", method:"Topografia + placa de carga", acceptance_criteria:"Espessura conforme projecto · Ev2 ≥ 80 MPa", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Sub-balastro", phase_no:1, test_pe_code:"PE-PF17A-004" },
    { item_no:2, check_code:"03.02", label:"Balastro: espessura, limpeza e granulometria", method:"Medição + EN 13450", acceptance_criteria:"Espessura conforme projecto · EN 13450 · sem finos", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Balastro", phase_no:2 },
    { item_no:3, check_code:"03.03", label:"Travessas: espaçamento e orientação", method:"Medição directa", acceptance_criteria:"Conforme projecto (típ. 600 mm) · perpendiculares ao eixo", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Via", phase_no:3 },
    { item_no:4, check_code:"03.04", label:"Carril: perfil, comprimento e marcação (60E1/55G2/54E1)", method:"Visual + documento PAME", acceptance_criteria:"Conforme PAME aprovado · sem entalhes ou fissuração", ipt_e:"hp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Via", phase_no:3 },
    { item_no:5, check_code:"03.05", label:"Ligações de carril (juntas/soldaduras): alinhamento e nivelamento", method:"Medição com régua", acceptance_criteria:"Desnível < 0,5 mm (cravação) · desvio lateral < 1 mm", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Via", phase_no:3 },
    { item_no:6, check_code:"03.06", label:"Bitola (1668 mm): medição com gabarit calibrado", method:"Gabarit calibrado", acceptance_criteria:"Tolerância HP: +4 mm / -3 mm (EN 13848-1 AL1)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Geometria", phase_no:4 },
    { item_no:7, check_code:"03.07", label:"Nivelamento transversal (sobreelevação/peralte)", method:"Nível electrónico / bolha calibrado", acceptance_criteria:"Conforme projecto · tolerância AL1: ±3 mm", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Geometria", phase_no:4 },
    { item_no:8, check_code:"03.08", label:"Alinhamento em planta", method:"GMV / topografia", acceptance_criteria:"Tolerância AL1: ±3 mm (D1)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Geometria", phase_no:4 },
    { item_no:9, check_code:"03.09", label:"Empeno (torção da via em 3 m)", method:"GMV / régua de empeno", acceptance_criteria:"≤ 5 mm (AL1 para 120 km/h)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Geometria", phase_no:4 },
    { item_no:10, check_code:"03.10", label:"Altura do carril acima do balastro — face superior", method:"Medição directa", acceptance_criteria:"Conforme especificação · nivelamento longitudinal a1 ≤ 21 mm (IT.VIA.018)", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Geometria", phase_no:4 },
    { item_no:11, check_code:"03.11", label:"Travessas bem apoiadas — sem baloiço", method:"Inspecção visual e tacteio", acceptance_criteria:"100% travessas — inspecção visual + tacteio", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Via", phase_no:3 },
    { item_no:12, check_code:"03.12", label:"Lastro atacado e perfil transversal de balastro conforme", method:"Visual + medição ombro", acceptance_criteria:"Ombro de balastro ≥ 300 mm do bordo travessa", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Balastro", phase_no:2 },
  ],
};

// ── PPI-04 PSR Cachofarra ─────────────────────────────────────────────────────
const PPI_04: SeedTemplate = {
  code: "PPI-PF17A-04",
  disciplina: "estruturas",
  title: "Obras de Arte — PSR Cachofarra (DC01) e Passagens Hidráulicas Estruturais",
  description: "Controlo estrutural da Passagem Superior Rodoviária Cachofarra e passagens hidráulicas. Prazo DC01: ≤ 168 dias.",
  items: [
    { item_no:1, check_code:"04.01", label:"Cota de fundação: verificação topográfica antes de betonar", method:"Topografia", acceptance_criteria:"±20 mm em relação ao projecto · TQ + TOP confirmam", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1 },
    { item_no:2, check_code:"04.02", label:"Solo de fundação: capacidade de carga verificada pelo geotécnico", method:"Ensaio geotécnico / PMT", acceptance_criteria:"Conforme EGT PF17A · registo fotográfico obrigatório", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1 },
    { item_no:3, check_code:"04.03", label:"Armadura das fundações: diâmetros, espaçamentos, recobrimentos", method:"Medição directa", acceptance_criteria:"A500NR SD conforme projecto · recobrimento ≥ 30 mm (XC2)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1 },
    { item_no:4, check_code:"04.04", label:"Betão C25/30 XC2 nas fundações: guia de entrega, slump, T°", method:"Ensaio fresco + guia", acceptance_criteria:"Guia conforme PAME · slump ±30 mm · T° 5–35°C", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1, test_pe_code:"PE-PF17A-008" },
    { item_no:5, check_code:"04.05", label:"Armadura dos pilares: diâmetros, esperas, recobrimentos", method:"Medição directa", acceptance_criteria:"Recobrimento ≥ 40 mm (XC3/XD1) · esperas conforme proj.", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Estrutura", phase_no:2 },
    { item_no:6, check_code:"04.06", label:"Betão C30/37 XC3/XD1 nos pilares e tabuleiro", method:"Ensaio fresco + colheita provetes", acceptance_criteria:"Classe e exposição conforme PAME · colheita provetes obrigatória", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Estrutura", phase_no:2, test_pe_code:"PE-PF17A-008" },
    { item_no:7, check_code:"04.07", label:"Cofragem do tabuleiro: dimensões, prumo, estanqueidade", method:"Medição + visual", acceptance_criteria:"Tolerância EN 13670 Classe 2", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Estrutura", phase_no:2 },
    { item_no:8, check_code:"04.08", label:"Betonagem do tabuleiro: vibração, ausência de segregação", method:"Visual durante betonagem", acceptance_criteria:"Sem ninhos · vibrador sem tocar nas armaduras", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Estrutura", phase_no:2 },
    { item_no:9, check_code:"04.09", label:"Guarda-corpos e protecções: altura e afastamento conforme EN 50122-1", method:"Medição directa", acceptance_criteria:"≥ 1,10 m altura · separação à catenária conforme interoperabilidade", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Acabamentos", phase_no:3 },
    { item_no:10, check_code:"04.10", label:"Gabarit de passagem ferroviária livre: verificação com gabarit físico", method:"Gabarit físico em toda a largura", acceptance_criteria:"Gabarit cinemático respeitado em toda a largura", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Acabamentos", phase_no:3 },
    { item_no:11, check_code:"04.11", label:"Sinalização rodoviária R1: sinais verticais e marcações rodoviárias", method:"Visual", acceptance_criteria:"Conforme peças Vol.06 PE_01_06_301 a 313", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:12, check_code:"04.12", label:"DC01: PSR operacional antes de suprimir o PN PK 31+670", method:"Inspecção + aprovação câmara/EP", acceptance_criteria:"PSR aberta ao tráfego — aprovação câmara/EP antes de suprimir PN ⚡", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"DC01", phase_no:4, doc_record:"Auto DC01" },
  ],
};

// ── PPI-05 Catenária ──────────────────────────────────────────────────────────
const PPI_05: SeedTemplate = {
  code: "PPI-PF17A-05",
  disciplina: "instalacoes",
  title: "Catenária 1×25 kV/50 Hz e OFE",
  description: "Controlo de montagem da catenária LP10/LCS: fundações, postes, braços de chamada, altura FC, abertura, tensão mecânica, pêndulos e isolamento.",
  items: [
    { item_no:1, check_code:"05.01", label:"Fundação do poste: cota e alinhamento topográfico", method:"Topografia", acceptance_criteria:"Tolerância planta: ±50 mm · cota topo: ±20 mm", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1 },
    { item_no:2, check_code:"05.02", label:"Poste vertical — prumo (inspecção com nível de bolha)", method:"Nível de bolha", acceptance_criteria:"Desaprumo ≤ 5 mm/m", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Postes", phase_no:2 },
    { item_no:3, check_code:"05.03", label:"Braço de chamada: comprimento e inclinação", method:"Medição directa", acceptance_criteria:"LP10: 1150 mm · inclinação conforme IT.CAT.034", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Postes", phase_no:2 },
    { item_no:4, check_code:"05.04", label:"Altura do FC sobre o carril (HFC)", method:"Vareta calibrada / medição directa", acceptance_criteria:"LP10: 5,50 m nominal · Mín: 4,80 m · Máx: 6,00 m", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Regulação", phase_no:3 },
    { item_no:5, check_code:"05.05", label:"Abertura (desvio lateral do FC do eixo da via)", method:"Medição directa", acceptance_criteria:"LP10: nominal 1,40 m · Máx 400 mm desvio (GR.IT.CAT.005)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Regulação", phase_no:3 },
    { item_no:6, check_code:"05.06", label:"Tensão mecânica do FC (dinamómetro)", method:"Dinamómetro", acceptance_criteria:"BC-107: 1000 kgf LP10 · 800 kgf LCS", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Regulação", phase_no:3 },
    { item_no:7, check_code:"05.07", label:"Tensão mecânica do CS (dinamómetro)", method:"Dinamómetro", acceptance_criteria:"Bz II 65 mm²: 1000 kgf", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Regulação", phase_no:3 },
    { item_no:8, check_code:"05.08", label:"Pêndulos: espaçamento e verticalidade", method:"Medição + visual", acceptance_criteria:"Espaçamento ≤ 9,00 m · pêndulo vertical", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Regulação", phase_no:3 },
    { item_no:9, check_code:"05.09", label:"Isolamento da catenária (megóhmetro) antes de energizar", method:"Megóhmetro EME-PF17A-012", acceptance_criteria:"≥ valor especificado pela IP · sem pontos de fuga", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Ensaios", phase_no:4, test_pe_code:"PE-PF17A-012" },
    { item_no:10, check_code:"05.10", label:"Gabarit de segurança: verificação de elementos próximos da catenária", method:"Gabarit físico / medição topográfica", acceptance_criteria:"Distâncias mínimas EN 50122-1 em toda a extensão", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Ensaios", phase_no:4 },
  ],
};

// ── PPI-06 RCT+TP ─────────────────────────────────────────────────────────────
const PPI_06: SeedTemplate = {
  code: "PPI-PF17A-06",
  disciplina: "instalacoes",
  title: "RCT + TP — Retorno Corrente de Tracção e Terra de Protecção",
  description: "Controlo de CDTE, CDTA, LEAE, LTI, elétrodos de terra e resistência de terra. EN 50122-1.",
  items: [
    { item_no:1, check_code:"06.01", label:"CDTE: tipo de cabo (barra aço cobreado 105 mm²/LXV 70 mm²) e PAME aprovado", method:"Visual + documento PAME", acceptance_criteria:"Conforme Rel. Interoperabilidade ENE · PAME aprovado", ipt_e:"hp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"CDTE", phase_no:1 },
    { item_no:2, check_code:"06.02", label:"CDTE enterrado: profundidade e leito de areia", method:"Medição + visual", acceptance_criteria:"≥ 600 mm profundidade · 100 mm areia sob e sobre", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"CDTE", phase_no:1 },
    { item_no:3, check_code:"06.03", label:"Soldaduras aluminotérmicas do CDTE: qualificação do soldador e método", method:"Certificado qualificação + US antes de enterrar", acceptance_criteria:"EN 14587-1 · soldador certificado · resultado US antes de enterrar", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"CDTE", phase_no:1 },
    { item_no:4, check_code:"06.04", label:"CDTA: cabo aéreo alumínio/aço 93,3 mm² — fixação nos postes", method:"Visual + medição", acceptance_criteria:"Conforme projecto · fixações adequadas ao tipo de poste", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"CDTA", phase_no:2 },
    { item_no:5, check_code:"06.05", label:"LEAE (ligação equipotencial CDTA↔CDTE): localização e execução", method:"Visual + medição", acceptance_criteria:"Posições conforme GR.IT.GER.002.v06 · secção conforme projecto", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Ligações", phase_no:3 },
    { item_no:6, check_code:"06.06", label:"LTI (ligação transversal CDTE↔CDTA↔carris): localização e execução", method:"Visual + medição", acceptance_criteria:"Posições conforme projecto · ligação ao carril com grampo aprovado", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Ligações", phase_no:3 },
    { item_no:7, check_code:"06.07", label:"Elétrodo de terra: tipo, profundidade e ligação ao CDTE", method:"Visual + registo topográfico", acceptance_criteria:"Conforme projecto · registo topográfico da posição", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Terras", phase_no:4 },
    { item_no:8, check_code:"06.08", label:"Ligação de todos os elementos metálicos (postes, vedações, estruturas) ao sistema de terras", method:"Visual 100%", acceptance_criteria:"100% dos elementos no corredor ferroviário ligados", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Terras", phase_no:4 },
    { item_no:9, check_code:"06.09", label:"Ensaio de resistência de terra (terrômetro EME-PF17A-010)", method:"Terrômetro", acceptance_criteria:"Valor conforme EN 50122-1 · resultado registado em BE-CAMPO", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Ensaios", phase_no:5, test_pe_code:"PE-PF17A-011" },
    { item_no:10, check_code:"06.10", label:"Tensão de toque: verificação de cálculo ou medição", method:"Cálculo / medição", acceptance_criteria:"≤ 60 V condições normais (EN 50122-1 §9.2.2.2)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Ensaios", phase_no:5 },
    { item_no:11, check_code:"06.11", label:"Continuidade longitudinal do CDTE ao longo de toda a extensão instalada", method:"Multímetro", acceptance_criteria:"Sem interrupções · medição de continuidade com multímetro", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Ensaios", phase_no:5 },
    { item_no:12, check_code:"06.12", label:"Inspecção final antes da energização: sistema completo e conforme", method:"Inspecção 100% + assinatura", acceptance_criteria:"TODAS as ligações verificadas · TQ + IP aprovam antes de energizar ⚡", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Ensaios", phase_no:5, doc_record:"Auto de energização" },
  ],
};

// ── PPI-07 S&T ────────────────────────────────────────────────────────────────
const PPI_07: SeedTemplate = {
  code: "PPI-PF17A-07",
  disciplina: "instalacoes",
  title: "Sinalização Ferroviária, S&T e Supressão PN PK 31+670",
  description: "Controlo de desactivação S&T, levantamento de equipamentos, ensaios de AMVs, encravamento com IP e auto DC01.",
  items: [
    { item_no:1, check_code:"07.01", label:"PSR Cachofarra operacional antes de iniciar a supressão do PN", method:"Verificação CK-PSR aprovada", acceptance_criteria:"HP obrigatório — CK-PSR verificada e aprovada · DC01 ⚡", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Pré-condições", phase_no:1, doc_record:"ATA-Q PSR" },
    { item_no:2, check_code:"07.02", label:"Autorização escrita da IP para corte de tensão e desactivação S&T", method:"Documento", acceptance_criteria:"ICS 203/14 · autorização recebida antes de iniciar", ipt_e:"hp", ipt_f:"rp", ipt_ip:"hp", evidence_required:true, phase_name:"Pré-condições", phase_no:1 },
    { item_no:3, check_code:"07.03", label:"Desactivação dos equipamentos do PN: motores, sinais, anúncios, armários", method:"Teste funcional", acceptance_criteria:"Todos os equipamentos desactivados e testados como inativos", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Desactivação", phase_no:2 },
    { item_no:4, check_code:"07.04", label:"Levantamento físico: maciços, armários, caminho de cabos, postes S&T", method:"Inventário de campo", acceptance_criteria:"100% dos equipamentos levantados e inventariados", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Levantamento", phase_no:3 },
    { item_no:5, check_code:"07.05", label:"Segregação dos materiais reutilizáveis para entrega ao CLE Entroncamento", method:"Inventário + guias GR.IT.022", acceptance_criteria:"Conforme GR.IT.022 · guias de entrega preparadas", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Levantamento", phase_no:3 },
    { item_no:6, check_code:"07.06", label:"Fecho da via rodoviária no PN: sinalização temporária e barreiras", method:"Visual + regulamentação", acceptance_criteria:"Sinalização CE · acesso vedado antes de iniciar levantamento de lajetas", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Levantamento", phase_no:3 },
    { item_no:7, check_code:"07.07", label:"Levantamento das lajetas do PN: sem danos na via-férrea", method:"Visual durante levantamento", acceptance_criteria:"Lajetas removidas sem danificar carril nem balastro", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Levantamento", phase_no:3 },
    { item_no:8, check_code:"07.08", label:"Ensaios funcionais de AMVs afectados: funcionamento em todos os estados", method:"Teste funcional", acceptance_criteria:"100% AMVs novos ou alterados testados", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Ensaios", phase_no:4 },
    { item_no:9, check_code:"07.09", label:"Ensaio de encravamento com a IP: aprovação formal do Centro de Gestão", method:"Ensaio com presença IP", acceptance_criteria:"Ensaio realizado com presença IP · relatório de encravamento assinado", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Ensaios", phase_no:4, doc_record:"Relatório encravamento" },
    { item_no:10, check_code:"07.10", label:"Sinalização rodoviária definitiva do novo percurso R1", method:"Visual", acceptance_criteria:"Conforme Vol.06 PE_01_06_301–313 · inspecção TQ + câmara", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:5 },
    { item_no:11, check_code:"07.11", label:"Auto de conclusão DC01: assinado DO + Fiscalização dentro de 168 dias", method:"Documento", acceptance_criteria:"Data de conclusão DC01: ≤ dia 168 da consignação ⚡", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"DC01", phase_no:6, doc_record:"Auto DC01" },
    { item_no:12, check_code:"07.12", label:"Entrega dos materiais S&T ao CLE Entroncamento com guias GR.IT.022", method:"Guias assinadas", acceptance_criteria:"Guias assinadas · cópias arquivadas no DFO Vol. II", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"DC01", phase_no:6, doc_record:"Guias CLE" },
  ],
};

// ── PPI-08 Obras de Arte ──────────────────────────────────────────────────────
const PPI_08: SeedTemplate = {
  code: "PPI-PF17A-08",
  disciplina: "estruturas",
  title: "Torres GSM-R, Edificações e Iluminação (Tomos 8.1 e 8.2)",
  description: "Controlo de muros de suporte M31.1–M32.1, PH-32.1-CH, vala trapezoidal e obras de arte correntes.",
  items: [
    { item_no:1, check_code:"08.01", label:"Escavação e solo de fundação: cota e capacidade de carga verificadas", method:"Topografia + geotécnico", acceptance_criteria:"±20 mm · geotécnico presente · registo fotográfico antes de betonar", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1 },
    { item_no:2, check_code:"08.02", label:"Betão de limpeza: espessura e classe", method:"Medição + visual", acceptance_criteria:"C12/15 · ≥ 50 mm espessura", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Fundações", phase_no:1 },
    { item_no:3, check_code:"08.03", label:"Armadura de fundação: diâmetros, espaçamentos, recobrimentos", method:"Medição directa", acceptance_criteria:"A500NR SD · recobrimento ≥ 30 mm (XC2) ou ≥ 40 mm (XC3)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1 },
    { item_no:4, check_code:"08.04", label:"Cofragem: dimensões internas, estanqueidade, desmoldante", method:"Medição + visual", acceptance_criteria:"Tolerância EN 13670 Classe 2", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Estrutura", phase_no:2 },
    { item_no:5, check_code:"08.05", label:"Betonagem das fundações: slump, T°, colheita provetes", method:"Ensaio fresco", acceptance_criteria:"C25/30 XC2 · 1 série (3 cil.) por fase · slump ±30 mm", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Fundações", phase_no:1, test_pe_code:"PE-PF17A-008" },
    { item_no:6, check_code:"08.06", label:"Armadura do fuste do muro/tabuleiro: diâmetros, espaçamentos, recobrimentos", method:"Medição directa", acceptance_criteria:"Conforme projecto Vol.01.08 · recobrimento ≥ 40 mm", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Estrutura", phase_no:2 },
    { item_no:7, check_code:"08.07", label:"Betonagem do fuste/tabuleiro: vibração, ausência de segregação", method:"Visual durante betonagem", acceptance_criteria:"C30/37 XC3 · sem ninhos · cura ≥ 7 dias", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Estrutura", phase_no:2, test_pe_code:"PE-PF17A-008" },
    { item_no:8, check_code:"08.08", label:"Verificação pós-descofragem: dimensional e visual", method:"Inspecção 100%", acceptance_criteria:"Prumo ≤ 10 mm/m · sem ninhos · defeitos tratados antes de aterrar", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:9, check_code:"08.09", label:"Aterro atrás do muro: material drenante e compactação", method:"Visual + gamagrafia", acceptance_criteria:"Material drenante nas 1as camadas · ≥ 95% PM · drenos livres", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:10, check_code:"08.10", label:"Inspecção final: cota topo, prumo, alinhamento, drenos", method:"Topografia + visual", acceptance_criteria:"±20 mm cota · prumo ≤ 10 mm/m · 100% drenos desobstruídos", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Acabamentos", phase_no:3 },
    { item_no:11, check_code:"08.11", label:"PH-32.1-CH — folga de 2 m da fila do carril confirmada topograficamente", method:"Topografia", acceptance_criteria:"Folga ≥ 2 m para T=100 anos ⚡ HP obrigatório", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Acabamentos", phase_no:3 },
    { item_no:12, check_code:"08.12", label:"Coletor C.10 DN800: cota de descarga verificada", method:"Levantamento topográfico", acceptance_criteria:"Cota 1,721 m (nota: 0,279 m abaixo preia-mar máxima — risco manutenção)", ipt_e:"hp", ipt_f:"hp", ipt_ip:"rp", evidence_required:true, phase_name:"Acabamentos", phase_no:3 },
  ],
};

// ── PPI-09 Construção Civil ───────────────────────────────────────────────────
const PPI_09: SeedTemplate = {
  code: "PPI-PF17A-09",
  disciplina: "outros",
  title: "Telecomunicações e Caminho de Cabos (Tomo 6.2)",
  description: "Controlo de plataformas de passageiros, salas técnicas, vedações e iluminação R1.",
  items: [
    { item_no:1, check_code:"09.01", label:"Implantação topográfica: cota e alinhamento da plataforma de passageiros", method:"Topografia", acceptance_criteria:"Tolerância ±20 mm · paralela ao eixo da via", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Implantação", phase_no:1 },
    { item_no:2, check_code:"09.02", label:"Gabarit cinemático respeitado: nenhum elemento da plataforma invade espaço dos veículos", method:"Gabarit físico ou medição topográfica", acceptance_criteria:"Verificação com gabarit físico ou medição topográfica", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Estrutura", phase_no:2 },
    { item_no:3, check_code:"09.03", label:"Cota da plataforma: folga ao carril conforme TSI PRM (acessibilidade)", method:"Medição directa", acceptance_criteria:"Conforme projecto Vol.09 CC · TSI PRM aplicável", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Estrutura", phase_no:2 },
    { item_no:4, check_code:"09.04", label:"Estrutura em betão: armadura e betonagem conforme PPI-11", method:"Ver PPI-11", acceptance_criteria:"C25/30 XC3 conforme projecto · recobrimento ≥ 40 mm", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Estrutura", phase_no:2 },
    { item_no:5, check_code:"09.05", label:"Pavimento antiderrapante: coeficiente de atrito", method:"Ensaio pendular", acceptance_criteria:"Conforme especificação do projecto", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:6, check_code:"09.06", label:"Marcações tácteis: guia de circulação e alerta no bordo da plataforma", method:"Visual + medição", acceptance_criteria:"Conforme DL 163/2006 e projecto", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:7, check_code:"09.07", label:"Guarda-corpos: altura e fixação", method:"Medição directa", acceptance_criteria:"≥ 1,10 m em zonas com queda ≥ 0,50 m", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:8, check_code:"09.08", label:"Sala técnica — estanqueidade da cobertura (após 24h de chuva)", method:"Inspecção visual 24h após chuva", acceptance_criteria:"Sem infiltrações · ventilação conforme projecto", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:9, check_code:"09.09", label:"Vedações do DPF: tipo, altura e fixação", method:"Visual + medição", acceptance_criteria:"Conforme projecto · sem aberturas > 100 mm junto à linha electrificada", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:3 },
    { item_no:10, check_code:"09.10", label:"Iluminação pública R1: postes, alturas, espaçamento e ensaio eléctrico", method:"Medição + ensaio", acceptance_criteria:"Conforme PE_01_06_501/502 · ensaio continuidade e isolamento", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Acabamentos", phase_no:3 },
  ],
};

// ── PPI-10 Passagens de Nível ─────────────────────────────────────────────────
const PPI_10: SeedTemplate = {
  code: "PPI-PF17A-10",
  disciplina: "outros",
  title: "Reposição de Serviços Afectados (Água, Gás, Telecom, Eléctrica)",
  description: "Controlo de adaptação e verificação dos PNs afectados pela obra (excluindo PN PK 31+670 tratado em PPI-07).",
  items: [
    { item_no:1, check_code:"10.01", label:"Inventário de campo: todos os PNs no troço PK 29+730 a PK 33+700 identificados", method:"Visita de campo + Vol.08 S&T", acceptance_criteria:"Visita de campo + confronto com Vol.08 S&T", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Inventário", phase_no:1 },
    { item_no:2, check_code:"10.02", label:"Autorização escrita da Fiscalização para trabalhos junto ao PN", method:"Documento", acceptance_criteria:"CE Cl.ª 5.ª §5 · autorização recebida antes de iniciar", ipt_e:"hp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Pré-condições", phase_no:2 },
    { item_no:3, check_code:"10.03", label:"Sinalização ferroviária adaptada conforme RGS e Vol.08 S&T", method:"Inspecção visual", acceptance_criteria:"Sinais, barreiras e anúncios ajustados à nova geometria", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Adaptação", phase_no:3 },
    { item_no:4, check_code:"10.04", label:"Ensaio funcional do PN adaptado (todos os modos de operação)", method:"Teste funcional", acceptance_criteria:"100% dos estados testados · resultado conforme RGS", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Ensaios", phase_no:4 },
    { item_no:5, check_code:"10.05", label:"Pavimento do cruzamento: nivelado com o plano de carris", method:"Medição directa", acceptance_criteria:"Desnível ≤ 20 mm · lajetas sem ressaltos nem empenamentos", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:5 },
    { item_no:6, check_code:"10.06", label:"Sinalização rodoviária: sinais A14, stop/cedência, marcações", method:"Visual", acceptance_criteria:"Conforme Código da Estrada DL 44/2005", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:5 },
    { item_no:7, check_code:"10.07", label:"Visibilidade rodoviária: distância de visibilidade adequada em ambos os sentidos", method:"Medição campo", acceptance_criteria:"Conforme velocidade de aproximação · nenhuma obstrução nova", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:5 },
    { item_no:8, check_code:"10.08", label:"Aprovação formal da IP (Centro Gestão Rede) antes de retomar circulação", method:"Documento", acceptance_criteria:"Aprovação escrita recebida e arquivada · HP obrigatório ⚡", ipt_e:"hp", ipt_f:"hp", ipt_ip:"hp", evidence_required:true, phase_name:"Aprovação", phase_no:6, doc_record:"Aprovação IP CGR" },
    { item_no:9, check_code:"10.09", label:"Registo fotográfico do estado final antes e depois da adaptação", method:"Fotografia", acceptance_criteria:"Arquivo no ATLAS com data e referência de cada PN", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", evidence_required:true, phase_name:"Acabamentos", phase_no:5 },
    { item_no:10, check_code:"10.10", label:"Se nenhum PN adicional ao PK 31+670 for identificado — registo formal e encerramento", method:"Documento", acceptance_criteria:"Verificação A.1 concluída · assinatura TQ + Fiscalização", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Encerramento", phase_no:7, doc_record:"Auto encerramento PPI-10" },
  ],
};

// ── PPI-11 Betão Estrutural ───────────────────────────────────────────────────
const PPI_11: SeedTemplate = {
  code: "PPI-PF17A-11",
  disciplina: "betao",
  title: "Betão Estrutural — Controlo Detalhado de Produção e Betonagem",
  description: "PPI transversal a todas as betonagens estruturais. Aplica-se a qualquer elemento de betão armado da obra.",
  items: [
    { item_no:1, check_code:"11.01", label:"Betão conforme PAME: guia de entrega verificada (classe, exposição, W/C, hora)", method:"Guia de entrega", acceptance_criteria:"Guia conforme PAME aprovado · máx. 90 min da produção", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Recepção", phase_no:1 },
    { item_no:2, check_code:"11.02", label:"Slump (abaixamento) — medido na descarga da autobetoneira", method:"Ensaio slump EN 12350-2", acceptance_criteria:"Dentro da gama da PAME ±30 mm", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Recepção", phase_no:1, test_pe_code:"PE-PF17A-008" },
    { item_no:3, check_code:"11.03", label:"Temperatura do betão fresco", method:"Termómetro calibrado", acceptance_criteria:"5 °C ≤ T ≤ 35 °C", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Recepção", phase_no:1 },
    { item_no:4, check_code:"11.04", label:"Cofragem: dimensões, estanqueidade, limpeza interior, desmoldante", method:"Inspecção visual + medição", acceptance_criteria:"Conforme projecto · tolerância EN 13670 Classe 2", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Preparação", phase_no:2 },
    { item_no:5, check_code:"11.05", label:"Armadura: diâmetros, espaçamentos e recobrimentos (antes de fechar cofragem)", method:"Medição directa", acceptance_criteria:"Conforme projecto · recobrimento: XC2≥30mm · XC3≥40mm", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Preparação", phase_no:2 },
    { item_no:6, check_code:"11.06", label:"Distanciadores colocados em todas as faces e em quantidade suficiente", method:"Visual", acceptance_criteria:"Mín. 4 distanciadores/m² na armadura horizontal", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Preparação", phase_no:2 },
    { item_no:7, check_code:"11.07", label:"Colheita de provetes cilíndricos (frequência conforme PPI-11 Sec.3)", method:"EN 12390-1", acceptance_criteria:"1 série (3 cil. 150×300) por ocorrência definida", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Betonagem", phase_no:3, test_pe_code:"PE-PF17A-008" },
    { item_no:8, check_code:"11.08", label:"Vibração adequada durante a betonagem", method:"Visual durante betonagem", acceptance_criteria:"Sem segregação visível · sem toque nas armaduras", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Betonagem", phase_no:3 },
    { item_no:9, check_code:"11.09", label:"Cura após descofragem", method:"Inspecção visual + medição tempo", acceptance_criteria:"XC2: ≥ 3 dias · XC3/XD1: ≥ 7 dias húmido", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Cura", phase_no:4 },
    { item_no:10, check_code:"11.10", label:"Verificação pós-descofragem: sem ninhos de brita, fissuras ou defeitos", method:"Inspecção visual 100%", acceptance_criteria:"Inspecção visual 100% · qualquer defeito → RNC + consulta projectista", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Acabamentos", phase_no:5 },
  ],
};

// ── PPI-12 Caminho de Cabos ───────────────────────────────────────────────────
const PPI_12: SeedTemplate = {
  code: "PPI-PF17A-12",
  disciplina: "instalacoes",
  title: "Caminho de Cabos, BT e Telecomunicações (Tomo 6.2)",
  description: "Controlo de instalação de caleiras, cabos S&T/FO/BT, atravessamentos, ensaios de isolamento e OTDR.",
  items: [
    { item_no:1, check_code:"12.01", label:"Autorização escrita F/IP para trabalhos junto a cabos em exploração", method:"Documento", acceptance_criteria:"CE Cl.ª 5.ª §5 · autorização recebida antes de iniciar", ipt_e:"hp", ipt_f:"rp", ipt_ip:"hp", evidence_required:true, phase_name:"Pré-condições", phase_no:1 },
    { item_no:2, check_code:"12.02", label:"Levantamento de cabos existentes em exploração: inventário completo", method:"Levantamento de campo", acceptance_criteria:"Listagem com tipo, função, localização e marcação no terreno", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Pré-condições", phase_no:1 },
    { item_no:3, check_code:"12.03", label:"Caleiras: localização conforme PE_06_02_003/004/005 e separação entre circuitos", method:"Visual + medição", acceptance_criteria:"Separação S&T/Telecom/BT/Catenária conforme PE_06_02_002 e EN 50122-1", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Caleiras", phase_no:2 },
    { item_no:4, check_code:"12.04", label:"Caleiras: pendente ≥ 0,2% e fixações a cada ≤ 0,6 m", method:"Verificação visual + nível", acceptance_criteria:"Verificação visual + medição com nível", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Caleiras", phase_no:2 },
    { item_no:5, check_code:"12.05", label:"Vala de cablagem: profundidade e leito de areia", method:"Medição directa", acceptance_criteria:"BT ≥ 700 mm · atravessamento via ≥ 1500 mm · areia 100 mm sob e sobre", ipt_e:"hp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Cablagem", phase_no:3 },
    { item_no:6, check_code:"12.06", label:"Atravessamento da via-férrea: método (trado/vala em corte) e profundidade", method:"Visual + medição", acceptance_criteria:"Conforme PE_06_02_002 · tubo PEAD ⌀ ≥ 1,5× cabo", ipt_e:"hp", ipt_f:"hp", ipt_ip:"na", evidence_required:true, phase_name:"Cablagem", phase_no:3 },
    { item_no:7, check_code:"12.07", label:"Cabos instalados: raio de curvatura mínimo respeitado em toda a extensão", method:"Inspecção visual", acceptance_criteria:"≥ 10× ⌀ ext. (BT) · ≥ 20× ⌀ ext. (fibra óptica)", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Cablagem", phase_no:3 },
    { item_no:8, check_code:"12.08", label:"Etiquetagem dos cabos: em cada extremidade e a cada 5 m", method:"Visual", acceptance_criteria:"Código cabo conforme Tomo 6.2 · origem e destino legíveis", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", phase_name:"Cablagem", phase_no:3 },
    { item_no:9, check_code:"12.09", label:"Ensaio de isolamento (megóhmetro EME-012) em 100% dos cabos BT e S&T", method:"Megóhmetro a 500V DC", acceptance_criteria:"≥ 1 MΩ/km a 500 V DC · resultado em BE-CAMPO", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Ensaios", phase_no:4, test_pe_code:"PE-PF17A-013" },
    { item_no:10, check_code:"12.10", label:"Ensaio OTDR em cada troço de fibra óptica (EME-014)", method:"OTDR", acceptance_criteria:"Atenuação conforme Tomo 6.2 · sem reflexões anómalas · HP ⚡", ipt_e:"hp", ipt_f:"hp", ipt_ip:"wp", evidence_required:true, phase_name:"Ensaios", phase_no:4, test_pe_code:"PE-PF17A-014" },
    { item_no:11, check_code:"12.11", label:"Inspecção final: tampas, ligações à terra, fita de sinalização", method:"Visual 100%", acceptance_criteria:"100% percurso inspeccionado · registo fotográfico", ipt_e:"rp", ipt_f:"wp", ipt_ip:"na", evidence_required:true, phase_name:"Acabamentos", phase_no:5 },
    { item_no:12, check_code:"12.12", label:"Verificação diária dos cabos em exploração durante os trabalhos", method:"Visual diário", acceptance_criteria:"Sem danos visíveis · protecções intactas · registo no diário de obra", ipt_e:"rp", ipt_f:"rp", ipt_ip:"na", phase_name:"Diário", phase_no:0 },
  ],
};

// ── All templates ─────────────────────────────────────────────────────────────
const ALL_TEMPLATES: SeedTemplate[] = [
  PPI_01, PPI_02, PPI_03, PPI_04, PPI_05, PPI_06,
  PPI_07, PPI_08, PPI_09, PPI_10, PPI_11, PPI_12,
];

// ── Service ───────────────────────────────────────────────────────────────────
export const ppiSeedService = {
  async seedAllTemplates(
    projectId: string,
    userId: string,
  ): Promise<{ created: number; skipped: number; itemsCreated: number }> {
    let created = 0;
    let skipped = 0;
    let itemsCreated = 0;

    for (const def of ALL_TEMPLATES) {
      const { data: existing } = await supabase
        .from("ppi_templates")
        .select("id")
        .eq("project_id", projectId)
        .eq("code", def.code)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const tmpl = await ppiService.createTemplate({
        project_id:  projectId,
        code:        def.code,
        disciplina:  def.disciplina,
        title:       def.title,
        description: def.description,
        created_by:  userId,
      });

      const itemInputs: PpiTemplateItemInput[] = def.items.map((it) => ({
        template_id:         tmpl.id,
        item_no:             it.item_no,
        check_code:          it.check_code,
        label:               it.label,
        method:              it.method              ?? null,
        acceptance_criteria: it.acceptance_criteria ?? null,
        inspection_point_type: it.ipt_e             ?? "rp",
        ipt_e:               it.ipt_e              ?? "rp",
        ipt_f:               it.ipt_f              ?? "wp",
        ipt_ip:              it.ipt_ip             ?? "na",
        required:            true,
        evidence_required:   it.evidence_required   ?? false,
        sort_order:          it.item_no,
        phase_name:          it.phase_name          ?? null,
        phase_no:            it.phase_no            ?? null,
        doc_record:          it.doc_record          ?? null,
        test_pe_code:        it.test_pe_code        ?? null,
      }));

      await ppiService.addTemplateItems(itemInputs);
      itemsCreated += itemInputs.length;
      created++;
    }

    return { created, skipped, itemsCreated };
  },

  getTemplateDefinitions(): { code: string; title: string; disciplina: string; itemCount: number }[] {
    return ALL_TEMPLATES.map((t) => ({
      code:       t.code,
      title:      t.title,
      disciplina: t.disciplina,
      itemCount:  t.items.length,
    }));
  },
};
