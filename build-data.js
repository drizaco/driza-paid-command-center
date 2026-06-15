#!/usr/bin/env node
/**
 * build-data.js
 * Generates data.json for the Paid Media Command Center dashboard.
 * All raw API data is embedded as constants. Run with: node build-data.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. PARSING HELPERS
// ---------------------------------------------------------------------------

/**
 * Parse a Spanish-formatted spend string: "€121,84" → 121.84
 * Handles thousands dots: "€1.476,25" → 1476.25
 */
function parseSpend(s) {
  // Remove €, EUR, spaces
  let clean = s.replace(/€/g, '').replace(/EUR/g, '').trim();
  // Remove thousands separators (dots), then swap comma for decimal point
  // Pattern: digits separated by dots, with optional comma decimal
  // "1.476,25" → "1476.25"
  // "121,84" → "121.84"
  clean = clean.replace(/\./g, '').replace(',', '.');
  return parseFloat(clean);
}

/**
 * Parse a Spanish-formatted integer: "29.797" → 29797, "1.308.342" → 1308342
 */
function parseInteger(s) {
  let clean = s.trim().replace(/\./g, '');
  return parseInt(clean, 10);
}

/**
 * Parse a Spanish-formatted percentage: "0,69%" → 0.69
 */
function parsePercent(s) {
  let clean = s.replace(/%/g, '').trim().replace(',', '.');
  return parseFloat(clean);
}

/**
 * Round to 2 decimal places
 */
function r2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// 2. RAW DAILY DATA (May 1 – Jun 14, 45 days)
// Format per entry: "€spend/impressions/clicks"
// ---------------------------------------------------------------------------

const PADMI_DAILY_RAW = [
  "€121,84/29.797/274", "€95,40/26.710/259", "€130,84/32.735/303",
  "€128,28/30.955/309", "€123,88/25.063/225", "€114,09/18.931/177",
  "€131,16/24.263/202", "€150,14/24.823/212", "€129,36/23.479/242",
  "€156,67/31.701/349", "€176,71/54.987/551", "€218,80/89.267/916",
  "€125,42/40.293/437", "€105,70/22.119/257", "€105,44/19.657/205",
  "€65,11/11.349/160", "€113,70/26.223/290", "€69,08/15.469/157",
  "€86,16/17.318/188", "€89,49/14.370/179", "€69,16/9.028/136",
  "€132,62/17.405/201", "€97,76/13.279/191", "€107,54/14.466/180",
  "€99,18/15.146/140", "€98,27/14.849/175", "€93,94/13.614/190",
  "€68,51/9.614/129", "€79,33/11.021/161", "€73,54/10.945/114",
  "€82,06/12.415/177", "€70,24/10.471/146", "€105,43/16.692/185",
  "€99,08/16.867/189", "€68,79/9.949/116", "€72,05/10.069/123",
  "€88,88/11.218/137", "€103,40/13.642/172", "€86,85/13.078/168",
  "€75,90/11.352/129", "€72,14/10.535/162", "€67,33/8.921/130",
  "€61,55/7.200/108", "€75,90/9.478/149", "€83,62/10.274/128"
];

const COTON_DAILY_RAW = [
  "€29,61/2.863/611", "€24,68/3.128/590", "€29,04/4.766/443",
  "€46,76/6.920/1.081", "€34,09/5.656/478", "€25,07/3.773/184",
  "€28,28/4.859/260", "€22,71/3.816/183", "€24,14/3.851/188",
  "€27,28/3.939/207", "€25,08/3.450/171", "€34,52/5.297/363",
  "€56,39/7.939/699", "€39,04/5.137/382", "€37,65/5.111/381",
  "€39,85/5.587/459", "€66,33/11.937/748", "€41,95/7.538/506",
  "€46,98/8.106/578", "€41,21/7.322/385", "€36,49/5.974/338",
  "€40,11/6.353/421", "€40,78/5.949/348", "€47,15/6.859/326",
  "€38,94/5.413/322", "€40,09/5.726/277", "€26,40/3.476/150",
  "€15,71/2.310/92", "€13,36/1.547/95", "€12,33/1.332/70",
  "€17,31/1.822/112", "€20,14/2.623/174", "€34,08/4.480/240",
  "€48,06/6.144/292", "€50,79/6.927/341", "€43,73/5.515/245",
  "€50,56/5.970/270", "€64,33/8.122/400", "€56,95/7.016/344",
  "€51,33/6.011/326", "€45,48/5.655/291", "€43,59/5.778/297",
  "€43,18/5.489/276", "€31,70/4.247/199", "€55,58/8.444/413"
];

const POM_DAILY_RAW = [
  "€58,50/4.163/43", "€55,96/4.059/30", "€77,48/5.504/60",
  "€74,42/4.199/86", "€63,42/5.179/62", "€100,37/7.805/89",
  "€95,76/8.001/88", "€90,74/6.743/93", "€73,52/5.455/45",
  "€97,37/6.867/67", "€94,05/7.730/72", "€83,78/6.449/63",
  "€84,65/5.419/49", "€73,90/5.249/53", "€68,19/4.950/46",
  "€60,19/4.835/36", "€93,48/6.936/56", "€83,35/6.690/67",
  "€89,62/7.210/54", "€94,56/6.264/55", "€73,65/4.906/50",
  "€67,77/4.118/38", "€57,35/3.186/45", "€99,80/5.731/42",
  "€92,72/5.425/40", "€68,30/4.817/49", "€79,96/7.382/55",
  "€79,93/5.174/45", "€74,37/6.131/52", "€64,44/4.736/50",
  "€100,17/7.441/67", "€66,71/5.235/38", "€61,82/5.123/26",
  "€101,62/6.970/59", "€95,60/6.328/75", "€65,48/4.904/48",
  "€68,51/5.290/51", "€88,23/6.467/73", "€78,42/5.917/52",
  "€88,91/6.150/75", "€84,94/6.319/70", "€79,12/5.966/63",
  "€66,98/4.666/49", "€73,01/4.367/32", "€85,93/6.311/50"
];

// ---------------------------------------------------------------------------
// 3. RAW MONTHLY DATA
// ---------------------------------------------------------------------------

const PADMI_MONTHLY_RAW = [
  { label: "Jun 25", spend: "€379,03", impressions: "53.974", clicks: "467" },
  { label: "Jul 25", spend: "€1.137,67", impressions: "189.155", clicks: "1.377" },
  { label: "Ago 25", spend: "€1.031,51", impressions: "253.842", clicks: "2.372" },
  { label: "Sep 25", spend: "€1.619,57", impressions: "278.802", clicks: "2.152" },
  { label: "Oct 25", spend: "€1.558,18", impressions: "295.264", clicks: "2.479" },
  { label: "Nov 25", spend: "€1.544,61", impressions: "312.640", clicks: "2.647" },
  { label: "Dic 25", spend: "€1.405,20", impressions: "318.223", clicks: "4.440" },
  { label: "Ene 26", spend: "€1.714,23", impressions: "1.308.342", clicks: "6.773" },
  { label: "Feb 26", spend: "€1.614,80", impressions: "1.415.244", clicks: "9.750" },
  { label: "Mar 26", spend: "€2.507,17", impressions: "680.879", clicks: "9.333" },
  { label: "Abr 26", spend: "€2.020,69", impressions: "502.206", clicks: "4.717" },
  { label: "May 26", spend: "€3.439,18", impressions: "721.291", clicks: "7.686" },
  { label: "Jun 26*", spend: "€1.131,16", impressions: "159.746", clicks: "2.042" }
];

const COTON_MONTHLY_RAW = [
  { label: "Jun 25", spend: "€546,19", impressions: "122.005", clicks: "5.772" },
  { label: "Jul 25", spend: "€407,52", impressions: "111.993", clicks: "5.845" },
  { label: "Ago 25", spend: "€437,46", impressions: "142.636", clicks: "7.824" },
  { label: "Sep 25", spend: "€414,67", impressions: "98.312", clicks: "5.472" },
  { label: "Oct 25", spend: "€428,92", impressions: "113.357", clicks: "5.862" },
  { label: "Nov 25", spend: "€341,79", impressions: "91.648", clicks: "4.905" },
  { label: "Dic 25", spend: "€425,42", impressions: "113.569", clicks: "5.955" },
  { label: "Ene 26", spend: "€429,97", impressions: "168.159", clicks: "8.168" },
  { label: "Feb 26", spend: "€387,76", impressions: "110.871", clicks: "7.538" },
  { label: "Mar 26", spend: "€431,59", impressions: "112.648", clicks: "7.638" },
  { label: "Abr 26", spend: "€430,60", impressions: "109.388", clicks: "9.166" },
  { label: "May 26", spend: "€1.049,33", impressions: "157.756", clicks: "11.448" },
  { label: "Jun 26*", spend: "€639,50", impressions: "82.421", clicks: "4.108" }
];

const POM_MONTHLY_RAW = [
  { label: "Jun 25", spend: "€298,03", impressions: "313.913", clicks: "4.327" },
  { label: "Jul 25", spend: null, impressions: null, clicks: null },
  { label: "Ago 25", spend: null, impressions: null, clicks: null },
  { label: "Sep 25", spend: null, impressions: null, clicks: null },
  { label: "Oct 25", spend: null, impressions: null, clicks: null },
  { label: "Nov 25", spend: "€911,13", impressions: "72.653", clicks: "1.526" },
  { label: "Dic 25", spend: "€1.263,11", impressions: "96.367", clicks: "1.472" },
  { label: "Ene 26", spend: "€2.510,60", impressions: "262.950", clicks: "5.704" },
  { label: "Feb 26", spend: "€1.840,14", impressions: "249.589", clicks: "2.888" },
  { label: "Mar 26", spend: "€1.792,65", impressions: "174.916", clicks: "1.741" },
  { label: "Abr 26", spend: "€1.195,47", impressions: "90.079", clicks: "1.037" },
  { label: "May 26", spend: "€2.471,77", impressions: "178.754", clicks: "1.747" },
  { label: "Jun 26*", spend: "€1.105,28", impressions: "80.013", clicks: "761" }
];

// ---------------------------------------------------------------------------
// 4. PARSE DAILY DATA
// ---------------------------------------------------------------------------

function parseDaily(rawArr) {
  return rawArr.map(entry => {
    const parts = entry.split('/');
    const spend = parseSpend(parts[0]);
    const impressions = parseInteger(parts[1]);
    const clicks = parseInteger(parts[2]);
    return [spend, impressions, clicks];
  });
}

// ---------------------------------------------------------------------------
// 5. PARSE MONTHLY DATA
// ---------------------------------------------------------------------------

function parseMonthly(rawArr) {
  return rawArr.map(entry => {
    if (entry.spend === null) {
      return [entry.label, null, null, null];
    }
    return [
      entry.label,
      parseSpend(entry.spend),
      parseInteger(entry.impressions),
      parseInteger(entry.clicks)
    ];
  });
}

// ---------------------------------------------------------------------------
// 6. CAMPAIGN & ADSET DATA (already parsed inline for clarity)
// ---------------------------------------------------------------------------

const padmiCampaigns = [
  {
    name: "GP_LEA_PRO_ES_FORMB2B _V2 - Copia",
    status: "ACTIVE",
    objective: "Leads",
    spend: 1476.25,
    ctr: 0.69,
    cpc: 0.92,
    results: 37,
    resultType: "leads",
    costPerResult: r2(1476.25 / 37)
  },
  {
    name: "GP_LEA_PRO_BE+FR_FORMB2B _V1 - Copia 2",
    status: "ACTIVE",
    objective: "Leads",
    spend: 542.02,
    ctr: 1.49,
    cpc: 0.64,
    results: 25,
    resultType: "leads",
    costPerResult: r2(542.02 / 25)
  },
  {
    name: "GP_LEA_PRO_BE+FR_FORMB2B _V1 - Copia",
    status: "PAUSED",
    objective: "Leads",
    spend: 276.20,
    ctr: 0.98,
    cpc: 0.50,
    results: 2,
    resultType: "leads",
    costPerResult: r2(276.20 / 2)
  },
  {
    name: "GP_LEA_RTG_ES_FORMB2B",
    status: "ACTIVE",
    objective: "Leads",
    spend: 150.20,
    ctr: 1.26,
    cpc: 0.63,
    results: 1,
    resultType: "leads",
    costPerResult: r2(150.20 / 1)
  },
  {
    name: "GP_INT_PRO_ES - Owly",
    status: "ACTIVE",
    objective: "Engagement",
    spend: 111.94,
    ctr: 6.58,
    cpc: 0.07,
    results: null,
    resultType: "visitas perfil",
    costPerResult: null
  }
];

const cotonCampaigns = [
  {
    name: "ES_Captación_Leads_Prospecting Cocina",
    status: "ACTIVE",
    objective: "Leads",
    spend: 752.58,
    ctr: 3.89,
    cpc: 0.19,
    results: 78,
    resultType: "leads",
    costPerResult: r2(752.58 / 78)
  },
  {
    name: "ES_Captación_Leads_Prospecting Reforma completa",
    status: "ACTIVE",
    objective: "Leads",
    spend: 451.91,
    ctr: 8.02,
    cpc: 0.08,
    results: 22,
    resultType: "leads",
    costPerResult: r2(451.91 / 22)
  }
];

const pomCampaigns = [
  {
    name: "CA_Clínicas Dentales_ Lead Ads - Prospecting",
    status: "ACTIVE",
    objective: "Leads",
    spend: 2235.97,
    ctr: 0.86,
    cpc: 1.59,
    results: 91,
    resultType: "leads",
    costPerResult: r2(2235.97 / 91)
  },
  {
    name: "CA_Clínicas Dentales_ Lead ADS - Retargeting",
    status: "ACTIVE",
    objective: "Leads",
    spend: 148.97,
    ctr: 2.18,
    cpc: 0.93,
    results: 13,
    resultType: "leads",
    costPerResult: r2(148.97 / 13)
  }
];

// ---------------------------------------------------------------------------
// 7. ADSET DATA
// ---------------------------------------------------------------------------

const padmiAdsets = [
  { name: "FORM_B2B_AD+", status: "ACTIVE", spend: 734.50, ctr: 0.81, cpc: 0.78, results: 15, resultType: "leads", costPerResult: r2(734.50 / 15) },
  { name: "FORM_B2B_INT (nuevas creatives)", status: "ACTIVE", spend: 507.37, ctr: 0.60, cpc: 1.10, results: 14, resultType: "leads", costPerResult: r2(507.37 / 14) },
  { name: "FORM_B2B_Paris_AD+ estáticas", status: "ACTIVE", spend: 376.92, ctr: 1.68, cpc: 0.61, results: 15, resultType: "leads", costPerResult: r2(376.92 / 15) },
  { name: "FORM_B2B_FR_AD+", status: "ACTIVE", spend: 208.00, ctr: 1.07, cpc: 0.50, results: 2, resultType: "leads", costPerResult: r2(208.00 / 2) },
  { name: "FORM_B2B_INT (antiguas creatives)", status: "PAUSED", spend: 160.48, ctr: 0.35, cpc: 2.23, results: 1, resultType: "leads", costPerResult: r2(160.48 / 1) },
  { name: "RTG_BE_FORMB2B _V1", status: "ACTIVE", spend: 150.20, ctr: 1.26, cpc: 0.63, results: 1, resultType: "leads", costPerResult: r2(150.20 / 1) },
  { name: "Adset 1 - Interacción Owly", status: "ACTIVE", spend: 111.94, ctr: 6.58, cpc: 0.07, results: null, resultType: "visitas perfil", costPerResult: null },
  { name: "FORM_B2B_BE_AD+", status: "ACTIVE", spend: 110.95, ctr: 1.20, cpc: 0.69, results: 3, resultType: "leads", costPerResult: r2(110.95 / 3) },
  { name: "FORM_B2B_World padel summit", status: "PAUSED", spend: 73.90, ctr: 0.74, cpc: 0.60, results: 7, resultType: "leads", costPerResult: r2(73.90 / 7) },
  { name: "FORM_B2B_BE_AD+ (second)", status: "ACTIVE", spend: 68.20, ctr: 0.78, cpc: 0.50, results: null, resultType: "leads", costPerResult: null },
  { name: "FORM_B2B_Paris_AD+ - Vídeos", status: "ACTIVE", spend: 54.15, ctr: 1.03, cpc: 0.76, results: 7, resultType: "leads", costPerResult: r2(54.15 / 7) }
];

const cotonAdsets = [
  { name: "ES_Intereses_Leads_Estilo_Cocinas", status: "ACTIVE", spend: 535.95, ctr: 3.84, cpc: 0.19, results: 59, resultType: "leads", costPerResult: r2(535.95 / 59) },
  { name: "ES_Intereses_Leads_LAL Web Advt+", status: "ACTIVE", spend: 451.91, ctr: 8.02, cpc: 0.08, results: 22, resultType: "leads", costPerResult: r2(451.91 / 22) },
  { name: "ES_Intereses_Leads_Estilo_Cocinas V2", status: "ACTIVE", spend: 153.19, ctr: 3.81, cpc: 0.17, results: 16, resultType: "leads", costPerResult: r2(153.19 / 16) },
  { name: "ES_RTG_Leads_Estilo_Cocinas - Estáticas", status: "ACTIVE", spend: 63.44, ctr: 4.62, cpc: 0.20, results: 3, resultType: "leads", costPerResult: r2(63.44 / 3) }
];

const pomAdsets = [
  { name: "GR_Clínicas Dentales NUEVO_ DENTISTAS", status: "ACTIVE", spend: 1029.30, ctr: 0.94, cpc: 1.48, results: 43, resultType: "leads", costPerResult: r2(1029.30 / 43) },
  { name: "GR_Clínicas Dentales NUEVO_Advt+", status: "ACTIVE", spend: 946.55, ctr: 0.75, cpc: 1.85, results: 36, resultType: "leads", costPerResult: r2(946.55 / 36) },
  { name: "GR_Clínicas Dentales NUEVO_Advt+ (Facebook)", status: "ACTIVE", spend: 260.12, ctr: 0.94, cpc: 1.35, results: 12, resultType: "leads", costPerResult: r2(260.12 / 12) },
  { name: "GR_RTG General", status: "ACTIVE", spend: 148.97, ctr: 2.18, cpc: 0.93, results: 13, resultType: "leads", costPerResult: r2(148.97 / 13) }
];

// ---------------------------------------------------------------------------
// 8. RECOMMENDATIONS & PIXELS (carried over from current data.json)
// ---------------------------------------------------------------------------

const padmiRecommendations = [
  "Reasignar presupuesto: la campaña ES V2 se lleva el 56% del gasto con el peor CTR (0,74%) y CPL €44. La BE+FR Copia 2 (CPL €19,55) y el adset FR Vídeos (CPL €7,18) están infrafinanciados. Mover budget hacia los CPL bajos.",
  "Cortar creativo quemado: el adset «INT antiguas creatives» tiene CTR 0,36% y CPL €145. Pausar o renovar ya. Plantéate reactivar «World padel summit» (estaba a CPL €10,56 antes de pausarse).",
  "Limpiar tracking: 4 píxeles, solo 1 sano. Consolidar en «Padmi Publicitaria Pixel», reactivar el CAPI parado desde marzo, subir el EMQ (4,6) con más match keys y arreglar el PageView (apenas dispara)."
];

const padmiPixels = [
  { name: "Padmi Publicitaria Pixel", status: "ok", detail: "Vivo · web+CRM · CAPI ayer · funnel lead→opp→customer" },
  { name: "Pixel Padmi", status: "warn", detail: "CAPI parado desde 20-mar · pertenece a otro business" },
  { name: "Padmi", status: "bad", detail: "Muerto desde 24-ene" },
  { name: "Padmi Pixel", status: "bad", detail: "Zombie · nunca ha disparado" }
];

const cotonRecommendations = [
  "Fatiga de creativo clara: el CTR diario se ha desplomado de ~15-20% (inicio de mayo) a ~5% (junio). Refrescar creativos de Prospecting cuanto antes; es la palanca nº1 ahora mismo.",
  "Escalar lo barato: «Cocinas V2» (CPL €8,15) y «Prospecting Cocina» (CPL €11,50) están baratísimos. Hay margen claro para subirles presupuesto y crecer leads sin disparar el CAC.",
  "Saturación de audiencia: el CPM ha subido de ~€4 a €8-9 mientras cae el alcance diario. La audiencia se está quemando — ampliar intereses, abrir nuevos LAL o subir cobertura geográfica."
];

const pomRecommendations = [
  "Adsets «Formlabs» en WITH_ISSUES gastando sin generar ningún lead. Revisar configuración (evento/segmentación) o pausar definitivamente.",
  "Escalar retargeting: el RTG va a CPL €12,62, menos de la mitad que prospecting (€28-31), pero solo recibe €151 de ~€2.400. Ampliar budget y audiencias de retargeting.",
  "Coste al alza: CPC roza los €2,3 en días de junio y CPM €13-18 (sector caro). El CTR 0,84% de la campaña grande es mejorable — testear nuevos ángulos creativos para frenar la subida del CAC."
];

// ---------------------------------------------------------------------------
// 9. LEADS & CPL CALCULATIONS
// ---------------------------------------------------------------------------

// Padmi: 37+25+2+1 = 65 leads, spend on lead campaigns = 1476.25+542.02+276.20+150.20 = 2444.67
const padmiLeads = 65;
const padmiCPL = r2(2444.67 / 65); // 37.61

// Coton: 78+22 = 100 leads, spend = 752.58+451.91 = 1204.49
const cotonLeads = 100;
const cotonCPL = r2(1204.49 / 100); // 12.04

// Pom: 91+13 = 104 leads, spend = 2235.97+148.97 = 2384.94
const pomLeads = 104;
const pomCPL = r2(2384.94 / 104); // 22.93

// ---------------------------------------------------------------------------
// 10. BUILD OUTPUT
// ---------------------------------------------------------------------------

const output = {
  generated: new Date().toISOString(),
  periodStart: "2026-05-01",
  periodEnd: "2026-06-14",
  order: ["padmi", "coton", "pom"],
  accounts: {
    padmi: {
      name: "Padmi",
      fullName: "Padmi Publicitaria",
      adAccountId: "1078022190785024",
      model: "Lead gen B2B · pádel",
      leads30d: padmiLeads,
      cpl30d: padmiCPL,
      daily: parseDaily(PADMI_DAILY_RAW),
      monthly: parseMonthly(PADMI_MONTHLY_RAW),
      campaigns: padmiCampaigns,
      adsets: padmiAdsets,
      recommendations: padmiRecommendations,
      pixels: padmiPixels
    },
    coton: {
      name: "Coton et Bois",
      fullName: "Coton et Bois",
      adAccountId: "478835545931836",
      model: "Lead gen · reformas/cocinas",
      leads30d: cotonLeads,
      cpl30d: cotonCPL,
      daily: parseDaily(COTON_DAILY_RAW),
      monthly: parseMonthly(COTON_MONTHLY_RAW),
      campaigns: cotonCampaigns,
      adsets: cotonAdsets,
      recommendations: cotonRecommendations,
      pixels: []
    },
    pom: {
      name: "Pom Medical",
      fullName: "Pom Medical",
      adAccountId: "1006407757639528",
      model: "Lead gen · clínicas dentales",
      leads30d: pomLeads,
      cpl30d: pomCPL,
      daily: parseDaily(POM_DAILY_RAW),
      monthly: parseMonthly(POM_MONTHLY_RAW),
      campaigns: pomCampaigns,
      adsets: pomAdsets,
      recommendations: pomRecommendations,
      pixels: []
    }
  }
};

// ---------------------------------------------------------------------------
// 11. WRITE FILE
// ---------------------------------------------------------------------------

const outPath = path.join(__dirname, 'data.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`data.json written to ${outPath}`);
console.log(`Period: ${output.periodStart} → ${output.periodEnd}`);
console.log(`Generated: ${output.generated}`);
console.log(`Padmi: ${padmiLeads} leads, CPL €${padmiCPL} | ${output.accounts.padmi.daily.length} daily entries | ${output.accounts.padmi.monthly.length} monthly entries`);
console.log(`Coton: ${cotonLeads} leads, CPL €${cotonCPL} | ${output.accounts.coton.daily.length} daily entries | ${output.accounts.coton.monthly.length} monthly entries`);
console.log(`Pom:   ${pomLeads} leads, CPL €${pomCPL} | ${output.accounts.pom.daily.length} daily entries | ${output.accounts.pom.monthly.length} monthly entries`);
