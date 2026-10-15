// The wire: outlets The Daily SI listens to.
//
// `outlet` is what counts for verification — two feeds from the same outlet
// never corroborate each other. `primary` marks first-party sources (the labs
// and institutes themselves): an announcement there is confirmed by
// definition, because the source *is* the news.

export type Source = {
  outlet: string;
  url: string;
  primary?: boolean;
};

export const SOURCES: Source[] = [
  // Newsrooms
  { outlet: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  { outlet: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { outlet: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { outlet: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { outlet: "Wired", url: "https://www.wired.com/feed/tag/ai/latest/rss" },
  { outlet: "VentureBeat", url: "https://venturebeat.com/category/ai/feed/" },
  { outlet: "The Guardian", url: "https://www.theguardian.com/technology/artificialintelligenceai/rss" },
  { outlet: "BBC News", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { outlet: "The Register", url: "https://www.theregister.com/software/ai_ml/headlines.atom" },
  { outlet: "IEEE Spectrum", url: "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss" },
  { outlet: "Axios", url: "https://api.axios.com/feed/technology" },
  // Aggregated search across thousands of outlets; each item is attributed to
  // its real publisher (see `source` element), so it still corroborates properly.
  { outlet: "Google News", url: "https://news.google.com/rss/search?q=superintelligence+OR+AGI+OR+%22frontier+AI%22+when:3d&hl=en-US&gl=US&ceid=US:en" },
  { outlet: "Google News", url: "https://news.google.com/rss/search?q=OpenAI+OR+Anthropic+OR+DeepMind+OR+%22AI+safety%22+when:2d&hl=en-US&gl=US&ceid=US:en" },
  { outlet: "Google News", url: "https://news.google.com/rss/search?q=%22AI%22+jobs+automation+replace+workers+when:3d&hl=en-US&gl=US&ceid=US:en" },

  // Primary sources
  { outlet: "OpenAI", url: "https://openai.com/news/rss.xml", primary: true },
  { outlet: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", primary: true },
  { outlet: "Google AI", url: "https://blog.google/technology/ai/rss/", primary: true },
  { outlet: "Microsoft AI", url: "https://blogs.microsoft.com/ai/feed/", primary: true },
  { outlet: "NVIDIA", url: "https://blogs.nvidia.com/feed/", primary: true },
  { outlet: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", primary: true },
];

// Outlets whose items are primary when they show up via an aggregator.
export const PRIMARY_OUTLETS = new Set(
  ["OpenAI", "Anthropic", "Google DeepMind", "Google AI", "Microsoft AI", "Meta AI", "NVIDIA", "Hugging Face", "xAI", "Mistral AI"].map(
    (o) => o.toLowerCase(),
  ),
);
