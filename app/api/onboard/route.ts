import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { completeOnboarding, onboardingDeck } from "@/lib/onboard";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  return NextResponse.json({ deck: await onboardingDeck() });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const body = await req.json();
  await completeOnboarding(user.id, {
    name: String(body.name ?? ""),
    dinner: String(body.dinner ?? ""),
    keeps: Array.isArray(body.keeps) ? body.keeps.map(String) : [],
    kills: Array.isArray(body.kills) ? body.kills.map(String) : [],
    budget: Number(body.budget ?? 10),
  });
  return NextResponse.json({ ok: true });
}
