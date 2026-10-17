import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { buildEdition } from "@/lib/edition";
import { todayPK } from "@/lib/profile";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Build (or rebuild) today's paper for the signed-in reader.
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  try {
    const { id, payload } = await buildEdition(user.id, todayPK());
    return NextResponse.json({ id, date: payload.date, stats: payload.stats });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
