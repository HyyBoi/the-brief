// Onboarding → a usable profile in one AI call + one embedding call.
import { z } from "zod";
import { admin } from "./supabase/admin";
import { chatJSON, embed } from "./ai";
import { SECTIONS, asSection } from "./sections";
import { mean, nudge, parseVec, toPg } from "./vec";
import { todayPK } from "./profile";
import type { TopicStats } from "./types";

export type OnboardInput = { name: string; dinner: string; keeps: string[]; kills: string[]; budget: number };

const Taste = z.object({
  taste_summary: z.string(),
  sections: z.array(z.object({ section: z.string(), weight: z.coerce.number() })).default([]),
  interests: z.array(z.string()).default([]),
});

const PROMPT = `You build a newspaper reader's taste profile from very little evidence.
Input: what they would argue about at dinner, headlines they KEPT, headlines they KILLED.
Return:
- "taste_summary": 2 sentences, second person, specific and a little sharp (e.g. "You read monetary policy end to end and skip crypto. Cricket only when it matters.")
- "sections": the desks they care about, from: ${SECTIONS.join(", ")} — with weight 0..1
- "interests": 5–10 specific interests as short phrases`;

export async function completeOnboarding(userId: string, input: OnboardInput) {
  const ids = [...input.keeps, ...input.kills];
  const { data: arts } = ids.length
    ? await admin().from("articles").select("id,title,section,embedding").in("id", ids)
    : { data: [] as { id: string; title: string; section: string; embedding: unknown }[] };
  const byId = new Map((arts ?? []).map((a) => [a.id, a]));
  const kept = input.keeps.map((i) => byId.get(i)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];
  const killed = input.kills.map((i) => byId.get(i)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];

  let taste: z.infer<typeof Taste> = { taste_summary: "", sections: [], interests: [] };
  try {
    taste = await chatJSON(
      PROMPT,
      JSON.stringify({ dinner: input.dinner, kept: kept.map((k) => k.title), killed: killed.map((k) => k.title) }),
      Taste,
      { maxTokens: 1200 },
    );
  } catch (e) {
    console.warn("[onboard] AI failed:", (e as Error).message.slice(0, 200));
    taste.taste_summary = input.dinner ? `You told us: “${input.dinner.slice(0, 140)}”. We'll learn the rest from how you read.` : "";
  }

  // Desk-level taste: Beta(a, b) per section
  const stats: TopicStats = {};
  const bump = (s: string, da: number, db: number) => {
    const k = asSection(s);
    const cur = stats[k] ?? { a: 1, b: 1 };
    stats[k] = { a: cur.a + da, b: cur.b + db };
  };
  for (const s of taste.sections) bump(s.section, 3 * Math.max(0, Math.min(1, s.weight)), 0);
  for (const k of kept) bump(k.section, 2, 0);
  for (const k of killed) bump(k.section, 0, 2);

  // Semantic taste: embed what they said, pull toward keeps, push from kills
  const [said] = await embed([`${input.dinner}\nInterests: ${taste.interests.join(", ")}`]);
  let vec = mean([said, ...kept.map((k) => parseVec(k.embedding))].filter(Boolean) as number[][]);
  for (const k of killed) {
    const e = parseVec(k.embedding);
    if (e && vec) vec = nudge(vec, e, -0.2);
  }

  const row = {
    user_id: userId,
    display_name: input.name.trim().slice(0, 40) || "Reader",
    dinner_answer: input.dinner.slice(0, 1000),
    taste_summary: taste.taste_summary,
    interest_vector: toPg(vec),
    topic_stats: stats,
    time_budget: [5, 10, 20].includes(input.budget) ? input.budget : 10,
    onboarded: true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin().from("profiles").upsert(row);
  if (error) throw error;
  await admin().from("profile_snapshots").upsert({ user_id: userId, day: todayPK(), topic_stats: stats });

  if (kept.length || killed.length) {
    await admin()
      .from("events")
      .insert([
        ...kept.map((k) => ({ user_id: userId, article_id: k.id, kind: "keep", value: 1 })),
        ...killed.map((k) => ({ user_id: userId, article_id: k.id, kind: "kill", value: 1 })),
      ]);
  }
}

/** 12 headlines across 12 different desks for the KEEP/KILL deck. */
export async function onboardingDeck() {
  const since = new Date(Date.now() - 96 * 3600_000).toISOString();
  const { data } = await admin()
    .from("articles")
    .select("id,title,section,source")
    .eq("processed", true)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(400);
  const out: { id: string; title: string; section: string; source: string }[] = [];
  const used = new Set<string>();
  for (const a of data ?? []) {
    if (used.has(a.section)) continue;
    used.add(a.section);
    out.push(a);
    if (out.length === 12) break;
  }
  for (const a of data ?? []) {
    if (out.length >= 12) break;
    if (!out.includes(a)) out.push(a);
  }
  return out;
}
