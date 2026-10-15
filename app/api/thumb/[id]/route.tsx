import { ImageResponse } from "next/og";

// Generated thumbnails: a deterministic "neural field" composition seeded by
// the story id, so every story gets its own artwork with no copyright issues.

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ["#04070d", "#3fe0ee", "#7b5cff"],
  ["#0a0612", "#ff4fd8", "#4f7cff"],
  ["#050b08", "#3ccf8e", "#e8f05a"],
  ["#100605", "#ff8a3d", "#ff3d6e"],
  ["#06070f", "#9aa8ff", "#3fe0ee"],
];

const KEYWORDS = /\b(AGI|ASI|superintelligen\w*|safety|alignment|agents?|robots?|chips?|compute|jobs|regulation|model|GPT-\d+|Claude|Gemini|Grok|Llama|OpenAI|Anthropic|DeepMind|xAI)\b/i;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const title = new URL(req.url).searchParams.get("t") ?? "";
  const r = rng(id);
  const [bg, c1, c2] = PALETTES[Math.floor(r() * PALETTES.length)];
  const word = (title.match(KEYWORDS)?.[0] ?? "SIGNAL").toUpperCase();

  const nodes = Array.from({ length: 26 }, () => ({ x: r() * 1200, y: r() * 750, s: 3 + r() * 9 }));
  const links: { a: number; b: number }[] = [];
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    near.forEach((o) => links.push({ a: i, b: o.j }));
  });
  const rings = Array.from({ length: 5 }, (_, i) => 120 + i * 70 + r() * 30);
  const cx = 300 + r() * 600;
  const cy = 200 + r() * 350;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
    <defs>
      <radialGradient id="g" cx="${cx / 12}%" cy="${cy / 7.5}%" r="70%"><stop offset="0" stop-color="${c2}" stop-opacity="0.55"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient>
      <pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${c1}" stroke-opacity="0.08"/></pattern>
    </defs>
    <rect width="1200" height="750" fill="${bg}"/>
    <rect width="1200" height="750" fill="url(#g)"/>
    <rect width="1200" height="750" fill="url(#p)"/>
    ${rings.map((rr, i) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${i % 2 ? c1 : c2}" stroke-opacity="${0.5 - i * 0.08}" stroke-width="${i === 0 ? 3 : 1.5}" stroke-dasharray="${i % 2 ? "4 10" : "none"}"/>`).join("")}
    ${links.map((l) => `<line x1="${nodes[l.a].x}" y1="${nodes[l.a].y}" x2="${nodes[l.b].x}" y2="${nodes[l.b].y}" stroke="${c1}" stroke-opacity="0.35" stroke-width="1.5"/>`).join("")}
    ${nodes.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${n.s}" fill="${c1}" fill-opacity="0.9"/>`).join("")}
    <circle cx="${cx}" cy="${cy}" r="34" fill="${c1}"/>
  </svg>`;
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={1200} height={750} alt="" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", left: 56, top: 48, right: 56, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 26, letterSpacing: 8, color: c1, display: "flex" }}>DAILY SUPER INTELLIGENCE · {id.slice(0, 6).toUpperCase()}</div>
          <div style={{ fontSize: Math.min(120, Math.floor(1700 / word.length)), fontWeight: 800, color: "#ffffff", letterSpacing: -2, display: "flex" }}>{word}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 750, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
