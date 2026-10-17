import { NextResponse, type NextRequest } from "next/server";
import { fetchFeeds, processPending } from "@/lib/ingest";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

// Vercel Cron hits this at 06:00 PKT. Also callable by hand.
export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const feeds = req.nextUrl.searchParams.get("skipFeeds") ? null : await fetchFeeds();
  const desk = await processPending({ budgetMs: feeds ? 35_000 : 50_000 });
  return NextResponse.json({ feeds, desk });
}
export const POST = GET;
