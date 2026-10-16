// Imagery policy, in order of preference:
//  1. A freely-licensed photo of the story's subject (person, company, place)
//     from Wikipedia/Wikimedia Commons, with credit and license.
//  2. Openly-licensed illustrative photography from Openverse (commercial-use
//     CC licenses or public domain), with credit and license.
//  3. A simple generated thumbnail: light linear gradient and a few lines.
// Publisher photos from news feeds are never used: they are copyrighted.

import type { Story } from "./desk.ts";
import { hashId } from "./desk.ts";

export type Art = {
  src: string;
  alt: string;
  kind: "photo" | "generated";
  credit?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  fit?: "contain"; // logos and diagrams: show whole, don't crop
  picked?: boolean; // chosen by the AI desk (scripts/desk-ai.ts); kept from then on
};

const UA = "DailySuperIntelligence/1.0 (https://daily-si.com; news site) node-fetch";

// Subjects with free photos on Wikipedia. First match in the headline wins.
const SUBJECTS: [RegExp, string][] = [
  [/\bAltman\b/, "Sam Altman"],
  [/\bAmodei\b/, "Dario Amodei"],
  [/\bHassabis\b/, "Demis Hassabis"],
  [/\bMusk\b/, "Elon Musk"],
  [/\bZuckerberg\b/, "Mark Zuckerberg"],
  [/\bJensen Huang\b|\bHuang\b/, "Jensen Huang"],
  [/\bNadella\b/, "Satya Nadella"],
  [/\bPichai\b/, "Sundar Pichai"],
  [/\bSutskever\b/, "Ilya Sutskever"],
  [/\bHinton\b/, "Geoffrey Hinton"],
  [/\bBengio\b/, "Yoshua Bengio"],
  [/\bLeCun\b/, "Yann LeCun"],
  [/\bSuleyman\b/, "Mustafa Suleyman"],
  [/\bKarpathy\b/, "Andrej Karpathy"],
  [/\bMurati\b/, "Mira Murati"],
  [/\bFei-Fei Li\b/, "Fei-Fei Li"],
  [/\bBezos\b/, "Jeff Bezos"],
  [/\bTrump\b/, "Donald Trump"],
  [/\bXi Jinping\b|\bXi\b/, "Xi Jinping"],
  [/\bvon der Leyen\b/, "Ursula von der Leyen"],
  [/\bStarmer\b/, "Keir Starmer"],
  [/\bMacron\b/, "Emmanuel Macron"],
  [/\bLisa Su\b/, "Lisa Su"],
  [/\bMasayoshi Son\b/, "Masayoshi Son"],
  [/\bTSMC\b/, "TSMC"],
  [/\bWaymo\b/, "Waymo"],
  [/\bPentagon\b/, "The Pentagon"],
  [/\bWhite House\b/, "White House"],
  [/\bCapitol\b|\bCongress\b|\bSenate\b/, "United States Capitol"],
  [/\bEuropean Parliament\b|\bEU\b|\bBrussels\b/, "European Parliament"],
  [/\bDowning Street\b|\bUK government\b/, "10 Downing Street"],
  // Companies and labs: their Wikipedia lead image, usually a logo or headquarters.
  [/\bOpenAI\b/, "OpenAI"],
  [/\bAnthropic\b/, "Anthropic"],
  [/\b(Google )?DeepMind\b/, "Google DeepMind"],
  [/\bMeta\b/, "Meta Platforms"],
  [/\bMicrosoft\b/, "Microsoft"],
  [/\bNvidia\b/i, "Nvidia"],
  [/\bxAI\b/, "xAI (company)"],
  [/\bMistral\b/, "Mistral AI"],
  [/\bHugging Face\b/, "Hugging Face"],
  [/\bSoftBank\b/, "SoftBank Group"],
  [/\bApple\b/, "Apple Inc."],
  [/\bAmazon\b/, "Amazon (company)"],
  [/\bTesla\b/, "Tesla, Inc."],
  [/\bGoogle\b/, "Google"],
  [/\bDeepSeek\b/, "DeepSeek"],
];

// Illustrative photo themes for Openverse, matched against the headline only.
// Only concrete, unambiguous subjects: a loose match (e.g. "AI lab" -> a chemistry
// lab) misleads readers, so anything else gets a generated illustration instead.
const THEMES: { re: RegExp; query: string; key: string }[] = [
  { re: /\b(humanoids?|robots?|robotics|optimus)\b/i, query: "humanoid robot", key: "robot" },
  { re: /\b(self-driving|autonomous vehicles?|robotaxi\w*)\b/i, query: "self-driving car", key: "car" },
  { re: /\bdrones?\b/i, query: "drone flying", key: "drone" },
  { re: /\b(data ?cent(er|re)s?|supercomputers?|server farms?)\b/i, query: "data center servers", key: "datacenter" },
  { re: /\b(gigawatts?|power plants?|nuclear (plant|reactor|power)|electricity|power grid)\b/i, query: "power plant electricity", key: "energy" },
  { re: /\b(chips?|GPUs?|semiconductors?|wafers?|chipmakers?)\b/i, query: "semiconductor chip", key: "chip" },
  { re: /\b(military|pentagon|warfare|soldiers?)\b/i, query: "military technology", key: "military" },
  { re: /\b(congress|senate|parliament|lawmakers|legislat\w*)\b/i, query: "parliament building", key: "policy" },
  { re: /\b(court|lawsuits?|sues?|sued|suing|judge|trial)\b/i, query: "courthouse", key: "court" },
  { re: /\b(layoffs?|jobs|workers|employment|workforce|hiring)\b/i, query: "office workers", key: "work" },
  { re: /\b(students?|schools?|classrooms?|teachers?)\b/i, query: "students classroom", key: "school" },
  { re: /\b(hospitals?|doctors?|patients?|clinical)\b/i, query: "hospital doctor", key: "health" },
  { re: /\b(drug discovery|biology|proteins?|vaccines?|genom\w*)\b/i, query: "biology laboratory", key: "bio" },
  { re: /\b(stock market|IPO|shares (fell|rose|jump\w*|drop\w*)|Wall Street)\b/i, query: "stock exchange", key: "money" },
];

/** The photo subject or stock theme a headline would get (null: generated illustration). */
export function pictureFor(headline: string): { subject?: string; theme?: string } | null {
  const subject = SUBJECTS.find(([re]) => re.test(headline))?.[1];
  if (subject) return { subject };
  const theme = THEMES.find((t) => t.re.test(headline))?.query;
  return theme ? { theme } : null;
}

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate }, signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

type WikiPage = { title: string; pageimage?: string; thumbnail?: { source: string; width: number; height: number } };
type WikiInfo = { imageinfo?: { descriptionurl?: string; extmetadata?: Record<string, { value: string }> }[] };

/** Free (Commons) lead photo of a Wikipedia article, with credit. Cached for a week. */
export async function wikipediaPhoto(title: string): Promise<Art | null> {
  const q = await getJson<{ query?: { pages?: Record<string, WikiPage> } }>(
    "https://en.wikipedia.org/w/api.php?" +
      new URLSearchParams({ action: "query", format: "json", prop: "pageimages", titles: title, piprop: "thumbnail|name", pithumbsize: "960", pilicense: "free", redirects: "1" }),
    604800,
  );
  const page = Object.values(q?.query?.pages ?? {})[0];
  // Logos come as SVG renders and can be small; photos need some resolution.
  if (!page?.thumbnail || !page.pageimage || (page.thumbnail.width < 400 && !/\.svg$/i.test(page.pageimage))) return null;

  const meta = await getJson<{ query?: { pages?: Record<string, WikiInfo> } }>(
    "https://en.wikipedia.org/w/api.php?" +
      new URLSearchParams({ action: "query", format: "json", prop: "imageinfo", titles: `File:${page.pageimage}`, iiprop: "extmetadata|url" }),
    604800,
  );
  const info = Object.values(meta?.query?.pages ?? {})[0]?.imageinfo?.[0];
  const ext = info?.extmetadata ?? {};
  const license = strip(ext.LicenseShortName?.value);
  if (!license || /fair use|non-free/i.test(license)) return null;
  const artist = strip(ext.Artist?.value).slice(0, 80);
  const isLogo = /\.svg$|logo|wordmark|symbol/i.test(page.pageimage);
  return {
    src: page.thumbnail.source,
    alt: isLogo ? `${page.title} logo` : `${page.title} (Wikimedia Commons photo)`,
    fit: isLogo ? "contain" : undefined,
    kind: "photo",
    credit: artist ? `Photo: ${artist} / Wikimedia Commons` : "Photo: Wikimedia Commons",
    license,
    licenseUrl: ext.LicenseUrl?.value,
    sourceUrl: info?.descriptionurl,
  };
}

export type OpenverseResult = {
  id: string;
  title?: string;
  creator?: string;
  license: string;
  license_version?: string;
  license_url?: string;
  foreign_landing_url?: string;
  thumbnail?: string;
  width?: number;
  mature?: boolean;
};

export async function openverse(query: string): Promise<OpenverseResult[]> {
  const json = await getJson<{ results?: OpenverseResult[] }>(
    "https://api.openverse.org/v1/images/?" +
      new URLSearchParams({ q: query, license_type: "commercial", page_size: "20", aspect_ratio: "wide", mature: "false" }),
    86400,
  );
  return (json?.results ?? []).filter((r) => !r.mature && r.thumbnail && (!r.width || r.width >= 600));
}

export function generatedArt(story: Pick<Story, "id" | "headline">): Art {
  return {
    src: `/api/thumb/${story.id}`,
    alt: `Illustration for: ${story.headline}`,
    kind: "generated",
    credit: "Illustration: Daily Super Intelligence",
  };
}

export function openverseArt(r: OpenverseResult, query: string): Art {
  const lic =
    r.license === "pdm" ? "Public domain" : r.license === "cc0" ? "CC0" : `CC ${r.license.toUpperCase()}${r.license_version ? ` ${r.license_version}` : ""}`;
  return {
    src: r.thumbnail!,
    alt: r.title ? `${r.title} (illustrative photo)` : `Illustrative photo: ${query}`,
    kind: "photo",
    credit: r.creator ? `Photo: ${r.creator}` : "Photo via Openverse",
    license: lic,
    licenseUrl: r.license_url,
    sourceUrl: r.foreign_landing_url,
  };
}

export async function artFor(stories: Story[]): Promise<Map<string, Art>> {
  const art = new Map<string, Art>();
  const usedSrc = new Set<string>();

  // 1. Subject photos. A subject's photo is reused at most once per edition.
  const subjects = new Map<string, Story[]>();
  for (const s of stories) {
    const hit = SUBJECTS.find(([re]) => re.test(s.headline));
    if (hit) subjects.set(hit[1], [...(subjects.get(hit[1]) ?? []), s]);
  }
  await Promise.all(
    [...subjects.entries()].map(async ([title, list]) => {
      const photo = await wikipediaPhoto(title);
      if (photo) art.set(list[0].id, photo);
    }),
  );
  for (const a of art.values()) usedSrc.add(a.src);

  // 2. Themed illustrative photos.
  const byTheme = new Map<string, Story[]>();
  for (const s of stories) {
    if (art.has(s.id)) continue;
    const theme = THEMES.find((t) => t.re.test(s.headline));
    if (theme) byTheme.set(theme.key, [...(byTheme.get(theme.key) ?? []), s]);
  }
  await Promise.all(
    [...byTheme.entries()].map(async ([key, list]) => {
      const theme = THEMES.find((t) => t.key === key)!;
      const results = await openverse(theme.query);
      if (!results.length) return;
      for (const s of list) {
        // Deterministic per story, and no photo twice in one edition.
        const start = parseInt(hashId(s.id).slice(0, 6), 36) % results.length;
        for (let k = 0; k < results.length; k++) {
          const r = results[(start + k) % results.length];
          if (usedSrc.has(r.thumbnail!)) continue;
          usedSrc.add(r.thumbnail!);
          art.set(s.id, openverseArt(r, theme.query));
          break;
        }
      }
    }),
  );

  // 3. Everything else gets a generated thumbnail.
  for (const s of stories) if (!art.has(s.id)) art.set(s.id, generatedArt(s));
  return art;
}
