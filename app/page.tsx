import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { Unfold } from "@/components/Unfold";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser().catch(() => null);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" }).format(new Date());

  return (
    <main className="mx-auto max-w-[1080px] px-4 py-8 md:py-14">
      <Unfold className="px-5 pb-10 pt-8 md:px-12">
        <Masthead left={today} right="One reader. One copy." />

        <section className="grid gap-8 pt-8 md:grid-cols-12">
          <article className="md:col-span-8">
            <p className="t-kicker mb-3">Front page</p>
            <h2 className="t-lead max-w-[16ch]">You read forty sites and remember nothing.</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <p className="t-body">
                The Brief reads them for you overnight and prints one paper with only the stories you would have gone looking
                for. It is laid out like a real newspaper, sized to the minutes you have, and gone by tomorrow.
              </p>
              <p className="t-body">
                Every story can be flipped over. The back tells you why it was chosen, and lets you keep it or kill it with a
                blue pencil. The paper reads your marks and comes back sharper the next morning.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={user ? "/paper" : "/login"} className="btn btn-solid">
                {user ? "Open today's paper" : "Make my paper"}
              </Link>
              {user && (
                <Link href="/archive" className="btn">
                  Past papers
                </Link>
              )}
              <span className="t-meta">Takes under a minute. No checkboxes.</span>
            </div>
          </article>

          <aside className="md:col-span-4 md:border-l md:border-hair md:pl-8">
            <div className="space-y-6">
              <div>
                <h3 className="t-std">It argues both sides</h3>
                <p className="t-body mt-2">The lead story comes with an Opposition Bench: the strongest case for and against, set as a formal motion.</p>
              </div>
              <div className="rule-hair" />
              <div>
                <h3 className="t-std">It checks you learned something</h3>
                <p className="t-body mt-2">The back page asks you three questions about what you read. Name three things, every morning.</p>
              </div>
              <div className="rule-hair" />
              <div>
                <h3 className="t-std">It refuses to become a bubble</h3>
                <p className="t-body mt-2">A few stories each day come from desks you never read, clearly marked, so your world does not shrink.</p>
              </div>
            </div>
          </aside>
        </section>
      </Unfold>
    </main>
  );
}
