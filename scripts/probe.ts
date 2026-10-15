export {};
// Checks which public data sources the indicators job can reach (manual run:
// .github/workflows/probe.yml). Prints status and the start of each response.

const URLS = (process.env.PROBE_URLS ?? "").split(/\s+/).filter(Boolean);
const DEFAULT = [
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUS",
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPSOFTDEVE",
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPCUSTSERV",
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPADMIASSI",
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPBANKFINA",
  "https://api.manifold.markets/v0/search-markets?term=AI%20extinction&limit=8",
  "https://api.manifold.markets/v0/search-markets?term=human%20extinction%20AI%202100&limit=8",
  "https://api.manifold.markets/v0/search-markets?term=AGI%20before&limit=8",
  "https://www.metaculus.com/api/posts/?search=AGI&limit=3",
  "https://www.metaculus.com/api2/questions/3479/",
  "https://incidentdatabase.ai/rss.xml",
  "https://epoch.ai/data/notable_ai_models.csv",
  "https://epoch.ai/data/all_ai_models.csv",
];

for (const url of URLS.length ? URLS : DEFAULT) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DailySuperIntelligence/1.0; +https://www.daily-si.com)", Accept: "*/*" },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    console.log(`\n== ${res.status} ${res.headers.get("content-type")} ${text.length}B ${url}`);
    console.log(text.slice(0, 1500).replace(/\s+\n/g, "\n"));
    if (/\.csv|fredgraph/.test(url)) console.log("...\n" + text.trim().split("\n").slice(-4).join("\n"));
  } catch (e) {
    console.log(`\n== ERR ${(e as Error).message} ${url}`);
  }
}
