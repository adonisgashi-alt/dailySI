// Generated thumbnails for stories without a suitable free photo: a light
// linear gradient with a few simple lines, seeded by the story id so each
// story keeps its own image.

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Pairs of light tones and a slightly deeper line color.
const PALETTES: [string, string, string][] = [
  ["#e8f3f5", "#cfe3f7", "#5b8fb0"],
  ["#f6efe4", "#f1dcd0", "#b0775b"],
  ["#eef4ea", "#d9ead9", "#5f9470"],
  ["#f1edf8", "#dcd6f2", "#7a6db3"],
  ["#f7f3e3", "#e9edd5", "#99924a"],
  ["#eaf1f8", "#e6e2f3", "#6b7fb8"],
  ["#f8ecec", "#efe3d7", "#b0676b"],
];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = rng(id);
  const [a, b, line] = PALETTES[Math.floor(r() * PALETTES.length)];
  const W = 1200;
  const H = 750;
  const angle = Math.floor(r() * 4); // gradient direction
  const [x1, y1, x2, y2] = [["0", "0", "1", "1"], ["0", "1", "1", "0"], ["0", "0", "1", "0"], ["0", "0", "0", "1"]][angle];

  const style = Math.floor(r() * 3);
  const shapes: string[] = [];
  if (style === 0) {
    // Parallel diagonals
    const n = 5 + Math.floor(r() * 4);
    const slope = 0.35 + r() * 0.5;
    const gap = 70 + r() * 50;
    const off = r() * 400;
    for (let i = 0; i < n; i++) {
      const y = off + i * gap;
      shapes.push(`<line x1="-50" y1="${y + 300}" x2="${W + 50}" y2="${y + 300 - (W + 100) * slope}" stroke="${line}" stroke-opacity="${(0.18 + r() * 0.3).toFixed(2)}" stroke-width="${(1 + r() * 2).toFixed(1)}"/>`);
    }
  } else if (style === 1) {
    // Gentle waves
    const n = 4 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const y = 180 + i * (420 / n) + r() * 30;
      const amp = 30 + r() * 60;
      const ph = r() * W;
      shapes.push(`<path d="M -20 ${y} C ${W * 0.3 + ph * 0.1} ${y - amp}, ${W * 0.6 - ph * 0.1} ${y + amp}, ${W + 20} ${y - amp * 0.3}" fill="none" stroke="${line}" stroke-opacity="${(0.2 + r() * 0.3).toFixed(2)}" stroke-width="${(1.2 + r() * 1.8).toFixed(1)}"/>`);
    }
  } else {
    // Concentric arcs from an off-canvas center
    const cx = r() < 0.5 ? -100 - r() * 200 : W + 100 + r() * 200;
    const cy = H * (0.2 + r() * 0.6);
    const n = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      shapes.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(380 + i * (70 + r() * 25)).toFixed(0)}" fill="none" stroke="${line}" stroke-opacity="${(0.18 + r() * 0.3).toFixed(2)}" stroke-width="${(1 + r() * 2).toFixed(1)}"/>`);
    }
  }
  // One small accent dot
  shapes.push(`<circle cx="${(W * (0.15 + r() * 0.7)).toFixed(0)}" cy="${(H * (0.2 + r() * 0.6)).toFixed(0)}" r="${(6 + r() * 6).toFixed(1)}" fill="${line}" fill-opacity="0.55"/>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${shapes.join("")}</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
