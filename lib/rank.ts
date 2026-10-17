// The editor's algorithm. No AI calls here — pure maths, runs in milliseconds.
//
//   score = 0.45·similarity(reader, article)      ← pgvector / cosine
//         + 0.30·θ_section  where θ ~ Beta(a, b)    ← Thompson sampling: learned taste + built-in exploration
//         + 0.15·recency                            ← exp(−age / 18h)
//         + 0.10·coverage                           ← how many other outlets carry the same story
//
//   then MMR (maximal marginal relevance) picks a diverse set, ~15% of slots go to
//   "Off your beat" stories outside the reader's bubble, and layout size follows confidence.
import type { Article, Profile, Story, StorySize, TopicStats } from "./types";
import { dot } from "./vec";

const PRIOR = { a: 1, b: 1 };

export const stat = (s: TopicStats, section: string) => s[section] ?? PRIOR;
export const affinity = (s: TopicStats, section: string) => {
  const { a, b } = stat(s, section);
  return a / (a + b);
};

// ── Beta sampling via two Gamma draws (Marsaglia–Tsang) ──
function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function gamma(k: number): number {
  if (k < 1) return gamma(k + 1) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = gauss();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
export function betaSample(a: number, b: number) {
  const x = gamma(a);
  const y = gamma(b);
  return x / (x + y);
}

const words = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

type Scored = Article & {
  sim: number | null;
  theta: number;
  recency: number;
  coverage: number;
  score: number;
  _w: Set<string>;
};

function pairSim(x: Scored, y: Scored) {
  if (x.embedding && y.embedding) return dot(x.embedding, y.embedding);
  const j = jaccard(x._w, y._w);
  return Math.max(j, x.section === y.section ? 0.45 : 0);
}

export function itemsForBudget(minutes: number) {
  return minutes <= 5 ? 7 : minutes >= 20 ? 15 : 11;
}

export function rank(profile: Profile, candidates: Article[], count: number): Story[] {
  if (!candidates.length) return [];
  const now = Date.now();
  const v = profile.interest_vector;
  const stats = profile.topic_stats ?? {};

  // 1 ── raw signals
  const pre: Scored[] = candidates.map((c) => ({
    ...c,
    sim: v && c.embedding ? dot(v, c.embedding) : null,
    theta: betaSample(stat(stats, c.section ?? "World").a, stat(stats, c.section ?? "World").b),
    recency: Math.exp(-Math.max(0, now - Date.parse(c.published_at)) / (18 * 3600_000)),
    coverage: 0,
    score: 0,
    _w: words(c.title),
  }));

  // 2 ── coverage: how many *other* outlets carry the same story
  for (let i = 0; i < pre.length; i++) {
    const seen = new Set<string>();
    for (let j = 0; j < pre.length; j++) {
      if (i === j || pre[j].source === pre[i].source) continue;
      if (pairSim(pre[i], pre[j]) > 0.86) seen.add(pre[j].source);
    }
    pre[i].coverage = seen.size;
  }

  // 3 ── normalise similarity to 0..1 across today's candidates
  const sims = pre.map((p) => p.sim).filter((s): s is number => s !== null);
  const lo = Math.min(...sims);
  const hi = Math.max(...sims);
  for (const p of pre) {
    const s = p.sim === null ? 0.35 : hi > lo ? (p.sim - lo) / (hi - lo) : 0.5;
    const cov = Math.min(p.coverage, 4) / 4;
    p.score = v ? 0.45 * s + 0.3 * p.theta + 0.15 * p.recency + 0.1 * cov : 0.6 * p.theta + 0.25 * p.recency + 0.15 * cov;
    // the reader has repeatedly killed this desk → push it way down
    const st = stat(stats, p.section ?? "World");
    if (st.a + st.b > 4 && affinity(stats, p.section ?? "World") < 0.25) p.score *= 0.5;
  }

  const pool = [...pre].sort((a, b) => b.score - a.score).slice(0, 160);
  const nExplore = Math.max(1, Math.round(count * 0.15));
  const nMain = count - nExplore;
  const perSection = Math.ceil(count / 3);

  // 4 ── MMR: relevance minus redundancy
  const chosen: Scored[] = [];
  const bySection = new Map<string, number>();
  const LAMBDA = 0.72;
  while (chosen.length < nMain) {
    let best: Scored | null = null;
    let bestVal = -Infinity;
    for (const c of pool) {
      if (chosen.includes(c)) continue;
      if ((bySection.get(c.section ?? "") ?? 0) >= perSection) continue;
      const red = chosen.length ? Math.max(...chosen.map((x) => pairSim(x, c))) : 0;
      if (red > 0.9) continue; // same story, different outlet
      const val = LAMBDA * c.score - (1 - LAMBDA) * red;
      if (val > bestVal) {
        bestVal = val;
        best = c;
      }
    }
    if (!best) break;
    chosen.push(best);
    bySection.set(best.section ?? "", (bySection.get(best.section ?? "") ?? 0) + 1);
  }

  // 5 ── Off your beat: biggest stories from desks the reader rarely sees
  const explore: Scored[] = [];
  const outside = pre
    .filter((c) => !chosen.includes(c))
    .filter((c) => affinity(stats, c.section ?? "World") <= 0.5 || stat(stats, c.section ?? "World").a + stat(stats, c.section ?? "World").b < 3)
    .sort((a, b) => b.coverage + b.recency - (a.coverage + a.recency));
  for (const c of outside) {
    if (explore.length >= nExplore) break;
    if (explore.some((e) => e.section === c.section)) continue;
    if ([...chosen, ...explore].some((x) => pairSim(x, c) > 0.8)) continue;
    explore.push(c);
  }

  // 6 ── layout: confidence decides size
  const quick = count <= 7;
  const main = chosen.map((c, i): Story => {
    const weak = affinity(stats, c.section ?? "World") < 0.3;
    let size: StorySize = i === 0 ? "lead" : i <= 2 ? "major" : "standard";
    if (weak || (quick && i > 3)) size = i === 0 ? "lead" : "brief";
    return toStory(c, size, false, reason(c, stats, sims.length ? hi : null));
  });
  const ex = explore.map((c) => toStory(c, "standard", true, exploreReason(c)));
  return [...main, ...ex];
}

function toStory(c: Scored, size: StorySize, explore: boolean, reason: string): Story {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary ?? c.snippet ?? "",
    url: c.url,
    source: c.source,
    section: c.section ?? "World",
    published_at: c.published_at,
    reason,
    explore,
    coverage: c.coverage,
    size,
  };
}

function reason(c: Scored, stats: TopicStats, hiSim: number | null): string {
  const s = c.section ?? "World";
  const st = stat(stats, s);
  const parts: string[] = [];
  if (st.a - 1 >= 3 && affinity(stats, s) > 0.6) parts.push(`You keep reading ${s} to the end.`);
  if (c.sim !== null && hiSim !== null && c.sim >= hiSim - 0.06) parts.push("Closest match to what you told us you care about.");
  else if (c.sim !== null && c.sim >= (hiSim ?? 1) - 0.15) parts.push("Sits close to your stated interests.");
  if (c.coverage >= 2) parts.push(`${c.coverage + 1} outlets are on this.`);
  if (c.recency > 0.8) parts.push("Broke in the last few hours.");
  if (c.topics?.length) parts.push(`Tagged: ${c.topics.slice(0, 3).join(", ")}.`);
  return parts.slice(0, 2).join(" ") || `Best of the ${s} desk today.`;
}

function exploreReason(c: Scored) {
  return c.coverage >= 1
    ? `Off your beat. ${c.coverage + 1} outlets lead with this, and your paper would otherwise have hidden it.`
    : `Off your beat. We test one desk you rarely read, so your paper never shrinks to a bubble.`;
}
