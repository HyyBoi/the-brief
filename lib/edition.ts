// Builds one reader's paper: rank (maths, free) → ONE AI call (note, debate, quiz) → store.
import { z } from "zod";
import { admin } from "./supabase/admin";
import { chatJSON } from "./ai";
import { getProfile, todayPK } from "./profile";
import { itemsForBudget, rank } from "./rank";
import { buildMemo } from "./learn";
import { parseVec, toPg } from "./vec";
import type { Article, EditionPayload, Story } from "./types";

const COLS = "id,url,source,region,title,summary,snippet,section,topics,published_at,embedding,image_url";

async function candidates(vector: number[] | null): Promise<Article[]> {
  const sb = admin();
  for (const hours of [36, 72, 168]) {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const ids = new Set<string>();

    if (vector) {
      // pgvector does the heavy lifting: nearest 120 articles to this reader
      const { data } = await sb.rpc("match_articles", { query: toPg(vector), since, n: 120 });
      for (const r of (data ?? []) as { id: string }[]) ids.add(r.id);
    }
    // plus the freshest 120 regardless of taste (exploration + coverage signal)
    const { data: fresh } = await sb
      .from("articles")
      .select("id")
      .eq("processed", true)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(120);
    for (const r of fresh ?? []) ids.add(r.id);

    if (ids.size >= 25 || hours === 168) {
      const { data: rows } = await sb.from("articles").select(COLS).in("id", [...ids]);
      return (rows ?? []).map((r) => ({ ...r, embedding: parseVec(r.embedding) })) as Article[];
    }
  }
  return [];
}

const EditorOut = z.object({
  note: z.string(),
  bench: z
    .object({ motion: z.string(), proposition: z.string(), opposition: z.string() })
    .nullable()
    .optional(),
  quiz: z
    .array(z.object({ q: z.string(), options: z.array(z.string()).min(3).max(4), answer: z.coerce.number(), ref: z.coerce.number() }))
    .default([]),
});

const EDITOR_PROMPT = `You are the editor-in-chief of a one-reader newspaper. Voice: dry, sharp, confident, never cute, no emojis, no exclamation marks.
Given the reader's profile and today's stories (index 0 is the lead), return:
- "note": an editor's note to this reader, max 55 words. Say what matters today and why, referring to 2–3 stories by substance, not by number.
- "bench": the Opposition Bench for the LEAD story, framed as a formal debate.
    "motion": starts with "This House believes" — a genuinely contestable motion raised by the lead story.
    "proposition": strongest case FOR, max 70 words. "opposition": strongest case AGAINST, max 70 words. Steelman both sides equally. If the lead is not debatable, pick the most debatable story instead.
- "quiz": exactly 3 multiple-choice questions ("Three Things") testing the single most important fact from 3 different stories. 4 options each, one correct. "answer" = index of correct option, "ref" = story index.
Use only facts present in the stories.`;

export async function buildEdition(userId: string, date = todayPK()) {
  const t0 = Date.now();
  const profile = await getProfile(userId);
  if (!profile) throw new Error("No profile — finish onboarding first");

  // don't repeat stories from the last two papers
  const { data: recent } = await admin()
    .from("editions")
    .select("payload")
    .eq("user_id", userId)
    .neq("edition_date", date)
    .order("edition_date", { ascending: false })
    .limit(2);
  const seen = new Set((recent ?? []).flatMap((e) => (e.payload as EditionPayload).stories.map((s) => s.id)));

  const pool = (await candidates(profile.interest_vector)).filter((a) => !seen.has(a.id));
  const stories = rank(profile, pool, itemsForBudget(profile.time_budget));
  if (!stories.length) throw new Error("No processed articles yet — run `npm run ingest` first");

  let aiCalls = 0;
  let editor: z.infer<typeof EditorOut> = { note: "", bench: null, quiz: [] };
  try {
    const input = {
      reader: { name: profile.display_name, taste: profile.taste_summary, said: profile.dinner_answer },
      stories: stories.map((s, i) => ({ i, section: s.section, source: s.source, title: s.title, summary: s.summary })),
    };
    editor = await chatJSON(EDITOR_PROMPT, JSON.stringify(input), EditorOut, { maxTokens: 1600 });
    aiCalls++;
  } catch (e) {
    console.warn("[editor] AI failed, printing without the note:", (e as Error).message.slice(0, 200));
    editor.note = `${stories.length} stories, chosen for you from ${new Set(pool.map((p) => p.source)).size} outlets. Flip any story to tell the paper what you think of it.`;
  }

  // No AI available? Still print Three Things: "which outlet reported this?"
  if (!editor.quiz.length) {
    const outlets = [...new Set(pool.map((p) => p.source))];
    editor.quiz = stories
      .slice(0, 6)
      .filter((s, i, arr) => arr.findIndex((x) => x.source === s.source) === i)
      .slice(0, 3)
      .flatMap((s) => {
        const wrong = outlets.filter((o) => o !== s.source).sort(() => Math.random() - 0.5).slice(0, 3);
        if (wrong.length < 3) return [];
        const options = [...wrong, s.source].sort(() => Math.random() - 0.5);
        return [{ q: `Which outlet reported: “${s.title}”?`, options, answer: options.indexOf(s.source), ref: stories.indexOf(s) }];
      });
  }

  const { count } = await admin().from("editions").select("id", { count: "exact", head: true }).eq("user_id", userId);

  const payload: EditionPayload = {
    date,
    number: (count ?? 0) + 1,
    reader: profile.display_name ?? "Reader",
    budget: profile.time_budget,
    note: editor.note,
    bench: editor.bench ?? null,
    quiz: editor.quiz
      .filter((q) => q.answer >= 0 && q.answer < q.options.length && stories[q.ref])
      .slice(0, 3)
      .map((q) => ({ q: q.q, options: q.options, answer: q.answer, ref: stories[q.ref].id })),
    memo: await buildMemo(userId),
    stories: stories as Story[],
    stats: { candidates: pool.length, sources: new Set(pool.map((p) => p.source)).size, aiCalls, ms: Date.now() - t0 },
  };

  const { data, error } = await admin()
    .from("editions")
    .upsert({ user_id: userId, edition_date: date, number: payload.number, payload }, { onConflict: "user_id,edition_date" })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, payload };
}

export async function getEdition(userId: string, date: string) {
  const { data } = await admin()
    .from("editions")
    .select("id,payload,edition_date")
    .eq("user_id", userId)
    .eq("edition_date", date)
    .maybeSingle();
  return data ? { id: data.id as string, payload: data.payload as EditionPayload } : null;
}
