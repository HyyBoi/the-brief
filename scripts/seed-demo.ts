// npm run seed:demo -- you@example.com
// Replays a believable week of reading for an existing, onboarded account, so the demo shows
// a paper that has already learned: memo, drift bars and a sharper ranking.
//
// Persona: reads Business, Pakistan and AI to the end; keeps Cricket; kills Culture and Sport.
import "./env";
import { admin } from "../lib/supabase/admin";
import { nudge, parseVec, toPg } from "../lib/vec";
import type { TopicStats } from "../lib/types";

const LOVES = ["Business", "Pakistan", "AI", "Markets"];
const LIKES = ["Cricket", "Technology"];
const KILLS = ["Culture", "Sport"];

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run seed:demo -- you@example.com");
  const sb = admin();

  const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No account for ${email}. Sign up in the app first.`);
  const { data: prof } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!prof) throw new Error("Finish onboarding in the app first.");

  const { data: arts } = await sb
    .from("articles")
    .select("id,section,embedding")
    .eq("processed", true)
    .order("published_at", { ascending: false })
    .limit(300);
  if (!arts?.length) throw new Error("No articles. Run `npm run ingest` first.");

  const stats: TopicStats = structuredClone(prof.topic_stats ?? {});
  let vec = parseVec(prof.interest_vector);
  const bump = (s: string, a: number, b: number) => {
    const c = stats[s] ?? { a: 1, b: 1 };
    stats[s] = { a: c.a + a, b: c.b + b };
  };

  for (let day = 6; day >= 0; day--) {
    const when = new Date(Date.now() - day * 86_400_000);
    const events: Record<string, unknown>[] = [];
    const pick = arts.sort(() => Math.random() - 0.5).slice(0, 14);
    for (const a of pick) {
      const emb = parseVec(a.embedding);
      let kind: string | null = null;
      let value = 1;
      if (LOVES.includes(a.section)) {
        kind = Math.random() < 0.4 ? "keep" : "dwell";
        value = kind === "dwell" ? 25 + Math.round(Math.random() * 40) : 1;
        bump(a.section, kind === "keep" ? 1.5 : 1, 0);
        if (emb) vec = nudge(vec, emb, kind === "keep" ? 0.2 : 0.06);
      } else if (LIKES.includes(a.section)) {
        kind = "click";
        bump(a.section, 0.7, 0);
        if (emb) vec = nudge(vec, emb, 0.1);
      } else if (KILLS.includes(a.section)) {
        kind = "kill";
        bump(a.section, 0, 1.5);
        if (emb) vec = nudge(vec, emb, -0.15);
      }
      if (kind) events.push({ user_id: user.id, article_id: a.id, kind, value, created_at: when.toISOString() });
    }
    if (events.length) await sb.from("events").insert(events);
    await sb.from("profile_snapshots").upsert({
      user_id: user.id,
      day: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(when),
      topic_stats: structuredClone(stats),
    });
    console.log(`day -${day}: ${events.length} signals`);
  }

  await sb
    .from("profiles")
    .update({ topic_stats: stats, interest_vector: toPg(vec), updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  console.log("✓ a week of reading replayed. Open /profile, then reprint today's paper.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
