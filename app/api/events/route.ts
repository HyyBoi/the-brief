import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { applySignals, type Signal } from "@/lib/learn";

export const dynamic = "force-dynamic";
const KINDS = new Set(["dwell", "open", "click", "keep", "kill", "quiz_right", "quiz_wrong"]);

// Receives batched reading signals (sendBeacon posts text/plain, so parse manually).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const list = (Array.isArray(body) ? body : [body]) as Signal[];
  const clean = list
    .filter((s) => s && KINDS.has(s.kind) && typeof s.article_id === "string")
    .slice(0, 100)
    .map((s) => ({ ...s, value: Math.min(Number(s.value ?? 1), 600) }));
  await applySignals(user.id, clean);
  return NextResponse.json({ ok: true, applied: clean.length });
}
