"use client";
// The web edition: a real sheet, turned page by page around its spine.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import type { EditionPayload, Story } from "@/lib/types";
import { Masthead } from "@/components/Masthead";
import { Unfold } from "@/components/Unfold";
import { SignalProvider } from "./signals";
import { StoryCard } from "./StoryCard";
import { Bench } from "./Bench";
import { Quiz } from "./Quiz";

type Page = { key: string; title: string; kind: "front" | "inside" | "back"; stories: Story[] };

function paginate(stories: Story[]): Page[] {
  const main = stories.filter((s) => !s.explore);
  const explore = stories.filter((s) => s.explore);
  const front = main.filter((s) => s.size === "lead" || s.size === "major").slice(0, 3);
  const rest = main.filter((s) => !front.includes(s));

  // group the rest by section, keeping rank order, and pack ≤5 stories per page
  const groups = new Map<string, Story[]>();
  for (const s of rest) groups.set(s.section, [...(groups.get(s.section) ?? []), s]);
  const pages: Page[] = [{ key: "front", title: "Front page", kind: "front", stories: front }];
  let cur: Story[] = [];
  let names: string[] = [];
  for (const [name, list] of groups) {
    if (cur.length && (cur.length + list.length > 5 || names.length === 2)) {
      pages.push({ key: names.join("-"), title: names.join(" and "), kind: "inside", stories: cur });
      cur = [];
      names = [];
    }
    cur.push(...list);
    names.push(name);
  }
  if (cur.length) pages.push({ key: names.join("-"), title: names.join(" and "), kind: "inside", stories: cur });
  pages.push({ key: "back", title: "Back page", kind: "back", stories: explore });
  return pages;
}

export function Reader({ editionId, edition, isToday }: { editionId: string; edition: EditionPayload; isToday: boolean }) {
  const reduce = useReducedMotion();
  const pages = useMemo(() => paginate(edition.stories), [edition.stories]);
  const [[page, dir], setPage] = useState<[number, number]>([0, 1]);
  const [killed, setKilled] = useState<Set<string>>(new Set());

  const go = useCallback(
    (d: number) => {
      setPage(([p]) => {
        const n = Math.max(0, Math.min(pages.length - 1, p + d));
        return n === p ? [p, d] : [n, d];
      });
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    },
    [pages.length, reduce],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const kill = (id: string) => setKilled((k) => new Set(k).add(id));
  const live = (xs: Story[]) => xs.filter((s) => !killed.has(s.id));
  const p = pages[page];
  const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(edition.date + "T06:00:00"));

  return (
    <SignalProvider editionId={editionId}>
      <div className="screen-only mx-auto max-w-[1180px] px-3 py-6 md:px-6 md:py-10">
        <Unfold className="px-4 pb-6 pt-6 md:px-10">
          <Masthead left={`No. ${edition.number}, edited for ${edition.reader}`} right={`${longDate}. A ${edition.budget}-minute paper.`} />

          <div className="stage relative min-h-[60vh]">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={p.key}
                custom={dir}
                variants={reduce ? fade : turn}
                initial="enter"
                animate="center"
                exit="exit"
                className="preserve bg-sheet pt-6"
              >
                {p.kind !== "front" && (
                  <div className="mb-6 flex items-baseline justify-between border-b-2 border-ink pb-2">
                    <h2 className="font-sans text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{p.title}</h2>
                    <span className="t-meta">Page {page + 1}</span>
                  </div>
                )}

                <LayoutGroup>
                  {p.kind === "front" && <Front edition={edition} stories={live(p.stories)} onKill={kill} />}
                  {p.kind === "inside" && <Inside stories={live(p.stories)} onKill={kill} />}
                  {p.kind === "back" && <Back edition={edition} stories={live(p.stories)} onKill={kill} />}
                </LayoutGroup>
              </motion.div>
            </AnimatePresence>
          </div>

          <nav className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t-2 border-ink pt-3 t-ui" aria-label="Pages">
            <div>
              <button onClick={() => go(-1)} disabled={page === 0} className="btn disabled:opacity-25">
                Previous page
              </button>
            </div>
            <ol className="hidden items-center gap-1 md:flex">
              {pages.map((pg, i) => (
                <li key={pg.key}>
                  <button
                    onClick={() => setPage([i, i > page ? 1 : -1])}
                    aria-current={i === page ? "page" : undefined}
                    className={`px-2 py-1 ${i === page ? "bg-ink text-sheet" : "hover:underline"}`}
                    title={pg.title}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
            <div className="text-right">
              <button onClick={() => go(1)} disabled={page === pages.length - 1} className="btn btn-solid disabled:opacity-25">
                Turn the page
              </button>
            </div>
          </nav>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 t-ui">
            <div className="flex flex-wrap gap-4">
              <button onClick={() => window.print()} className="link-under">
                Download as PDF
              </button>
              <Link href="/archive" className="link-under">
                Past papers
              </Link>
              <Link href="/profile" className="link-under">
                What the paper knows about you
              </Link>
            </div>
            <span className="t-meta">
              {isToday ? "Today's edition." : "From the archive."} {edition.stats.candidates} stories from {edition.stats.sources} outlets read, {edition.stories.length} printed, {edition.stats.aiCalls} AI call{edition.stats.aiCalls === 1 ? "" : "s"}.
            </span>
          </footer>
        </Unfold>
      </div>
    </SignalProvider>
  );
}

function Front({ edition, stories, onKill }: { edition: EditionPayload; stories: Story[]; onKill: (id: string) => void }) {
  const lead = stories.find((s) => s.size === "lead");
  const majors = stories.filter((s) => s !== lead);
  return (
    <div className="grid gap-8 md:grid-cols-12">
      <div className="md:col-span-8">
        <AnimatePresence>{lead && <Fold key={lead.id}><StoryCard story={lead} onKill={onKill} /></Fold>}</AnimatePresence>
        {edition.bench && <Bench bench={edition.bench} />}
      </div>
      <aside className="space-y-6 md:col-span-4 md:border-l md:border-hair md:pl-8">
        {edition.note && (
          <section aria-label="From the editor">
            <p className="t-kicker">From the editor</p>
            <p className="mt-2 text-[1.12rem] italic leading-relaxed">{edition.note}</p>
          </section>
        )}
        <AnimatePresence>
          {majors.map((s) => (
            <Fold key={s.id}>
              <div className="rule-hair pt-5">
                <StoryCard story={s} onKill={onKill} />
              </div>
            </Fold>
          ))}
        </AnimatePresence>
      </aside>
    </div>
  );
}

function Inside({ stories, onKill }: { stories: Story[]; onKill: (id: string) => void }) {
  if (!stories.length) return <p className="t-meta py-10">You killed everything on this page. Fair enough.</p>;
  const [first, ...rest] = stories;
  return (
    <div className="grid gap-x-8 gap-y-8 md:grid-cols-3">
      <AnimatePresence>
        <Fold key={first.id} className="md:col-span-2">
          <StoryCard story={{ ...first, size: first.size === "brief" ? "brief" : "major" }} onKill={onKill} />
        </Fold>
        {rest.map((s) => (
          <Fold key={s.id}>
            <StoryCard story={s} onKill={onKill} />
          </Fold>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Back({ edition, stories, onKill }: { edition: EditionPayload; stories: Story[]; onKill: (id: string) => void }) {
  return (
    <div className="grid gap-10 md:grid-cols-12">
      <div className="md:col-span-7">
        <Quiz quiz={edition.quiz} stories={edition.stories} />
        {!edition.quiz.length && <p className="t-meta">No quiz today: the editor was rate-limited. Tomorrow.</p>}
      </div>
      <aside className="space-y-6 md:col-span-5 md:border-l md:border-hair md:pl-8">
        <section aria-label="Editor's memo">
          <p className="t-kicker">Editor&apos;s memo</p>
          <ul className="mt-2 space-y-2">
            {edition.memo.map((m, i) => (
              <li key={i} className="text-[1.02rem] leading-snug">
                {m}
              </li>
            ))}
          </ul>
          <Link href="/profile" className="t-ui link-under mt-3 inline-block">
            Overrule the editor
          </Link>
        </section>
        <AnimatePresence>
          {stories.map((s) => (
            <Fold key={s.id}>
              <div className="rule-hair pt-5">
                <StoryCard story={s} onKill={onKill} />
              </div>
            </Fold>
          ))}
        </AnimatePresence>
      </aside>
    </div>
  );
}

/** Killed stories fold shut along their top edge; the column closes the gap. */
function Fold({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      layout
      className={className}
      style={{ transformOrigin: "50% 0%" }}
      exit={{ rotateX: -92, opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.45, ease: [0.5, 0, 0.75, 0] } }}
    >
      {children}
    </motion.div>
  );
}

const turn = {
  enter: (d: number) => ({ rotateY: d > 0 ? 88 : -88, opacity: 0.4, transformOrigin: d > 0 ? "0% 50%" : "100% 50%", filter: "brightness(0.7)" }),
  center: { rotateY: 0, opacity: 1, filter: "brightness(1)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  exit: (d: number) => ({
    rotateY: d > 0 ? -88 : 88,
    opacity: 0.4,
    transformOrigin: d > 0 ? "0% 50%" : "100% 50%",
    filter: "brightness(0.7)",
    transition: { duration: 0.38, ease: [0.55, 0, 0.8, 0.2] as const },
  }),
};
const fade = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };
