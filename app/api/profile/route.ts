import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { embed } from "@/lib/ai";
import { nudge, toPg } from "@/lib/vec";

export const dynamic = "force-dynamic";

// "Tell the editor": the reader rewrites their own profile in words; we re-embed and blend it in.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const body = await req.json();
  const p = await getProfile(user.id);
  if (!p) return NextResponse.json({ error: "no profile" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.taste_summary === "string" && body.taste_summary.trim() !== (p.taste_summary ?? "")) {
    update.taste_summary = body.taste_summary.slice(0, 600);
    const [v] = await embed([body.taste_summary]);
    if (v) update.interest_vector = toPg(nudge(p.interest_vector, v, 0.6));
  }
  if ([5, 10, 20].includes(Number(body.time_budget))) update.time_budget = Number(body.time_budget);
  if (typeof body.display_name === "string" && body.display_name.trim()) update.display_name = body.display_name.slice(0, 40);

  await admin().from("profiles").update(update).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
