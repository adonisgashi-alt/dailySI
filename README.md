# Daily Super Intelligence

**The newspaper of record for the superintelligence era.** An automated newsroom that covers one beat (superintelligence, AGI, frontier AI, and AI's effect on human work) and prints only stories it has confirmed.

## What it does

- **Auto-publishing wire.** Reads ~20 RSS/Atom feeds (newsrooms, Google News searches, and primary sources such as OpenAI and Google DeepMind) every 10 minutes using Next.js ISR. No database and no cron job needed.
- **Confirmed before it prints.** Reports of the same event are grouped by IDF-weighted headline similarity. A story reaches the front page only when **≥2 independent outlets** report it, or when it comes from a **primary source**. Single-source reports wait in a public *Verification Queue*. Each story shows its basis, a confidence bar, and links to every source.
- **Daily risk meters.** *AI Replacing Humans Risk* and *AI Extinction Risk*, published once a day at 00:00 UTC (a GitHub Action records each day's reading in `data/risk-history.json` for the trend line). The replacement meter: A live 0–100 gauge of how strongly the week's *confirmed* news points toward AI replacing human work. It weighs pressure signals (layoffs, automation, agents, superhuman results, self-improvement) against relief signals (regulation, safety, job creation, capability limits). Readings decay with age and are weighted by corroboration. Each meter lists its top drivers.
- **Imagery.** Free-licensed Wikimedia Commons photos of the story's subject, then openly licensed photos from [Openverse](https://openverse.org), always credited. When neither fits, a simple light-gradient illustration (`/api/thumb/[id]`). Publisher photos are never reused.
- **Pages.** Front page, Latest, eight sections, Risk Meters, Awaiting Confirmation, story pages, Standards.
- **Discoverable.** `robots.txt` explicitly welcomes AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and more), plus `sitemap.xml`, `feed.xml` (RSS), `llms.txt` and schema.org `NewsArticle` data on every story.
- **Open data.** The full edition is available as JSON at `/api/news`.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # desk / verification / risk unit tests
npm run typecheck
```

Offline development: set `DAILYSI_FIXTURES=/path/to/dir` to read `<dir>/<n>.xml` (where `n` is the index into `lib/sources.ts`) instead of fetching the feeds.

## Where things live

| File | Purpose |
| --- | --- |
| `lib/sources.ts` | Feeds monitored; `primary` marks first-party sources |
| `lib/desk.ts` | Relevance filter, clustering, verification standard, ranking |
| `lib/risk.ts`, `lib/daily.ts` | Risk meters and the daily reading |
| `lib/sections.ts` | Sections and how stories are filed |
| `scripts/daily-risk.ts` | Records the daily reading (run by `.github/workflows/daily-risk.yml`) |
| `lib/images.ts` | Openverse photos plus generated-thumbnail fallback |
| `lib/news.ts` | Builds an edition (fetch → desk → art → risk) |
| `app/` | Front page, story pages, `/about` methodology, APIs |

## Deploy

Deployed on Vercel from this repository. Every push to the production branch redeploys. No environment variables are required.
