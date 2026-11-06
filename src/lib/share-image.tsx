import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import type { MetricPoint } from "@/lib/metrics";

/**
 * Share images (Open Graph and Twitter), rendered with next/og at build time.
 * They are served from static route handlers named `og.png`, not from
 * `opengraph-image.tsx`: in the static export that file is written without an
 * extension, so a static host sends it with no image Content-Type.
 */
export const SHARE_SIZE = { width: 1200, height: 630 } as const;

const C = {
  canvas: "#0c0e0d",
  surface: "#121513",
  line: "#232825",
  lineStrong: "#333a36",
  fg: "#e6ebe7",
  fg2: "#a7b0aa",
  amber: "#ffb547",
  ok: "#5fbf8a",
} as const;

const FONT_DIR = join(process.cwd(), "assets", "fonts");

async function fonts() {
  const [display, sans, mono, monoMedium] = await Promise.all(
    ["FunnelDisplay-SemiBold.ttf", "FunnelSans-Regular.ttf", "AzeretMono-Regular.ttf", "AzeretMono-Medium.ttf"].map(
      (f) => readFile(join(FONT_DIR, f)),
    ),
  );
  return [
    { name: "Funnel Display", data: display, weight: 600 as const, style: "normal" as const },
    { name: "Funnel Sans", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Azeret Mono", data: mono, weight: 400 as const, style: "normal" as const },
    { name: "Azeret Mono", data: monoMedium, weight: 500 as const, style: "normal" as const },
  ];
}

const label = {
  fontFamily: "Azeret Mono",
  fontSize: 20,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: C.fg2,
};

function Mark() {
  return (
    <svg width="40" height="32" viewBox="0 0 20 16" fill="none">
      <path d="M1 4.25H9.25V12.75H19" stroke={C.fg} strokeWidth="1.75" strokeLinecap="square" />
      <path d="M12.5 15.25H19" stroke={C.amber} strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function Frame({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.canvas,
        color: C.fg,
        padding: "56px 64px",
        fontFamily: "Funnel Sans",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Mark />
          <span style={{ fontFamily: "Funnel Display", fontSize: 40, letterSpacing: "-0.035em" }}>weir</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, ...label }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.ok }} />
          {tag}
        </div>
      </div>
      {children}
    </div>
  );
}

function Stat({ name, value, first }: { name: string; value: string; first?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingLeft: first ? 0 : 36,
        paddingRight: 36,
        borderLeft: first ? "none" : `1px solid ${C.lineStrong}`,
      }}
    >
      <span style={label}>{name}</span>
      <span style={{ fontFamily: "Azeret Mono", fontWeight: 500, fontSize: 44, color: C.fg }}>{value}</span>
    </div>
  );
}

/** Latency over 24 hours from zero, as a thin amber line with the median as a hairline. */
function Sparkline({ series, median }: { series: MetricPoint[]; median: number }) {
  const w = 300;
  const h = 96;
  const max = Math.max(...series.map((p) => p.latencyMs)) * 1.08;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (v: number) => h - (v / max) * h;
  const d = series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.latencyMs).toFixed(1)}`).join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginLeft: "auto" }}>
      <span style={label}>Latency · 24h</span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={`M0 ${h - 0.5}H${w}`} stroke={C.line} strokeWidth="1" />
        <path d={`M0 ${y(median).toFixed(1)}H${w}`} stroke={C.fg2} strokeWidth="1" strokeOpacity="0.6" />
        <path d={d} stroke={C.amber} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export interface ModelShare {
  name: string;
  publisher: string;
  tasks: string[];
  stats: { name: string; value: string }[];
  series: MetricPoint[];
  median: number;
}

export async function modelShareImage(m: ModelShare): Promise<ImageResponse> {
  const long = m.name.length > 24;
  return new ImageResponse(
    (
      <Frame tag="Live · serverless">
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <span style={label}>
            {m.publisher} · {m.tasks.join(" · ")}
          </span>
          <span
            style={{
              fontFamily: "Funnel Display",
              fontSize: long ? 76 : 96,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              marginTop: 20,
              maxWidth: 1060,
            }}
          >
            {m.name}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            marginTop: 52,
            paddingTop: 36,
            borderTop: `1px solid ${C.line}`,
          }}
        >
          {m.stats.map((s, i) => (
            <Stat key={s.name} name={s.name} value={s.value} first={i === 0} />
          ))}
          <Sparkline series={m.series} median={m.median} />
        </div>
      </Frame>
    ),
    { ...SHARE_SIZE, fonts: await fonts() },
  );
}

export async function siteShareImage({
  headline,
  muted,
  facts,
}: {
  headline: string;
  muted: string;
  facts: { name: string; value: string }[];
}): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <Frame tag="All systems normal">
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <span style={{ fontFamily: "Funnel Display", fontSize: 80, lineHeight: 1.04, letterSpacing: "-0.03em" }}>
            {headline}
          </span>
          <span
            style={{
              fontFamily: "Funnel Display",
              fontSize: 80,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: C.fg2,
            }}
          >
            {muted}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 52,
            paddingTop: 36,
            borderTop: `1px solid ${C.line}`,
          }}
        >
          {facts.map((s, i) => (
            <Stat key={s.name} name={s.name} value={s.value} first={i === 0} />
          ))}
        </div>
      </Frame>
    ),
    { ...SHARE_SIZE, fonts: await fonts() },
  );
}
