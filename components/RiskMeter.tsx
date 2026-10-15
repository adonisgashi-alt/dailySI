"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RiskReading } from "@/lib/risk";

const BANDS = [
  { to: 25, color: "#2e9d6a" },
  { to: 45, color: "#8fb339" },
  { to: 62, color: "#e0a400" },
  { to: 80, color: "#e2611b" },
  { to: 100, color: "#c62828" },
];

function arc(from: number, to: number, r = 100, cx = 120, cy = 120) {
  const a = (v: number) => Math.PI * (1 - v / 100);
  const [x1, y1] = [cx + r * Math.cos(a(from)), cy - r * Math.sin(a(from))];
  const [x2, y2] = [cx + r * Math.cos(a(to)), cy - r * Math.sin(a(to))];
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function RiskMeter({ initial }: { initial: RiskReading }) {
  const [risk, setRisk] = useState(initial);
  const [shown, setShown] = useState(0);
  const [checked, setChecked] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShown(risk.index), 60);
    return () => clearTimeout(t);
  }, [risk.index]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/risk", { cache: "no-store" });
        if (res.ok && alive) {
          setRisk((await res.json()) as RiskReading);
          setChecked(Date.now());
        }
      } catch {}
    };
    const t = setInterval(poll, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const band = BANDS.find((b) => risk.index <= b.to) ?? BANDS[4];
  let prev = 0;

  return (
    <section className="risk" aria-labelledby="risk-title">
      <h4 id="risk-title">
        <span>AI Replacing Humans Risk</span>
        <span className="pulse" style={{ fontWeight: 400, letterSpacing: "0.04em" }}>live</span>
      </h4>
      <svg className="gauge" viewBox="0 0 240 132" role="img" aria-label={`AI replacing humans risk: ${risk.index} of 100, ${risk.level}`}>
        {BANDS.map((b) => {
          const d = arc(prev + 0.6, b.to - 0.6);
          prev = b.to;
          return <path key={b.to} d={d} stroke={b.color} strokeWidth="16" fill="none" />;
        })}
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI * (1 - i / 10);
          return (
            <line key={i} x1={120 + 82 * Math.cos(a)} y1={120 - 82 * Math.sin(a)} x2={120 + 76 * Math.cos(a)} y2={120 - 76 * Math.sin(a)} stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
          );
        })}
        <g className="needle" style={{ transform: `rotate(${-90 + shown * 1.8}deg)` }}>
          <path d="M 117 120 L 120 34 L 123 120 Z" fill="currentColor" />
        </g>
        <circle cx="120" cy="120" r="8" fill="currentColor" />
        <circle cx="120" cy="120" r="3" fill={band.color} />
      </svg>
      <div className="readout">
        <strong>{risk.index}</strong>
        <span style={{ color: band.color }}>{risk.level}</span>
      </div>
      <p className="fine" style={{ textAlign: "center", marginTop: 4 }}>
        Pressure {risk.pressure} · Relief {risk.relief} · {risk.basedOn} confirmed stories, 7-day window
      </p>
      {risk.drivers.length > 0 && (
        <ul className="clean drivers">
          {risk.drivers.map((d) => (
            <li key={d.storyId + d.label}>
              <span className="d" style={{ color: d.delta > 0 ? "var(--danger)" : "var(--ok)" }}>
                {d.delta > 0 ? "▲" : "▼"} {Math.abs(d.delta).toFixed(1)}
              </span>
              <span>
                <b>{d.label}.</b> <Link href={`/story/${d.storyId}`}>{d.headline}</Link>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="fine">
        How likely is AI to replace human work, judged by this week&apos;s confirmed news. An editorial signal, not a forecast.{" "}
        <Link href="/about#risk" style={{ textDecoration: "underline" }}>Methodology</Link>
        {checked && <> · re-checked {new Date(checked).toLocaleTimeString()}</>}
      </p>
    </section>
  );
}
