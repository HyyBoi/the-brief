import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = await authClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
