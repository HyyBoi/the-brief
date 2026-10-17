import { admin } from "./supabase/admin";
import type { Profile } from "./types";
import { parseVec } from "./vec";

export function todayPK(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(d); // YYYY-MM-DD
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await admin().from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { ...data, interest_vector: parseVec(data.interest_vector), topic_stats: data.topic_stats ?? {} } as Profile;
}
