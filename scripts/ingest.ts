// npm run ingest → pull every feed, then run the AI desk until nothing is left (or 6 rounds)
import "./env";
import { fetchFeeds, processPending } from "../lib/ingest";

async function main() {
  console.log("Pulling feeds…");
  const f = await fetchFeeds();
  console.log(`✓ ${f.feedsOk} feeds ok, ${f.seen} items seen, ${f.inserted} new`);
  if (f.failed.length) console.log("  skipped:", f.failed.join("\n           "));

  for (let round = 1; round <= 6; round++) {
    const p = await processPending({ budgetMs: 50_000 });
    console.log(`✓ round ${round}: filed ${p.processed} (${p.aiCalls} AI calls, ${(p.ms / 1000).toFixed(1)}s) — ${p.remaining} left`);
    if (!p.remaining || !p.processed) break;
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
