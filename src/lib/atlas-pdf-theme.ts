/**
 * ATLAS PDF Theme — design system partilhado para todas as exportações PDF do Atlas QMS.
 * Cores e dimensões idênticas ao sistema de documentos oficiais PF17A.
 * Usar em todos os serviços de exportação: ncExportService, ppiExportService,
 * materialExportService, testExportService, etc.
 */

export const ATLAS_PDF = {
  colors: {
    navy:     "#192F48",   // cabeçalhos, títulos principais
    navym:    "#24436A",   // sub-cabeçalhos, grupos
    ink:      "#1A1A1A",   // texto principal
    muted:    "#505A68",   // texto secundário, labels
    rule:     "#C4CBD4",   // linhas de tabela e separadores
    tint:     "#F1F3F5",   // fundo de linhas alternadas
    white:    "#FFFFFF",
    // badges de inspecção
    hp_bg:    "#F3EAEA", hp_fg: "#6A1414", hp_bd: "#BC8C8C",
    rp_bg:    "#F4F0E0", rp_fg: "#594200", rp_bd: "#BEA640",
    wp_bg:    "#E7F2E7", wp_fg: "#194819", wp_bd: "#86B886",
    // estado NC
    ok_bg:    "#E7F2E7", ok_fg: "#194819",
    nc_bg:    "#F3EAEA", nc_fg: "#6A1414",
    warn_bg:  "#F4F0E0", warn_fg: "#594200",
  },
  fonts: {
    base: "Arial",
    sizes: { h1: 11, h2: 9, body: 8, small: 7, label: 6 }, // pt
  },
  page: {
    width: 210, height: 297,          // A4 mm
    margin: { top: 24, right: 16, bottom: 13, left: 16 }, // mm
    headerHeight: 20,                  // mm
    footerHeight: 8,                   // mm
  },
  header: {
    leftLine1: "Atlas QMS · Sistema de Gestão da Qualidade",
    leftLine2: "—",
    org: "—",
  },
  footer: {
    left: "Confidencial — Uso Interno",
    // center é o código do documento — passado como parâmetro
    // right é "Pág. X / Y"
  },
} as const;

export type AtlasPdfTheme = typeof ATLAS_PDF;
