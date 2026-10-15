import Link from "next/link";
import { METERS, type RiskReading } from "@/lib/risk";

const BANDS = [
  { to: 25, color: "#2e9d6a" },
  { to: 45, color: "#8fb339" },
  { to: 62, color: "#d9a300" },
  { to: 80, color: "#e2611b" },
  { to: 100, color: "#c62828" },
];

export const bandColor = (i: number) => (BANDS.find((b) => i <= b.to) ?? BANDS[4]).color;

function arc(from: number, to: number, r = 100, cx = 120, cy = 120) {
  const a = (v: number) => Math.PI * (1 - v / 100);
  const p = (v: number) => `${(cx + r * Math.cos(a(v))).toFixed(2)} ${(cy - r * Math.sin(a(v))).toFixed(2)}`;
  return `M ${p(from)} A ${r} ${r} 0 0 1 ${p(to)}`;
}

export function Gauge({ index, label }: { index: number; label: string }) {
  let prev = 0;
  return (
    <svg className="gauge" viewBox="0 0 240 128" role="img" aria-label={label}>
      {BANDS.map((b) => {
        const d = arc(prev + 0.7, b.to - 0.7);
        prev = b.to;
        return <path key={b.to} d={d} stroke={b.color} strokeWidth="14" fill="none" />;
      })}
      {Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI * (1 - i / 10);
        return <line key={i} x1={120 + 84 * Math.cos(a)} y1={120 - 84 * Math.sin(a)} x2={120 + 78 * Math.cos(a)} y2={120 - 78 * Math.sin(a)} stroke="#121212" strokeOpacity="0.4" strokeWidth="1.5" />;
      })}
      <g className="needle" style={{ ["--angle" as string]: `${-90 + index * 1.8}deg` }}>
        <path d="M 117.5 120 L 120 36 L 122.5 120 Z" fill="#121212" />
      </g>
      <circle cx="120" cy="120" r="7" fill="#121212" />
      <circle cx="120" cy="120" r="2.6" fill={bandColor(index)} />
    </svg>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 240;
  const h = 34;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - (v / 100) * (h - 6)).toFixed(1)}`);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="#dfdfdf" />
      <polyline points={pts.join(" ")} fill="none" stroke="#121212" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Meter({
  reading,
  previous,
  history = [],
  drivers = true,
}: {
  reading: RiskReading;
  previous?: RiskReading;
  history?: number[];
  drivers?: boolean;
}) {
  const def = METERS[reading.meter];
  const chg = previous ? reading.index - previous.index : null;
  return (
    <section className="meter" aria-labelledby={`m-${reading.meter}`}>
      <h3 id={`m-${reading.meter}`}>{def.name}</h3>
      <p className="q">{def.question}</p>
      <Gauge index={reading.index} label={`${def.name}: ${reading.index} out of 100, ${reading.level}`} />
      <div className="readout">
        <strong>{reading.index}</strong>
        <span style={{ color: bandColor(reading.index) }}>{reading.level}</span>
        {chg !== null && (
          <span className="chg" style={{ color: chg > 0 ? "var(--danger)" : chg < 0 ? "var(--ok)" : "var(--ink-3)" }}>
            {chg > 0 ? `▲ ${chg}` : chg < 0 ? `▼ ${-chg}` : "— 0"} vs yesterday
          </span>
        )}
      </div>
      {history.length > 1 && <Sparkline values={history} />}
      {drivers && reading.drivers.length > 0 && (
        <ul className="drivers">
          {reading.drivers.slice(0, 3).map((d) => (
            <li key={d.storyId + d.label}>
              <span className="d" style={{ color: d.delta > 0 ? "var(--danger)" : "var(--ok)" }}>
                {d.delta > 0 ? "▲" : "▼"}{Math.abs(d.delta).toFixed(1)}
              </span>
              <span><b>{d.label}.</b> {d.headline}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MeterNote() {
  return (
    <p className="note" style={{ marginTop: 10 }}>
      Updated daily at 00:00 UTC from the week&apos;s confirmed news. Editorial signals, not forecasts. <Link href="/risk" style={{ textDecoration: "underline" }}>Full readings &amp; method</Link>
    </p>
  );
}
