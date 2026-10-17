// The night desk.
//   fetchFeeds()     → pull every RSS feed, store new articles (no AI yet)
//   processPending() → AI pass: summary + section + topics, then embed. Once per article, ever.
import Parser from "rss-parser";
import { z } from "zod";
import { FEEDS } from "./feeds";
import { admin } from "./supabase/admin";
import { chatJSON, embed } from "./ai";
import { SECTIONS, asSection } from "./sections";
import { toPg } from "./vec";

const parser = new Parser({
  timeout: 10_000,
  headers: { "user-agent": "Mozilla/5.0 (TheBrief/1.0; personal newspaper)" },
});

const strip = (s?: string) =>
  (s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function fetchFeeds(maxAgeHours = 48) {
  const since = Date.now() - maxAgeHours * 3600_000;
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const feed = await parser.parseURL(f.url);
      return (feed.items ?? [])
        .slice(0, 15)
        .map((it) => ({
          url: (it.link ?? "").split("#")[0],
          source: f.source,
          region: f.region,
          feed_section: f.section,
          title: strip(it.title),
          snippet: strip(it.contentSnippet || it.content || it.summary).slice(0, 700),
          published_at: new Date(it.isoDate || it.pubDate || Date.now()).toISOString(),
        }))
        .filter((a) => a.url.startsWith("http") && a.title.length > 8 && Date.parse(a.published_at) >= since);
    }),
  );

  const rows = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = FEEDS.filter((_, i) => results[i].status === "rejected").map((f) => f.url);

  // de-dupe by url within this batch
  const unique = [...new Map(rows.map((r) => [r.url, r])).values()];
  let inserted = 0;
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const { data, error } = await admin()
      .from("articles")
      .upsert(chunk, { onConflict: "url", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    inserted += data?.length ?? 0;
  }
  return { seen: unique.length, inserted, feedsOk: FEEDS.length - failed.length, failed };
}

const Filed = z.object({
  items: z.array(
    z.object({
      i: z.coerce.number(),
      summary: z.string(),
      section: z.string(),
      topics: z.array(z.string()).default([]),
    }),
  ),
});

const DESK_PROMPT = `You are the night desk of a serious morning newspaper.
For each wire item: write a 2-sentence summary (max 45 words) in plain, neutral, factual English — no hype, no "this article".
File it under exactly one section from: ${SECTIONS.join(", ")}.
Use "Pakistan" for anything mainly about Pakistan. Use "AI" only when AI is the core subject.
Give 2–4 short lowercase topic tags (e.g. "monetary policy", "babar azam", "chip exports").
Return {"items":[{"i":number,"summary":string,"section":string,"topics":string[]}]}`;

/** Process unprocessed articles in batches until the time budget runs out. */
export async function processPending({ budgetMs = 40_000, batch = 10 } = {}) {
  const t0 = Date.now();
  let processed = 0;
  let aiCalls = 0;

  while (Date.now() - t0 < budgetMs) {
    const { data: rows, error } = await admin()
      .from("articles")
      .select("id,title,snippet,source,feed_section")
      .eq("processed", false)
      .order("published_at", { ascending: false })
      .limit(batch);
    if (error) throw error;
    if (!rows?.length) break;

    let filed: z.infer<typeof Filed>["items"] = [];
    try {
      const input = rows.map((r, i) => ({ i, source: r.source, title: r.title, text: (r.snippet ?? "").slice(0, 500) }));
      filed = (await chatJSON(DESK_PROMPT, JSON.stringify(input), Filed)).items;
      aiCalls++;
    } catch (e) {
      console.warn("[desk] AI failed, filing from feed hints:", (e as Error).message.slice(0, 200));
    }

    const byI = new Map(filed.map((f) => [f.i, f]));
    const finals = rows.map((r, i) => {
      const f = byI.get(i);
      return {
        id: r.id,
        title: r.title,
        summary: f?.summary?.trim() || (r.snippet ?? "").split(/(?<=\.)\s/).slice(0, 2).join(" ") || r.title,
        section: asSection(f?.section ?? r.feed_section),
        topics: (f?.topics ?? []).slice(0, 4).map((t) => t.toLowerCase().trim()),
      };
    });

    const vectors = await embed(finals.map((f) => `${f.title}. ${f.summary}`));
    aiCalls++;

    await Promise.all(
      finals.map((f, i) =>
        admin()
          .from("articles")
          .update({
            summary: f.summary,
            section: f.section,
            topics: f.topics,
            embedding: toPg(vectors[i]),
            processed: true,
          })
          .eq("id", f.id),
      ),
    );
    processed += rows.length;
  }

  const { count } = await admin().from("articles").select("id", { count: "exact", head: true }).eq("processed", false);
  return { processed, remaining: count ?? 0, aiCalls, ms: Date.now() - t0 };
}
