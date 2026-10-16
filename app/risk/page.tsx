import type { Metadata } from "next";
import Link from "next/link";
import { getEdition } from "@/lib/news";
import { METERS, type MeterId } from "@/lib/risk";
import { Meter } from "@/components/Meter";
import { storyPath } from "@/lib/slug";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Risk Meters: AI Replacing Humans & AI Extinction Risk",
  description: "Two daily meters of what the week's confirmed news says about AI replacing human work and AI as a threat to humanity.",
  alternates: { canonical: "/risk" },
};

export default async function RiskPage() {
  const ed = await getEdition();
  const ids: MeterId[] = ["replacement", "extinction"];
  return (
    <div className="page">
      <div className="section-intro">
        <h1>Risk Meters</h1>
        <p>
          Two gauges, updated once a day at midnight UTC, that read the week&apos;s confirmed news alongside public data. Reading for {ed.today.date}.
        </p>
      </div>

      {ids.map((id) => {
        const r = ed.today[id];
        const def = METERS[id];
        return (
          <section key={id} style={{ marginBottom: 34 }}>
            <Meter reading={r} days={ed.history} drivers />
            <h2 className="hl-m" style={{ marginTop: 18 }}>How today&apos;s reading is built</h2>
            <ul className="drivers">
              <li>
                <span className="d">{r.news ?? r.index}</span>
                <span><b>News.</b> {r.basedOn} relevant confirmed stories from the past seven days{r.scoredByAI ? `, ${r.scoredByAI} judged by our AI risk desk` : ""}.</span>
              </li>
              {r.anchor ? (
                r.anchor.parts.map((p) => (
                  <li key={p.label}>
                    <span className="d">{p.index}</span>
                    <span><b>{p.label}.</b> {p.value} as of {p.asOf} ({p.source}).</span>
                  </li>
                ))
              ) : (
                <li>
                  <span className="d">–</span>
                  <span><b>Public data.</b> Not yet connected; the reading is the news component alone.</span>
                </li>
              )}
              {r.raw !== undefined && r.raw !== r.index && (
                <li>
                  <span className="d">{r.raw}</span>
                  <span><b>Daily limit.</b> The combined reading was {r.raw}; a meter moves at most 3 points a day, so it reads {r.index}.</span>
                </li>
              )}
            </ul>
            <h2 className="hl-m" style={{ marginTop: 18 }}>What moved the {def.short} meter</h2>
            {r.components.length === 0 ? (
              <p className="summary">No strong signals this week; the news component sits at its baseline of {def.baseline}.</p>
            ) : (
              <ul className="drivers">
                {r.components.map((c) => (
                  <li key={c.label}>
                    <span className="d" style={{ color: c.value > 0 ? "var(--danger)" : "var(--ok)" }}>{c.value > 0 ? "+" : ""}{c.value}</span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.drivers.some((d) => d.reason) && (
              <ul className="drivers" style={{ marginTop: 10 }}>
                {r.drivers.filter((d) => d.reason).map((d) => (
                  <li key={d.storyId}>
                    <span className="d" style={{ color: d.delta > 0 ? "var(--danger)" : "var(--ok)" }}>{d.delta > 0 ? "▲" : "▼"}</span>
                    <span><Link href={storyPath({ id: d.storyId, headline: d.headline })}><b>{d.headline}</b></Link> {d.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="meta" style={{ marginTop: 8 }}>
              Pressure {r.pressure} · Relief {r.relief} · News baseline {def.baseline}
            </p>
          </section>
        );
      })}

      {ed.history.length > 1 && (
        <section>
          <h2 className="hl-m">Daily history</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--rule-strong)" }}>
                <th style={{ padding: "6px 0" }}>Date</th><th>AI replacing humans</th><th>AI extinction risk</th>
              </tr>
            </thead>
            <tbody>
              {[...ed.history].reverse().slice(0, 30).map((h) => (
                <tr key={h.date} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td style={{ padding: "6px 0" }}>{h.date}</td>
                  <td>{h.replacement.index} · {h.replacement.level}</td>
                  <td>{h.extinction.index} · {h.extinction.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="prose">
        <h2>How the meters work</h2>
        <p>
          Each meter is built from two parts. <b>News</b>: every confirmed story from the past seven days is scored from −2
          (strong evidence against the risk) to +2 (strong evidence for) using the signals listed below; some stories were
          judged individually by an AI risk desk while it ran, and those verdicts are kept. The scores are averaged, with newer stories and stories confirmed by more outlets counting for more, and pulled toward the
          baseline when there are few stories, so a busy news week does not move the needle by itself. <b>Public data</b>: where
          we have it, slow-moving public indicators make up half of the reading. Finally, a meter moves at most 3 points a day.
        </p>
        <p>
          <b>Public data.</b> AI replacing humans: Indeed job postings for software development, customer service and administrative
          work compared with all postings since February 2020 (via FRED), and the pace of notable AI model releases by companies (Epoch
          AI). AI extinction risk: the pace of model releases and the rate of reported AI incidents (AI Incident Database). Each is
          scored so that &quot;no change&quot; sits at the meter&apos;s baseline. The method changed on 16 October 2026; earlier
          readings counted keywords in headlines.
        </p>
        <p>
          <b>AI Replacing Humans Risk</b> (news baseline 52). Evidence for: workers being replaced, AI-linked layoffs, automation, autonomous
          agents, superhuman results, self-improving systems, humanoid robots. Evidence against: regulation, safety measures, job creation and
          augmentation, documented capability limits, worker pushback.
        </p>
        <p>
          <b>AI Extinction Risk</b> (news baseline 30). Evidence for: existential warnings, loss of control, deceptive or misaligned behavior,
          self-improvement, weapons capabilities, military AI, race dynamics, safety-team departures. Evidence against: international
          coordination, safety testing, alignment progress, regulation and compute governance, pauses, capability limits.
        </p>
        <p>
          Bands: Low (under 25), Guarded (25–44), Elevated (45–61), High (62–79), Severe (80+). <i>The meters measure what the news says.
          They are not probabilities or forecasts.</i> See also our <Link href="/about">standards</Link>.
        </p>
      </div>
    </div>
  );
}
