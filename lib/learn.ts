// The learning loop. Every signal moves two things:
//   • the reader's interest vector (semantic taste)      — nudged toward / away from the article
//   • the section's Beta(a, b) counts (desk-level taste)  — a = evidence for, b = evidence against
// Old evidence decays (3%/day) so the paper follows who you are now, not who you were.
import { admin } from "./supabase/admin";
import { getProfile, todayPK } from "./profile";
import { nudge, parseVec, toPg } from "./vec";
import type { TopicStats } from "./types";

export type Signal = {
  kind: "dwell" | "open" | "click" | "keep" | "kill" | "quiz_right" | "quiz_wrong";
  article_id: string;
  edition_id?: string | null;
  value?: number; // dwell seconds
};

const DECAY_PER_DAY = 0.97;

function effect(s: Signal): { a: number; b: number; v: number } {
  switch (s.kind) {
    case "keep":
      return { a: 1.5, b: 0, v: 0.2 };
    case "kill":
      return { a: 0, b: 1.5, v: -0.15 };
    case "click":
      return { a: 0.7, b: 0, v: 0.1 };
    case "open":
      return { a: 0.4, b: 0, v: 0.05 };
    case "quiz_right":
      return { a: 0.3, b: 0, v: 0.03 };
    case "dwell": {
      const sec = s.value ?? 0;
      if (sec < 4) return { a: 0, b: 0, v: 0 }; // glanced past: no evidence either way
      const w = Math.min(sec / 30, 1);
      return { a: w, b: 0, v: 0.06 * w };
    }
    default:
      return { a: 0, b: 0, v: 0 };
  }
}

export async function applySignals(userId: string, signals: Signal[]) {
  if (!signals.length) return;
  const profile = await getProfile(userId);
  if (!profile) return;

  const ids = [...new Set(signals.map((s) => s.article_id))];
  const { data: arts } = await admin().from("articles").select("id,section,embedding").in("id", ids);
  const byId = new Map((arts ?? []).map((a) => [a.id, { section: a.section as string, emb: parseVec(a.embedding) }]));

  // decay old evidence toward the prior
  const days = Math.max(0, (Date.now() - Date.parse(profile.updated_at)) / 86_400_000);
  const f = Math.pow(DECAY_PER_DAY, days);
  const stats: TopicStats = {};
  for (const [k, { a, b }] of Object.entries(profile.topic_stats)) stats[k] = { a: 1 + (a - 1) * f, b: 1 + (b - 1) * f };

  let vec = profile.interest_vector;
  for (const s of signals) {
    const art = byId.get(s.article_id);
    if (!art) continue;
    const e = effect(s);
    const cur = stats[art.section] ?? { a: 1, b: 1 };
    stats[art.section] = { a: cur.a + e.a, b: cur.b + e.b };
    if (art.emb && e.v !== 0) vec = nudge(vec, art.emb, e.v);
  }

  await admin()
    .from("events")
    .insert(signals.map((s) => ({ user_id: userId, article_id: s.article_id, edition_id: s.edition_id ?? null, kind: s.kind, value: s.value ?? 1 })));
  await admin()
    .from("profiles")
    .update({ topic_stats: stats, interest_vector: toPg(vec), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  await admin().from("profile_snapshots").upsert({ user_id: userId, day: todayPK(), topic_stats: stats });
}

/** Editor's Memo: what the paper changed because of you, in plain words. */
export async function buildMemo(userId: string): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: evs } = await admin()
    .from("events")
    .select("kind,article_id,articles(section)")
    .eq("user_id", userId)
    .gte("created_at", since)
    .in("kind", ["keep", "kill", "click", "dwell"]);

  const tally = new Map<string, { keep: number; kill: number; read: number }>();
  for (const e of (evs ?? []) as unknown as { kind: string; value?: number; articles: { section: string } | null }[]) {
    const s = e.articles?.section;
    if (!s) continue;
    const t = tally.get(s) ?? { keep: 0, kill: 0, read: 0 };
    if (e.kind === "keep") t.keep++;
    else if (e.kind === "kill") t.kill++;
    else t.read++;
    tally.set(s, t);
  }
  const memo: string[] = [];
  const rows = [...tally.entries()];
  const killed = rows.filter(([, t]) => t.kill >= 2).sort((a, b) => b[1].kill - a[1].kill)[0];
  const loved = rows.filter(([, t]) => t.keep + t.read >= 3).sort((a, b) => b[1].keep * 2 + b[1].read - (a[1].keep * 2 + a[1].read))[0];
  if (loved) memo.push(`You kept coming back to ${loved[0]} (${loved[1].keep} keeps, ${loved[1].read} reads this week), so it moves up front.`);
  if (killed) memo.push(`You killed ${killed[0]} ${killed[1].kill} times. It's cut to briefs. Overrule me on your profile page.`);
  if (!memo.length) memo.push("Still learning you. Flip a story to keep or kill it, and tomorrow's paper will look different.");
  return memo;
}
