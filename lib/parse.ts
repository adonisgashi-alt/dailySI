import { XMLParser } from "fast-xml-parser";

export type RawItem = {
  title: string;
  link: string;
  outlet: string;
  publishedAt: number; // epoch ms
  summary: string;
  primary: boolean;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
});

const asArray = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return text((v as Record<string, unknown>)["#text"]);
  return "";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#?\w+);/g, (m, e: string) => {
      if (ENTITIES[e]) return ENTITIES[e];
      if (e.startsWith("#x")) return String.fromCodePoint(parseInt(e.slice(2), 16));
      if (e.startsWith("#")) return String.fromCodePoint(parseInt(e.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string, max = 320): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function atomLink(link: unknown): string {
  for (const l of asArray(link as Record<string, string> | Record<string, string>[])) {
    if (typeof l === "string") return l;
    if (!l["@rel"] || l["@rel"] === "alternate") return l["@href"] ?? "";
  }
  return "";
}

/**
 * Parse an RSS 2.0 or Atom document. `outlet` is the feed's outlet; items from
 * aggregators (Google News) are re-attributed to the publisher they name, and
 * the " - Publisher" suffix is removed from their titles.
 */
export function parseFeed(xml: string, outlet: string, primary = false, primaryOutlets?: Set<string>): RawItem[] {
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const out: RawItem[] = [];

  const rssItems = asArray(doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item);
  for (const it of rssItems) {
    let title = stripHtml(text(it.title));
    let itemOutlet = outlet;
    const src = text(it.source);
    if (src) {
      itemOutlet = src.trim();
      const suffix = ` - ${itemOutlet}`;
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
    }
    const date = Date.parse(text(it.pubDate) || text(it["dc:date"]));
    const summarySource = src ? "" : text(it.description) || text(it["content:encoded"]);
    out.push({
      title,
      link: text(it.link).trim() || text(it.guid).trim(),
      outlet: itemOutlet,
      publishedAt: Number.isNaN(date) ? 0 : date,
      summary: clip(stripHtml(summarySource)),
      primary: primary || (primaryOutlets?.has(itemOutlet.toLowerCase()) ?? false),
    });
  }

  for (const it of asArray(doc?.feed?.entry)) {
    const date = Date.parse(text(it.published) || text(it.updated));
    out.push({
      title: stripHtml(text(it.title)),
      link: atomLink(it.link).trim(),
      outlet,
      publishedAt: Number.isNaN(date) ? 0 : date,
      summary: clip(stripHtml(text(it.summary) || text(it.content))),
      primary,
    });
  }

  return out.filter((i) => i.title && /^https?:\/\//.test(i.link));
}
