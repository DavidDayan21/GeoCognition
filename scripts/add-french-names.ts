/**
 * One-shot augmenter for `src-tauri/data/countries.json`.
 *
 * Adds `name_fr` and `capital_fr` to every country entry and rewrites the file
 * in place, preserving id order and the existing field order (the two French
 * fields are inserted right after their English counterparts).
 *
 * REST Countries exposes a French country name (`translations.fra.common`) but
 * does NOT provide localized capitals, and its French country names are not
 * always the form used in French geography quizzes. To keep this generator
 * fully offline, deterministic, and reviewable, the French data lives in the
 * curated `FRENCH` table below, keyed by ISO alpha-3 code.
 *
 * The table is a *manual correction layer*: for the many capitals/countries
 * that are identical in both languages (or differ only by accents) the French
 * value is still spelled out explicitly so a human can review every entry.
 * Capitals that differ from English beyond a simple accent are collected and
 * printed at the end of the run for spot-checking.
 *
 * Run with: node scripts/add-french-names.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Country {
  id: number;
  name: string;
  name_fr?: string;
  capital: string;
  capital_fr?: string;
  continent: string;
  iso_alpha2: string;
  iso_alpha3: string;
  lat: number;
  lng: number;
}

/** Curated French names keyed by ISO alpha-3, `[name_fr, capital_fr]`. */
const FRENCH: Record<string, readonly [string, string]> = {
  afg: ["Afghanistan", "Kaboul"],
  alb: ["Albanie", "Tirana"],
  dza: ["Algérie", "Alger"],
  and: ["Andorre", "Andorre-la-Vieille"],
  ago: ["Angola", "Luanda"],
  atg: ["Antigua-et-Barbuda", "Saint John's"],
  arg: ["Argentine", "Buenos Aires"],
  arm: ["Arménie", "Erevan"],
  aus: ["Australie", "Canberra"],
  aut: ["Autriche", "Vienne"],
  aze: ["Azerbaïdjan", "Bakou"],
  bhs: ["Bahamas", "Nassau"],
  bhr: ["Bahreïn", "Manama"],
  bgd: ["Bangladesh", "Dacca"],
  brb: ["Barbade", "Bridgetown"],
  blr: ["Biélorussie", "Minsk"],
  bel: ["Belgique", "Bruxelles"],
  blz: ["Belize", "Belmopan"],
  ben: ["Bénin", "Porto-Novo"],
  btn: ["Bhoutan", "Thimphou"],
  bol: ["Bolivie", "Sucre"],
  bih: ["Bosnie-Herzégovine", "Sarajevo"],
  bwa: ["Botswana", "Gaborone"],
  bra: ["Brésil", "Brasilia"],
  brn: ["Brunei", "Bandar Seri Begawan"],
  bgr: ["Bulgarie", "Sofia"],
  bfa: ["Burkina Faso", "Ouagadougou"],
  bdi: ["Burundi", "Gitega"],
  khm: ["Cambodge", "Phnom Penh"],
  cmr: ["Cameroun", "Yaoundé"],
  can: ["Canada", "Ottawa"],
  cpv: ["Cap-Vert", "Praia"],
  caf: ["République centrafricaine", "Bangui"],
  tcd: ["Tchad", "N'Djaména"],
  chl: ["Chili", "Santiago"],
  chn: ["Chine", "Pékin"],
  col: ["Colombie", "Bogota"],
  com: ["Comores", "Moroni"],
  cri: ["Costa Rica", "San José"],
  hrv: ["Croatie", "Zagreb"],
  cub: ["Cuba", "La Havane"],
  cyp: ["Chypre", "Nicosie"],
  cze: ["Tchéquie", "Prague"],
  dnk: ["Danemark", "Copenhague"],
  dji: ["Djibouti", "Djibouti"],
  dma: ["Dominique", "Roseau"],
  dom: ["République dominicaine", "Saint-Domingue"],
  cod: ["République démocratique du Congo", "Kinshasa"],
  ecu: ["Équateur", "Quito"],
  egy: ["Égypte", "Le Caire"],
  slv: ["Salvador", "San Salvador"],
  gnq: ["Guinée équatoriale", "Ciudad de la Paz"],
  eri: ["Érythrée", "Asmara"],
  est: ["Estonie", "Tallinn"],
  swz: ["Eswatini", "Mbabane"],
  eth: ["Éthiopie", "Addis-Abeba"],
  fji: ["Fidji", "Suva"],
  fin: ["Finlande", "Helsinki"],
  fra: ["France", "Paris"],
  gab: ["Gabon", "Libreville"],
  gmb: ["Gambie", "Banjul"],
  geo: ["Géorgie", "Tbilissi"],
  deu: ["Allemagne", "Berlin"],
  gha: ["Ghana", "Accra"],
  grc: ["Grèce", "Athènes"],
  grd: ["Grenade", "Saint-Georges"],
  gtm: ["Guatemala", "Guatemala"],
  gin: ["Guinée", "Conakry"],
  gnb: ["Guinée-Bissau", "Bissau"],
  guy: ["Guyana", "Georgetown"],
  hti: ["Haïti", "Port-au-Prince"],
  hnd: ["Honduras", "Tegucigalpa"],
  hun: ["Hongrie", "Budapest"],
  isl: ["Islande", "Reykjavik"],
  ind: ["Inde", "New Delhi"],
  idn: ["Indonésie", "Jakarta"],
  irn: ["Iran", "Téhéran"],
  irq: ["Irak", "Bagdad"],
  irl: ["Irlande", "Dublin"],
  isr: ["Israël", "Jérusalem"],
  ita: ["Italie", "Rome"],
  civ: ["Côte d'Ivoire", "Yamoussoukro"],
  jam: ["Jamaïque", "Kingston"],
  jpn: ["Japon", "Tokyo"],
  jor: ["Jordanie", "Amman"],
  kaz: ["Kazakhstan", "Astana"],
  ken: ["Kenya", "Nairobi"],
  kir: ["Kiribati", "Tarawa-Sud"],
  kwt: ["Koweït", "Koweït"],
  kgz: ["Kirghizistan", "Bichkek"],
  lao: ["Laos", "Vientiane"],
  lva: ["Lettonie", "Riga"],
  lbn: ["Liban", "Beyrouth"],
  lso: ["Lesotho", "Maseru"],
  lbr: ["Liberia", "Monrovia"],
  lby: ["Libye", "Tripoli"],
  lie: ["Liechtenstein", "Vaduz"],
  ltu: ["Lituanie", "Vilnius"],
  lux: ["Luxembourg", "Luxembourg"],
  mdg: ["Madagascar", "Antananarivo"],
  mwi: ["Malawi", "Lilongwe"],
  mys: ["Malaisie", "Kuala Lumpur"],
  mdv: ["Maldives", "Malé"],
  mli: ["Mali", "Bamako"],
  mlt: ["Malte", "La Valette"],
  mhl: ["Îles Marshall", "Majuro"],
  mrt: ["Mauritanie", "Nouakchott"],
  mus: ["Maurice", "Port-Louis"],
  mex: ["Mexique", "Mexico"],
  fsm: ["Micronésie", "Palikir"],
  mda: ["Moldavie", "Chișinău"],
  mco: ["Monaco", "Monaco"],
  mng: ["Mongolie", "Oulan-Bator"],
  mne: ["Monténégro", "Podgorica"],
  mar: ["Maroc", "Rabat"],
  moz: ["Mozambique", "Maputo"],
  mmr: ["Birmanie", "Naypyidaw"],
  nam: ["Namibie", "Windhoek"],
  nru: ["Nauru", "Yaren"],
  npl: ["Népal", "Katmandou"],
  nld: ["Pays-Bas", "Amsterdam"],
  nzl: ["Nouvelle-Zélande", "Wellington"],
  nic: ["Nicaragua", "Managua"],
  ner: ["Niger", "Niamey"],
  nga: ["Nigeria", "Abuja"],
  prk: ["Corée du Nord", "Pyongyang"],
  mkd: ["Macédoine du Nord", "Skopje"],
  nor: ["Norvège", "Oslo"],
  omn: ["Oman", "Mascate"],
  pak: ["Pakistan", "Islamabad"],
  plw: ["Palaos", "Ngerulmud"],
  pse: ["Palestine", "Ramallah"],
  pan: ["Panama", "Panama"],
  png: ["Papouasie-Nouvelle-Guinée", "Port Moresby"],
  pry: ["Paraguay", "Asunción"],
  per: ["Pérou", "Lima"],
  phl: ["Philippines", "Manille"],
  pol: ["Pologne", "Varsovie"],
  prt: ["Portugal", "Lisbonne"],
  qat: ["Qatar", "Doha"],
  cog: ["République du Congo", "Brazzaville"],
  rou: ["Roumanie", "Bucarest"],
  rus: ["Russie", "Moscou"],
  rwa: ["Rwanda", "Kigali"],
  kna: ["Saint-Christophe-et-Niévès", "Basseterre"],
  lca: ["Sainte-Lucie", "Castries"],
  vct: ["Saint-Vincent-et-les-Grenadines", "Kingstown"],
  wsm: ["Samoa", "Apia"],
  smr: ["Saint-Marin", "Saint-Marin"],
  stp: ["Sao Tomé-et-Principe", "São Tomé"],
  sau: ["Arabie saoudite", "Riyad"],
  sen: ["Sénégal", "Dakar"],
  srb: ["Serbie", "Belgrade"],
  syc: ["Seychelles", "Victoria"],
  sle: ["Sierra Leone", "Freetown"],
  sgp: ["Singapour", "Singapour"],
  svk: ["Slovaquie", "Bratislava"],
  svn: ["Slovénie", "Ljubljana"],
  slb: ["Îles Salomon", "Honiara"],
  som: ["Somalie", "Mogadiscio"],
  zaf: ["Afrique du Sud", "Pretoria"],
  kor: ["Corée du Sud", "Séoul"],
  ssd: ["Soudan du Sud", "Djouba"],
  esp: ["Espagne", "Madrid"],
  lka: ["Sri Lanka", "Sri Jayawardenepura Kotte"],
  sdn: ["Soudan", "Khartoum"],
  sur: ["Suriname", "Paramaribo"],
  swe: ["Suède", "Stockholm"],
  che: ["Suisse", "Berne"],
  syr: ["Syrie", "Damas"],
  tjk: ["Tadjikistan", "Douchanbé"],
  tza: ["Tanzanie", "Dodoma"],
  tha: ["Thaïlande", "Bangkok"],
  tls: ["Timor oriental", "Dili"],
  tgo: ["Togo", "Lomé"],
  ton: ["Tonga", "Nuku'alofa"],
  tto: ["Trinité-et-Tobago", "Port-d'Espagne"],
  tun: ["Tunisie", "Tunis"],
  tur: ["Turquie", "Ankara"],
  tkm: ["Turkménistan", "Achgabat"],
  tuv: ["Tuvalu", "Funafuti"],
  uga: ["Ouganda", "Kampala"],
  ukr: ["Ukraine", "Kiev"],
  are: ["Émirats arabes unis", "Abou Dabi"],
  gbr: ["Royaume-Uni", "Londres"],
  usa: ["États-Unis", "Washington"],
  ury: ["Uruguay", "Montevideo"],
  uzb: ["Ouzbékistan", "Tachkent"],
  vut: ["Vanuatu", "Port-Vila"],
  vat: ["Cité du Vatican", "Cité du Vatican"],
  ven: ["Venezuela", "Caracas"],
  vnm: ["Viêt Nam", "Hanoï"],
  yem: ["Yémen", "Sanaa"],
  zmb: ["Zambie", "Lusaka"],
  zwe: ["Zimbabwe", "Harare"],
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const filePath = join(scriptDir, "..", "src-tauri", "data", "countries.json");
const countries = JSON.parse(readFileSync(filePath, "utf8")) as Country[];

const missing = countries.filter((c) => !FRENCH[c.iso_alpha3]);
if (missing.length > 0) {
  throw new Error(
    `Missing French data for: ${missing.map((c) => `${c.name} (${c.iso_alpha3})`).join(", ")}`,
  );
}

/** Accent/diacritic-insensitive lowercase, to detect non-trivial differences. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const meaningfulCapitalDiffs: Array<{ en: string; fr: string }> = [];

const augmented = countries.map((c) => {
  const [name_fr, capital_fr] = FRENCH[c.iso_alpha3];
  if (fold(c.capital) !== fold(capital_fr)) {
    meaningfulCapitalDiffs.push({ en: c.capital, fr: capital_fr });
  }
  // Rebuild each object so French fields sit next to their English source.
  return {
    id: c.id,
    name: c.name,
    name_fr,
    capital: c.capital,
    capital_fr,
    continent: c.continent,
    iso_alpha2: c.iso_alpha2,
    iso_alpha3: c.iso_alpha3,
    lat: c.lat,
    lng: c.lng,
  };
});

writeFileSync(filePath, JSON.stringify(augmented, null, 2) + "\n", "utf8");

console.log(`Augmented ${augmented.length} countries with French names.`);
console.log(
  `\nCapitals that differ from English beyond accents (${meaningfulCapitalDiffs.length}):`,
);
for (const { en, fr } of meaningfulCapitalDiffs) {
  console.log(`  ${en} → ${fr}`);
}
