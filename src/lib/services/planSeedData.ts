/**
 * PF17A Project Execution Plans & Drawings Index
 * Extracted from: PF17A_PE_00_01_INDICE_GERAL_06032024
 * and PF17A_PE_00_02_ListaDesenhos_01
 *
 * Each entry represents a plan/drawing from the project execution dossier.
 */

export interface PlanSeedEntry {
  code: string;           // Codificação IP
  title: string;          // Designação
  plan_type: string;      // Mapped type
  discipline: string;     // Mapped discipline
  doc_reference: string;  // Nº SAP
  revision: string;       // Extracted from code suffix
  notes: string;          // Volume / Tomo context
  piece_type: "PE" | "PD"; // Peça Escrita or Peça Desenhada
}

function rev(code: string): string {
  const m = code.match(/_(\d{2})$/);
  return m ? m[1] : "00";
}

function docType(code: string): string {
  if (/_MDG_/.test(code) || /_MDJ/.test(code)) return "MS";
  if (/_PSS_/.test(code)) return "PlanSeg";
  if (/_PPGRCD_/.test(code)) return "PlanAmb";
  if (/_MQT_/.test(code) || /_MED/.test(code)) return "Other";
  if (/_DPU/.test(code)) return "Other";
  if (/_CTE/.test(code) || /_CT_/.test(code) || /_CTV_/.test(code)) return "Other";
  if (/_CAJ/.test(code)) return "Other";
  if (/_EGT/.test(code)) return "Other";
  if (/\d{3}_\d{2}$/.test(code) || /\d{3}_\d{1}$/.test(code)) return "Drawing";
  return "Other";
}

/** Full project plans index - 300+ entries */
export const PF17A_PLAN_SEED: PlanSeedEntry[] = [
  // ══════════════════════════════════════════════════════════════
  // VOLUME 00 – Projeto Geral
  // ══════════════════════════════════════════════════════════════

  // Tomo 0.1 – Caracterização Geral do Projeto
  { code: "PF17A_PE_00_01_MDG_00", title: "Memória Descritiva Geral", plan_type: "MS", discipline: "geral", doc_reference: "10004022804-323", revision: "00", notes: "Vol.00 Tomo 0.1 – Caracterização Geral do Projeto", piece_type: "PE" },
  { code: "PF17A_PE_00_01_MQT_00", title: "Mapa de Quantidades de Trabalho", plan_type: "Other", discipline: "geral", doc_reference: "10004022805-330", revision: "00", notes: "Vol.00 Tomo 0.1 – Caracterização Geral do Projeto", piece_type: "PE" },
  { code: "PF17A_PE_00_01_001", title: "Esboço Corográfico", plan_type: "Drawing", discipline: "geral", doc_reference: "10004022806", revision: "00", notes: "Vol.00 Tomo 0.1 – Caracterização Geral do Projeto", piece_type: "PD" },

  // Tomo 0.2 – Cartografia e Topografia
  { code: "PF17A_PE_00_02_MDJ_00", title: "Memória Descritiva e Justificativa", plan_type: "MS", discipline: "geral", doc_reference: "10003992970-323", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PE" },
  { code: "PF17A_PE_00_02_001_01", title: "Cartografia (folha 1 de 6)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992971-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_002_01", title: "Cartografia (folha 2 de 6)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992972-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_003_01", title: "Cartografia (folha 3 de 6)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992973-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_004_01", title: "Cartografia (folha 4 de 6)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992974-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_005_01", title: "Cartografia (folha 5 de 6)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992975-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_006_01", title: "Cartografia (folha 6 de 6)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992976-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_020_00", title: "Perfis Transversais 1 - PT1 pk 29+800,19 a PT6 pk 29+924,73", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992977-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_021_00", title: "Perfis Transversais 1 - PT7 pk 29+950,31 a PT12 pk 30+074,73", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992978-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_022_00", title: "Perfis Transversais 1 - PT13 pk 30+099,93 a PT22 pk 30+323,25", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992979-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_023_00", title: "Perfis Transversais 1 - PT23 pk 30+345,50 a PT33 pk 30+598,32", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992980-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_024_00", title: "Perfis Transversais 1 - PT34 pk 30+623,58 a PT45 pk 30+898,88", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992981-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_025_00", title: "Perfis Transversais 1 - PT46 pk 30+926,94 a PT57 pk 31+202,69", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992982-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_026_00", title: "Perfis Transversais 1 - PT58 pk 31+225,90 a PT68 pk 31+476,46", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992983-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_027_00", title: "Perfis Transversais 1 - PT69 pk 31+501,65 a PT80 pk 31+803,44", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992984-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_028_00", title: "Perfis Transversais 1 - PT81 pk 31+827,46 a PT86 pk 31+953,64", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992985-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_029_00", title: "Perfis Transversais 1 - PT87 pk 31+979,01 a PT92 pk 32+104,48", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992986-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_030_00", title: "Perfis Transversais 1 - PT93 pk 32+127,07 a PT98 pk 32+252,93", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992987-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_031_00", title: "Perfis Transversais 1 - PT99 pk 32+278,05 a PT104 pk 32+403,43", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992988-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_032_00", title: "Perfis Transversais 1 - PT105 pk 32+429,08 a PT111 pk 32+578,59", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992989-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_033_00", title: "Perfis Transversais 1 - PT112 pk 32+603,28 a PT120 pk 32+801,73", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992990-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_034_00", title: "Perfis Transversais 1 - PT121 pk 32+821,93 a PT129 pk 33+025,37", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992991-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_035_00", title: "Perfis Transversais 1 - PT130 pk 33+050,29 a PT137 pk 33+224,74", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992992-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_036_00", title: "Perfis Transversais 1 - PT138 pk 33+250,93 a PT147 pk 33+475,27", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992993-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_037_00", title: "Perfis Transversais 1 - PT148 pk 33+498,40 a PT156 pk 33+698,04", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992994-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_050_00", title: "Perfis Transversais 2 - PT52 pk 31+075 a PT56 pk 31+177", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992995-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_051_00", title: "Perfis Transversais 2 - PT57 pk 31+203 a PT61 pk 31+302", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992996-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_052_00", title: "Perfis Transversais 2 - PT62 pk 31+326 a PT66 pk 31+423", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992997-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_053_00", title: "Perfis Transversais 2 - PT67 pk 31+449 a PT69 pk 31+502", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992998-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_054_00", title: "Perfis Transversais 2 - PT70 pk 31+526 a PT71 pk 31+551", plan_type: "Drawing", discipline: "geral", doc_reference: "10003992999-317", revision: "00", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_070_01", title: "Levantamento Topográfico - Restabelecimento 1 (folha 1 de 2)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003993000-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_071_01", title: "Levantamento Topográfico - Restabelecimento 1 (folha 2 de 2)", plan_type: "Drawing", discipline: "geral", doc_reference: "10003993001-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },
  { code: "PF17A_PE_00_02_072_01", title: "Levantamento Topográfico - Viaduto Av. Jaime Rebelo", plan_type: "Drawing", discipline: "geral", doc_reference: "10003993002-317", revision: "01", notes: "Vol.00 Tomo 0.2 – Cartografia e Topografia", piece_type: "PD" },

  // Tomo 0.3.1
  { code: "PF17B_PE_00_0301_PERJAIA", title: "Apreciação Prévia para Decisão de Sujeição a AIA", plan_type: "Other", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.3.1 – Enquadramento AIA", piece_type: "PE" },
  { code: "PF17B_PE_00_0302_PEA", title: "Pedido de Elementos Adicionais", plan_type: "Other", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.3.1 – Enquadramento AIA", piece_type: "PE" },
  { code: "PF17B_PE_00_0303_APA", title: "Parecer APA", plan_type: "Other", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.3.1 – Enquadramento AIA", piece_type: "PE" },

  // Tomo 0.3.2
  { code: "PF17A_PE_00_030201_MDJ", title: "Estudo de Proteção Acústica - Ruído e Vibrações", plan_type: "MS", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.3.2 – Medidas de Minimização", piece_type: "PE" },
  { code: "PF17A_PE_00_030202_MDJ", title: "Caracterização do Património Cultural", plan_type: "MS", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.3.2 – Medidas de Minimização", piece_type: "PE" },

  // Tomo 0.6.1 / 0.6.2
  { code: "PF17A_PE_00_0601_MDJ", title: "Domínio Público Hídrico", plan_type: "MS", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.6.1 – Domínio Público Hídrico", piece_type: "PE" },
  { code: "PF17A_PE_00_0602_MDJ", title: "Reserva Ecológica Nacional", plan_type: "MS", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.6.2 – Reserva Ecológica Nacional", piece_type: "PE" },

  // Tomo 0.7
  { code: "PF17A_PE_00_07_PPGRCD_00", title: "Plano de Prevenção e Gestão de Resíduos de Construção e Demolição", plan_type: "PlanAmb", discipline: "ambiente", doc_reference: "", revision: "00", notes: "Vol.00 Tomo 0.7 – PPGRCD", piece_type: "PE" },

  // Tomo 0.8
  { code: "PF17A_PE_00_08_PSS_03", title: "Plano de Segurança e Saúde", plan_type: "PlanSeg", discipline: "geral", doc_reference: "10003740986-334", revision: "03", notes: "Vol.00 Tomo 0.8 – PSS / Compilação Técnica", piece_type: "PE" },
  { code: "PF17A_PE_00_08_CT_02", title: "Compilação Técnica", plan_type: "Other", discipline: "geral", doc_reference: "10003740987-338", revision: "02", notes: "Vol.00 Tomo 0.8 – PSS / Compilação Técnica", piece_type: "PE" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 01 – Infraestrutura e Plataforma de Via Férrea
  // ══════════════════════════════════════════════════════════════

  // Tomo 1.1 – Plataforma de Via (Peças Escritas)
  { code: "PF17A_PE_01_01_MDJ_02", title: "Memória Descritiva e Justificativa", plan_type: "MS", discipline: "terras", doc_reference: "10003983868-323", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PE" },
  { code: "PF17A_PE_01_01_CT_02", title: "Condições Técnicas", plan_type: "Other", discipline: "terras", doc_reference: "10003983869-327", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PE" },
  { code: "PF17A_PE_01_01_DPU_02", title: "Definição de Preços Unitários", plan_type: "Other", discipline: "terras", doc_reference: "10003983871-332", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PE" },
  { code: "PF17A_PE_01_01_MED_02", title: "Medições Detalhadas", plan_type: "Other", discipline: "terras", doc_reference: "10003983870-331", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PE" },

  // Tomo 1.1 – Plataforma de Via (Peças Desenhadas - selection)
  { code: "PF17A_PE_01_01_001_02", title: "Planta Geral - Folha 1/3", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983872", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_002_02", title: "Planta Geral - Folha 2/3", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983873", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_003_02", title: "Planta Geral - Folha 3/3", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983874", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_004_02", title: "Planta e Perfil Longitudinal SADOPORT P4 km 0+000 ao km 0+500", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983875", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_005_02", title: "Planta e Perfil Longitudinal SADOPORT P4 km 0+500 ao km 0+623.596", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983876", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_006_02", title: "Planta e Perfil Longitudinal CACHOFARRA Linha Geral km 31+200 ao km 31+700", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983877", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_007_02", title: "Planta e Perfil Longitudinal CACHOFARRA Linha Geral km 31+700 ao km 32+200", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983878", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_008_02", title: "Planta e Perfil Longitudinal CACHOFARRA Linha Geral km 32+200 ao km 32+700", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983879", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_009_02", title: "Planta e Perfil Longitudinal CACHOFARRA Linha Geral km 32+700 ao km 33+200", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983880", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_010_02", title: "Planta e Perfil Longitudinal CACHOFARRA Linha Geral km 33+200 ao km 33+671.833", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983881", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_034_02", title: "Perfil Transversal Tipo - Via Única - Reta e Curva", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983905", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_035_02", title: "Perfil Transversal Tipo – Feixe Cachofarra – Reta e Curva", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983906", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_036_02", title: "Perfil Transversal Tipo - Via Betonada", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983907", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },
  { code: "PF17A_PE_01_01_037_02", title: "Pormenores Terraplenagem", plan_type: "Drawing", discipline: "terras", doc_reference: "10003983908", revision: "02", notes: "Vol.01 Tomo 1.1 – Plataforma de Via", piece_type: "PD" },

  // Tomo 1.2 – Drenagem (Peças Escritas)
  { code: "PF17A_PE_01_02_MDJ_03", title: "Memória Descritiva e Justificativa", plan_type: "MS", discipline: "drenagem", doc_reference: "10003965163-323", revision: "03", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PE" },
  { code: "PF17A_PE_01_02_MED_03", title: "Medições Detalhadas", plan_type: "Other", discipline: "drenagem", doc_reference: "10003965164-331", revision: "03", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PE" },
  { code: "PF17A_PE_01_02_DPU_00", title: "Definição de Preços Unitários", plan_type: "Other", discipline: "drenagem", doc_reference: "10003969497-332", revision: "00", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PE" },
  { code: "PF17A_PE_01_02_CTE_00", title: "Condições Técnicas Especiais", plan_type: "Other", discipline: "drenagem", doc_reference: "10003969496-328", revision: "00", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PE" },

  // Tomo 1.2 – Drenagem (Peças Desenhadas)
  { code: "PF17A_PE_01_02_001_03", title: "Bacias Hidrográficas", plan_type: "Drawing", discipline: "drenagem", doc_reference: "10003965167-317", revision: "03", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PD" },
  { code: "PF17A_PE_01_02_002_03", title: "Planta e Perfil Longitudinal Linha Geral km 31+200 ao km 31+700", plan_type: "Drawing", discipline: "drenagem", doc_reference: "10003965168-317", revision: "03", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PD" },
  { code: "PF17A_PE_01_02_008_03", title: "Passagens Hidráulicas", plan_type: "Drawing", discipline: "drenagem", doc_reference: "10003965174-317", revision: "03", notes: "Vol.01 Tomo 1.2 – Drenagem", piece_type: "PD" },

  // Tomo 1.4 – Vedações
  { code: "PF17A_PE_01_04_MDJ_01", title: "Memória Descritiva e Justificativa", plan_type: "MS", discipline: "geral", doc_reference: "10003965184", revision: "01", notes: "Vol.01 Tomo 1.4 – Vedações", piece_type: "PE" },
  { code: "PF17A_PE_01_04_MED_01", title: "Medições Detalhadas", plan_type: "Other", discipline: "geral", doc_reference: "10003965185", revision: "01", notes: "Vol.01 Tomo 1.4 – Vedações", piece_type: "PE" },
  { code: "PF17A_PE_01_04_CTE_00", title: "Condições Técnicas Especiais", plan_type: "Other", discipline: "geral", doc_reference: "10003969494", revision: "00", notes: "Vol.01 Tomo 1.4 – Vedações", piece_type: "PE" },
  { code: "PF17A_PE_01_04_DPU_00", title: "Definição de Preços Unitários", plan_type: "Other", discipline: "geral", doc_reference: "10003969495", revision: "00", notes: "Vol.01 Tomo 1.4 – Vedações", piece_type: "PE" },

  // Tomo 1.6 – Restabelecimentos (selection of key docs)
  { code: "PF17A_PE_01_06_MDJ", title: "Memória Descritiva e Justificativa - Restabelecimento 1", plan_type: "MS", discipline: "geral", doc_reference: "10003965117", revision: "05", notes: "Vol.01 Tomo 1.6 – Restabelecimentos", piece_type: "PE" },
  { code: "PF17A_PE_01_06_MED", title: "Medições Detalhadas - Restabelecimento 1", plan_type: "Other", discipline: "geral", doc_reference: "10003953213", revision: "04", notes: "Vol.01 Tomo 1.6 – Restabelecimentos", piece_type: "PE" },
  { code: "PF17A_PE_01_06_001", title: "Esboço Corográfico - Restabelecimento 1", plan_type: "Drawing", discipline: "geral", doc_reference: "10003965120", revision: "01", notes: "Vol.01 Tomo 1.6 – Restabelecimentos", piece_type: "PD" },
  { code: "PF17A_PE_01_06_101", title: "Restabelecimento 1 (PK 31+175) - Planta", plan_type: "Drawing", discipline: "geral", doc_reference: "10003965122", revision: "02", notes: "Vol.01 Tomo 1.6 – Restabelecimentos", piece_type: "PD" },

  // Tomo 1.7 – Geologia e Geotecnia
  { code: "PF17A_PE_01_07_EGT_02", title: "Estudo Geológico e Geotécnico", plan_type: "Other", discipline: "geotecnia", doc_reference: "10003983912-323", revision: "02", notes: "Vol.01 Tomo 1.7 – Geologia e Geotecnia", piece_type: "PE" },
  { code: "PF17A_PE_01_07_001_01", title: "Carta Geológica", plan_type: "Drawing", discipline: "geotecnia", doc_reference: "10003983914", revision: "01", notes: "Vol.01 Tomo 1.7 – Geologia e Geotecnia", piece_type: "PD" },

  // Tomo 1.8 – Muros de Suporte
  { code: "PF17A_PE_01_08_MDJ", title: "Memória Descritiva e Justificativa - Muros de Suporte", plan_type: "MS", discipline: "estruturas", doc_reference: "10003965193", revision: "03", notes: "Vol.01 Tomo 1.8 – Muros de Suporte", piece_type: "PE" },
  { code: "PF17A_PE_01_08_MED", title: "Medições Detalhadas - Muros de Suporte", plan_type: "Other", discipline: "estruturas", doc_reference: "10003965194", revision: "03", notes: "Vol.01 Tomo 1.8 – Muros de Suporte", piece_type: "PE" },
  { code: "PF17A_PE_01_08_001", title: "Planta e Alçado dos Muros M31.1 e M31.2", plan_type: "Drawing", discipline: "estruturas", doc_reference: "10003965198", revision: "03", notes: "Vol.01 Tomo 1.8 – Muros de Suporte", piece_type: "PD" },
  { code: "PF17A_PE_01_08_004", title: "Seções Tipo – Geometria e Armaduras", plan_type: "Drawing", discipline: "estruturas", doc_reference: "10003965201", revision: "02", notes: "Vol.01 Tomo 1.8 – Muros de Suporte", piece_type: "PD" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 02 – Infraestruturas de Obras de Arte
  // ══════════════════════════════════════════════════════════════

  // Tomo 2.4 – Passagens Hidráulicas
  { code: "PF17A_PE_02_04_MDJ", title: "Memória Descritiva e Justificativa - Passagens Hidráulicas", plan_type: "MS", discipline: "estruturas", doc_reference: "10003965202", revision: "02", notes: "Vol.02 Tomo 2.4 – Passagens Hidráulicas", piece_type: "PE" },
  { code: "PF17A_PE_02_04_005", title: "Betão Armado - Passagens Hidráulicas", plan_type: "Drawing", discipline: "estruturas", doc_reference: "10003965211", revision: "03", notes: "Vol.02 Tomo 2.4 – Passagens Hidráulicas", piece_type: "PD" },
  { code: "PF17A_PE_02_04_006", title: "Faseamento Construtivo - Passagens Hidráulicas", plan_type: "Drawing", discipline: "estruturas", doc_reference: "10003969376", revision: "01", notes: "Vol.02 Tomo 2.4 – Passagens Hidráulicas", piece_type: "PD" },

  // Tomo 2.5 – PS Rodoviárias
  { code: "PF17A_PE_02_05_MDJ", title: "Memória Descritiva e Justificativa - PS Rodoviárias", plan_type: "MS", discipline: "estruturas", doc_reference: "10003965212", revision: "02", notes: "Vol.02 Tomo 2.5 – PS Rodoviárias", piece_type: "PE" },
  { code: "PF17A_PE_02_05_CAJ", title: "Cálculos Justificativos - PS Rodoviárias", plan_type: "Other", discipline: "estruturas", doc_reference: "10003965213", revision: "04", notes: "Vol.02 Tomo 2.5 – PS Rodoviárias", piece_type: "PE" },
  { code: "PF17A_PE_02_05_001", title: "Desenho de Conjunto - PS Rodoviárias", plan_type: "Drawing", discipline: "estruturas", doc_reference: "10003965218", revision: "03", notes: "Vol.02 Tomo 2.5 – PS Rodoviárias", piece_type: "PD" },
  { code: "PF17A_PE_02_05_021", title: "Faseamento Construtivo - PS Rodoviárias", plan_type: "Drawing", discipline: "estruturas", doc_reference: "10003965238", revision: "00", notes: "Vol.02 Tomo 2.5 – PS Rodoviárias", piece_type: "PD" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 03 – Superestrutura de Via
  // ══════════════════════════════════════════════════════════════

  // Tomo 3.1 – Via Férrea
  { code: "PF17A_PE_03_01_MDJ_05", title: "Memória Descritiva e Justificativa - Via Férrea", plan_type: "MS", discipline: "ferrovia", doc_reference: "10003964467-323", revision: "05", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PE" },
  { code: "PF17A_PE_03_01_CAJ_03", title: "Cálculos Justificativos - Via Férrea", plan_type: "Other", discipline: "ferrovia", doc_reference: "10003964472-329", revision: "03", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PE" },
  { code: "PF17A_PE_03_01_CTV_02", title: "Condições Técnicas de Via", plan_type: "Other", discipline: "ferrovia", doc_reference: "10003964468-327", revision: "02", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PE" },
  { code: "PF17A_PE_03_01_DPU_04", title: "Definição de Preços Unitários - Via Férrea", plan_type: "Other", discipline: "ferrovia", doc_reference: "10003964469-332", revision: "04", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PE" },
  { code: "PF17A_PE_03_01_MED_06", title: "Medições Detalhadas - Via Férrea", plan_type: "Other", discipline: "ferrovia", doc_reference: "10003964471-331", revision: "06", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PE" },
  { code: "PF17A_PE_03_01_001", title: "Planta Geral - Via Férrea (1/3)", plan_type: "Drawing", discipline: "ferrovia", doc_reference: "10003964473", revision: "04", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PD" },
  { code: "PF17A_PE_03_01_023", title: "Perfil Transversal Tipo - Via Férrea (1/3)", plan_type: "Drawing", discipline: "ferrovia", doc_reference: "10003964496", revision: "05", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PD" },
  { code: "PF17A_PE_03_01_026", title: "Plano de Assentamento", plan_type: "Drawing", discipline: "ferrovia", doc_reference: "10003964499", revision: "05", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PD" },
  { code: "PF17A_PE_03_01_027", title: "Diagrama Unifilar", plan_type: "Drawing", discipline: "ferrovia", doc_reference: "10003964500", revision: "04", notes: "Vol.03 Tomo 3.1 – Via Férrea", piece_type: "PD" },

  // Tomo 3.4 – Faseamento Construtivo
  { code: "PF17A_PE_03_04_MDJ_08", title: "Memória Descritiva e Justificativa - Faseamento Construtivo", plan_type: "MS", discipline: "ferrovia", doc_reference: "10003965107-323", revision: "08", notes: "Vol.03 Tomo 3.4 – Faseamento Construtivo", piece_type: "PE" },
  { code: "PF17A_PE_03_04_MED_03", title: "Medições Detalhadas - Faseamento Construtivo", plan_type: "Other", discipline: "ferrovia", doc_reference: "10003965109-331", revision: "03", notes: "Vol.03 Tomo 3.4 – Faseamento Construtivo", piece_type: "PE" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 04 – Passagens de Nível
  // ══════════════════════════════════════════════════════════════
  { code: "PF17A_PE_04_MDJ_02", title: "Memória Descritiva e Justificativa - Passagens de Nível", plan_type: "MS", discipline: "ferrovia", doc_reference: "10003965939-323", revision: "02", notes: "Vol.04 – Passagens de Nível", piece_type: "PE" },
  { code: "PF17A_PE_04_DPU_01", title: "Definição de Preços Unitários - Passagens de Nível", plan_type: "Other", discipline: "ferrovia", doc_reference: "10003965940-332", revision: "01", notes: "Vol.04 – Passagens de Nível", piece_type: "PE" },
  { code: "PF17A_PE_04_001_02", title: "Planta - Passagens de Nível (1/2)", plan_type: "Drawing", discipline: "ferrovia", doc_reference: "10003965942", revision: "02", notes: "Vol.04 – Passagens de Nível", piece_type: "PD" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 06 – Telecomunicações
  // ══════════════════════════════════════════════════════════════
  { code: "PF17A_PE_06_02_MDJ_02", title: "Memória Descritiva e Justificativa - Telecomunicações", plan_type: "MS", discipline: "telecom", doc_reference: "10003998282-323", revision: "02", notes: "Vol.06 Tomo 6.2 – Infraestruturas de Telecomunicações", piece_type: "PE" },
  { code: "PF17A_PE_06_02_MED_02", title: "Medições Detalhadas - Telecomunicações", plan_type: "Other", discipline: "telecom", doc_reference: "10003998283-331", revision: "02", notes: "Vol.06 Tomo 6.2 – Infraestruturas de Telecomunicações", piece_type: "PE" },
  { code: "PF17A_PE_06_02_001_02", title: "Diagrama de Caminho de Cabos - Linha do Sul / Porto de Setúbal", plan_type: "Drawing", discipline: "telecom", doc_reference: "10003998285", revision: "02", notes: "Vol.06 Tomo 6.2 – Infraestruturas de Telecomunicações", piece_type: "PD" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 07 – Catenária e Energia de Tracção
  // ══════════════════════════════════════════════════════════════

  // Tomo 7.1 – Catenária
  { code: "PF17A_PE_07_01_MDJ_03", title: "Memória Descritiva e Justificativa - Catenária", plan_type: "MS", discipline: "catenaria", doc_reference: "10004078642", revision: "03", notes: "Vol.07 Tomo 7.1 – Catenária", piece_type: "PE" },
  { code: "PF17A_PE_07_01_CT_03", title: "Caderno de Encargos e Cláusulas Técnicas - Catenária", plan_type: "Other", discipline: "catenaria", doc_reference: "10004078645", revision: "03", notes: "Vol.07 Tomo 7.1 – Catenária", piece_type: "PE" },
  { code: "PF17A_PE_07_01_001_02", title: "Esquema Eléctrico - Catenária", plan_type: "Drawing", discipline: "catenaria", doc_reference: "10004078646", revision: "02", notes: "Vol.07 Tomo 7.1 – Catenária", piece_type: "PD" },
  { code: "PF17A_PE_07_01_101_04", title: "Planta de Piquetagem - Poste 30-33 a Poste 32-12 - Linha do Sul", plan_type: "Drawing", discipline: "catenaria", doc_reference: "10004078647", revision: "04", notes: "Vol.07 Tomo 7.1 – Catenária", piece_type: "PD" },

  // Tomo 7.3 – RCT + TP
  { code: "PF17A_PE_07_03_MDJ_02", title: "Memória Descritiva e Justificativa - RCT + TP", plan_type: "MS", discipline: "catenaria", doc_reference: "10004078663", revision: "02", notes: "Vol.07 Tomo 7.3 – RCT + TP", piece_type: "PE" },
  { code: "PF17A_PE_07_03_001_02", title: "Diagrama de RCT do km 30.900 ao km 31.600 - Linha do Sul", plan_type: "Drawing", discipline: "catenaria", doc_reference: "10004078667", revision: "02", notes: "Vol.07 Tomo 7.3 – RCT + TP", piece_type: "PD" },

  // ══════════════════════════════════════════════════════════════
  // VOLUME 08 – Edificações
  // ══════════════════════════════════════════════════════════════

  // Tomo 8.1 – Torres GSR-M
  { code: "PF17A_PE_08_01_MDJ_04", title: "Memória Descritiva e Justificativa - Torres GSM-R", plan_type: "MS", discipline: "edificacoes", doc_reference: "10003939439-323", revision: "04", notes: "Vol.08 Tomo 8.1 – Edifícios / Torres GSR-M", piece_type: "PE" },
  { code: "PF17A_PE_08_01_001_03", title: "Localização de Nova Torre GSM-R ao km 29+730", plan_type: "Drawing", discipline: "edificacoes", doc_reference: "10003939444-317", revision: "03", notes: "Vol.08 Tomo 8.1 – Edifícios / Torres GSR-M", piece_type: "PD" },

  // Tomo 8.2 – Iluminação
  { code: "PF17A_PE_08_02_MDJ_01", title: "Memória Descritiva e Justificativa - Iluminação", plan_type: "MS", discipline: "edificacoes", doc_reference: "10004012923-323", revision: "01", notes: "Vol.08 Tomo 8.2 – Iluminação (zona de manobras)", piece_type: "PE" },
  { code: "PF17A_PE_08_02_001_01", title: "Rede de Iluminação Planta Cachofarra pk 31+700 a 32+200", plan_type: "Drawing", discipline: "edificacoes", doc_reference: "10004012929-317", revision: "01", notes: "Vol.08 Tomo 8.2 – Iluminação (zona de manobras)", piece_type: "PD" },

  // Tomo 8.3.6.1 – Rede de Águas e Esgotos
  { code: "PF17A_PE_08_030601_MDJ_02", title: "Memória Descritiva e Justificativa - Rede de Águas e Esgotos", plan_type: "MS", discipline: "edificacoes", doc_reference: "10003939288-323", revision: "02", notes: "Vol.08 Tomo 8.3.6.1 – Reposição Rede de Águas e Esgotos", piece_type: "PE" },
  { code: "PF17A_PE_08_030601_MED_02", title: "Medições - Rede de Águas e Esgotos", plan_type: "Other", discipline: "edificacoes", doc_reference: "10003948053-331", revision: "02", notes: "Vol.08 Tomo 8.3.6.1 – Reposição Rede de Águas e Esgotos", piece_type: "PE" },

  // Tomo 8.3.6.2 – Rede de Gás
  { code: "PF17A_PE_08_030602_MDJ_05", title: "Memória Descritiva e Justificativa - Rede de Gás", plan_type: "MS", discipline: "edificacoes", doc_reference: "10003939293-323", revision: "05", notes: "Vol.08 Tomo 8.3.6.2 – Reposição Rede de Gás", piece_type: "PE" },

  // Tomo 8.3.6.3 – Rede de Telecomunicações
  { code: "PF17A_PE_08_030603_MDJ_02", title: "Memória Descritiva e Justificativa - Reposição Telecomunicações", plan_type: "MS", discipline: "telecom", doc_reference: "10003939298-323", revision: "02", notes: "Vol.08 Tomo 8.3.6.3 – Reposição Rede de Telecomunicações", piece_type: "PE" },

  // Tomo 8.3.6.4 – Rede Elétrica
  { code: "PF17A_PE_08_030604_MDJ_02", title: "Memória Descritiva e Justificativa - Rede Elétrica", plan_type: "MS", discipline: "edificacoes", doc_reference: "", revision: "02", notes: "Vol.08 Tomo 8.3.6.4 – Reposição Rede Elétrica", piece_type: "PE" },
];

/** Volume/Tomo structure for grouping */
export const VOLUME_STRUCTURE = [
  { volume: "00", title: "Projeto Geral", tomos: [
    "0.1 – Caracterização Geral", "0.2 – Cartografia e Topografia",
    "0.3.1 – Enquadramento AIA", "0.3.2 – Medidas de Minimização",
    "0.6.1 – Domínio Público Hídrico", "0.6.2 – Reserva Ecológica Nacional",
    "0.7 – PPGRCD", "0.8 – PSS / Compilação Técnica",
  ]},
  { volume: "01", title: "Infraestrutura e Plataforma de Via Férrea", tomos: [
    "1.1 – Plataforma de Via", "1.2 – Drenagem", "1.4 – Vedações",
    "1.6 – Restabelecimentos", "1.7 – Geologia e Geotecnia", "1.8 – Muros de Suporte",
  ]},
  { volume: "02", title: "Infraestruturas de Obras de Arte", tomos: [
    "2.4 – Passagens Hidráulicas", "2.5 – PS Rodoviárias",
  ]},
  { volume: "03", title: "Superestrutura de Via", tomos: [
    "3.1 – Via Férrea", "3.4 – Faseamento Construtivo",
  ]},
  { volume: "04", title: "Passagens de Nível", tomos: [] },
  { volume: "06", title: "Telecomunicações", tomos: ["6.2 – Infraestruturas de Telecomunicações"] },
  { volume: "07", title: "Catenária e Energia de Tracção", tomos: [
    "7.1 – Catenária", "7.3 – RCT + TP",
  ]},
  { volume: "08", title: "Edificações", tomos: [
    "8.1 – Torres GSR-M", "8.2 – Iluminação",
    "8.3.6.1 – Rede de Águas e Esgotos", "8.3.6.2 – Rede de Gás",
    "8.3.6.3 – Rede de Telecomunicações", "8.3.6.4 – Rede Elétrica",
  ]},
] as const;
