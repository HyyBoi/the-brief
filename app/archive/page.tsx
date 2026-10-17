import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import type { EditionPayload } from "@/lib/types";
import { Masthead } from "@/components/Masthead";
import { ArchiveStack } from "@/components/ArchiveStack";

export const dynamic = "force-dynamic";

export default async function Archive() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { data } = await admin()
    .from("editions")
    .select("edition_date,payload")
    .eq("user_id", user.id)
    .order("edition_date", { ascending: false })
    .limit(60);

  const papers = (data ?? []).map((e) => {
    const p = e.payload as EditionPayload;
    return { date: e.edition_date as string, number: p.number, lead: p.stories[0]?.title ?? "", section: p.stories[0]?.section ?? "", count: p.stories.length };
  });

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 md:py-12">
      <div className="text-sheet">
        <Link href="/paper" className="t-ui link-under">
          Back to today
        </Link>
        <div className="mt-6 invert">
          <Masthead size="md" />
        </div>
        <p className="mt-4 text-white/60 italic">Every paper you&apos;ve been printed. Pick one up.</p>
      </div>
      {papers.length ? (
        <ArchiveStack papers={papers} />
      ) : (
        <p className="mt-10 text-white/70">No papers yet. Your first one prints when you open today&apos;s edition.</p>
      )}
    </main>
  );
}
