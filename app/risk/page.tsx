import type { Metadata } from "next";
import Link from "next/link";
import { getEdition } from "@/lib/news";
import { METERS, type MeterId } from "@/lib/risk";
import { Meter } from "@/components/Meter";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Risk Meters: AI Replacing Humans & AI Extinction Risk",
  description: "Two daily meters of what the week's confirmed news says about AI replacing human work and AI as a threat to humanity.",
  alternates: { canonical: "/risk" },
};

export default async function RiskPage() {
  const ed = await getEdition();
  const prev = ed.history.length > 1 ? ed.history[ed.history.length - 2] : undefined;
  const ids: MeterId[] = ["replacement", "extinction"];
  return (
    <div className="page">
      <div className="section-intro">
        <h1>Risk Meters</h1>
        <p>
          Two gauges, updated once a day at midnight UTC, that read the week&apos;s confirmed news. Reading for {ed.today.date}.
        </p>
      </div>

      {ids.map((id) => {
        const r = ed.today[id];
        const def = METERS[id];
        return (
          <section key={id} style={{ marginBottom: 34 }}>
            <Meter reading={r} previous={prev?.[id]} history={ed.history.map((h) => h[id].index)} drivers />
            <h2 className="hl-m" style={{ marginTop: 18 }}>What moved the {def.short} meter</h2>
            {r.components.length === 0 ? (
              <p className="summary">No strong signals this week; the meter sits at its baseline of {def.baseline}.</p>
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
            <p className="meta" style={{ marginTop: 8 }}>
              Pressure {r.pressure} · Relief {r.relief} · Baseline {def.baseline} · Based on {r.basedOn} confirmed stories
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
          Every day at midnight UTC, each confirmed story from the past seven days is checked for <b>pressure signals</b> (news that
          points toward the risk) and <b>relief signals</b> (news that points away from it). Newer stories and stories confirmed by
          more outlets count for more. The net signal moves the needle away from a baseline along a smooth curve, so no single
          headline can pin it.
        </p>
        <p>
          <b>AI Replacing Humans Risk</b> (baseline 52). Pressure: workers being replaced, AI-linked layoffs, automation, autonomous
          agents, superhuman results, self-improving systems, humanoid robots. Relief: regulation, safety measures, job creation and
          augmentation, documented capability limits, worker pushback.
        </p>
        <p>
          <b>AI Extinction Risk</b> (baseline 30). Pressure: existential warnings, loss of control, deceptive or misaligned behavior,
          self-improvement, weapons capabilities, military AI, race dynamics, safety-team departures. Relief: international
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
