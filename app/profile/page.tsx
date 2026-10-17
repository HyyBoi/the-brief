import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/profile";
import { buildMemo } from "@/lib/learn";
import { affinity, stat } from "@/lib/rank";
import { SECTIONS } from "@/lib/sections";
import type { TopicStats } from "@/lib/types";
import { Masthead } from "@/components/Masthead";
import { Unfold } from "@/components/Unfold";
import { ProfileForm } from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const p = await getProfile(user.id);
  if (!p) redirect("/start");

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { data: snaps } = await admin()
    .from("profile_snapshots")
    .select("day,topic_stats")
    .eq("user_id", user.id)
    .gte("day", weekAgo)
    .order("day", { ascending: true })
    .limit(1);
  const then: TopicStats = (snaps?.[0]?.topic_stats as TopicStats) ?? {};
  const memo = await buildMemo(user.id);
  const { count: events } = await admin().from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  const desks = SECTIONS.map((s) => {
    const now = affinity(p.topic_stats, s);
    const before = affinity(then, s);
    const st = stat(p.topic_stats, s);
    return { s, now, delta: now - before, evidence: st.a + st.b - 2 };
  }).sort((a, b) => b.now - a.now);

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-8 md:py-12">
      <Unfold className="px-5 pb-10 pt-6 md:px-12">
        <Masthead size="md" left={`The file on ${p.display_name ?? "you"}`} right={`${events ?? 0} signals read so far`} />

        <div className="mt-8 grid gap-10 md:grid-cols-12">
          <section className="md:col-span-7">
            <h2 className="t-major">What the paper thinks you like</h2>
            <p className="t-meta mt-1">Rewrite it in your own words. The paper takes your word over its guesses.</p>
            <ProfileForm summary={p.taste_summary ?? ""} budget={p.time_budget} name={p.display_name ?? ""} />

            <div className="mt-10">
              <p className="t-kicker">Editor&apos;s memo, last seven days</p>
              <ul className="mt-2 space-y-2">
                {memo.map((m, i) => (
                  <li key={i} className="text-[1.05rem] leading-snug">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="md:col-span-5 md:border-l md:border-hair md:pl-8" aria-label="Interest by desk">
            <h2 className="t-std">Interest by desk</h2>
            <p className="t-meta mt-1">Bars show how likely you are to read each desk. Pencil marks show this week&apos;s change.</p>
            <ul className="mt-4 space-y-2.5">
              {desks.map((d) => (
                <li key={d.s} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="font-sans font-semibold">{d.s}</span>
                  <span className="relative h-3 bg-black/[0.07]">
                    <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.round(d.now * 100)}%` }} />
                    {Math.abs(d.delta) > 0.02 && (
                      <span
                        className="absolute inset-y-[-3px] w-[2px] bg-pencil"
                        style={{ left: `${Math.round((d.now - d.delta) * 100)}%` }}
                        title={`A week ago: ${Math.round((d.now - d.delta) * 100)}%`}
                      />
                    )}
                  </span>
                  <span className={`text-right font-sans text-xs ${d.delta > 0.02 ? "text-pencil" : d.delta < -0.02 ? "text-pencil" : "text-ink-soft"}`}>
                    {d.delta > 0.02 ? `+${Math.round(d.delta * 100)}` : d.delta < -0.02 ? `${Math.round(d.delta * 100)}` : d.evidence > 0 ? "steady" : "new"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-3 t-ui">
          <div className="flex gap-4">
            <Link href="/paper" className="link-under">
              Today&apos;s paper
            </Link>
            <Link href="/archive" className="link-under">
              Past papers
            </Link>
          </div>
          <form action="/auth/signout" method="post">
            <button className="link-under">Sign out</button>
          </form>
        </div>
      </Unfold>
    </main>
  );
}
