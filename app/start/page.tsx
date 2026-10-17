"use client";
// Onboarding in three moves: say something, mark twelve headlines, pick your minutes.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Masthead } from "@/components/Masthead";
import { Unfold } from "@/components/Unfold";

type Head = { id: string; title: string; section: string; source: string };

const BUDGETS = [
  { m: 5, label: "5 minutes", desc: "Seven stories. Mostly briefs." },
  { m: 10, label: "10 minutes", desc: "Eleven stories. A proper front page." },
  { m: 20, label: "20 minutes", desc: "Fifteen stories. The full broadsheet." },
];

export default function Start() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dinner, setDinner] = useState("");
  const [deck, setDeck] = useState<Head[] | null>(null);
  const [i, setI] = useState(0);
  const [keeps, setKeeps] = useState<string[]>([]);
  const [kills, setKills] = useState<string[]>([]);
  const [exit, setExit] = useState<"keep" | "kill">("keep");
  const [budget, setBudget] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboard")
      .then((r) => r.json())
      .then((d) => setDeck(d.deck ?? []))
      .catch(() => setDeck([]));
  }, []);

  const card = deck?.[i];

  function mark(kind: "keep" | "kill") {
    if (!card) return;
    setExit(kind);
    (kind === "keep" ? setKeeps : setKills)((xs) => [...xs, card.id]);
    setI((n) => n + 1);
  }

  useEffect(() => {
    if (step !== 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "k") mark("keep");
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "x") mark("kill");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (step === 1 && deck && i >= deck.length) setStep(2);
  }, [i, deck, step]);

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, dinner, keeps, kills, budget }),
    });
    if (!res.ok) {
      setBusy(false);
      return setError("The profile didn't save. Check the server log and try again.");
    }
    router.push("/paper");
  }

  return (
    <main className="mx-auto max-w-[760px] px-4 py-8 md:py-14">
      <Unfold className="px-6 pb-10 pt-8 md:px-12">
        <Masthead size="md" left={`Setting up, step ${step + 1} of 3`} right="Under a minute" />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section key="s0" {...turn} className="pt-8">
              <label className="block">
                <span className="t-std">What should the paper call you?</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  className="mt-2 w-full border-b-2 border-ink bg-transparent py-2 text-2xl outline-none focus:border-pencil"
                />
              </label>
              <label className="mt-10 block">
                <span className="t-lead block !text-[clamp(1.8rem,3.6vw,2.6rem)]">What would you argue about at dinner?</span>
                <span className="t-meta mt-2 block">Write like you talk. The State Bank&apos;s rate decision, whether Babar should open, why nobody fixes Karachi&apos;s water, the next Nvidia chip.</span>
                <textarea
                  value={dinner}
                  onChange={(e) => setDinner(e.target.value)}
                  rows={4}
                  className="t-body mt-4 w-full resize-none border-2 border-ink bg-transparent p-3 !text-left text-lg outline-none focus:border-pencil"
                />
              </label>
              <div className="mt-6 flex justify-end">
                <button className="btn btn-solid" disabled={dinner.trim().length < 8} onClick={() => setStep(1)}>
                  Next: mark some headlines
                </button>
              </div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section key="s1" {...turn} className="pt-8">
              <p className="t-std">Keep what you&apos;d read. Kill what you wouldn&apos;t.</p>
              <p className="t-meta mt-1">
                {deck === null ? "Fetching this morning's wires" : deck.length ? `${Math.min(i + 1, deck.length)} of ${deck.length}. Arrow keys work.` : "No headlines yet. Run the ingest first, or skip this step."}
              </p>

              <div className="stage relative mt-6 h-[260px]">
                <AnimatePresence custom={exit}>
                  {card && (
                    <motion.div
                      key={card.id}
                      custom={exit}
                      variants={deckCard}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="absolute inset-0 flex flex-col justify-between border-2 border-ink bg-sheet p-6"
                    >
                      <p className="t-kicker">
                        {card.section}, from {card.source}
                      </p>
                      <h3 className="t-major">{card.title}</h3>
                      <div className="flex justify-between">
                        <button className="btn btn-pencil" onClick={() => mark("kill")}>
                          Kill
                        </button>
                        <button className="btn btn-solid" onClick={() => mark("keep")}>
                          Keep
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-4 flex justify-between t-ui">
                <span>
                  {keeps.length} kept, {kills.length} killed
                </span>
                <button className="link-under" onClick={() => setStep(2)}>
                  Skip the rest
                </button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="s2" {...turn} className="pt-8">
              <p className="t-lead !text-[clamp(1.8rem,3.6vw,2.6rem)]">How long do you have in the morning?</p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {BUDGETS.map((b) => (
                  <button
                    key={b.m}
                    onClick={() => setBudget(b.m)}
                    aria-pressed={budget === b.m}
                    className={`border-2 p-4 text-left transition-colors ${budget === b.m ? "border-ink bg-ink text-sheet" : "border-hair hover:border-ink"}`}
                  >
                    <span className="t-std block">{b.label}</span>
                    <span className="mt-1 block text-sm opacity-80">{b.desc}</span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-4 text-pencil">{error}</p>}
              <div className="mt-8 flex items-center justify-between">
                <button className="link-under t-ui" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn btn-solid" disabled={busy} onClick={finish}>
                  {busy ? "Reading your answers" : "Print my first paper"}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </Unfold>
    </main>
  );
}

const turn = {
  initial: { rotateY: 70, opacity: 0, transformOrigin: "0% 50%" },
  animate: { rotateY: 0, opacity: 1, transformOrigin: "0% 50%" },
  exit: { rotateY: -70, opacity: 0, transformOrigin: "0% 50%" },
  transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
};

const deckCard = {
  enter: { rotateX: -25, y: 40, opacity: 0 },
  center: { rotateX: 0, y: 0, opacity: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
  exit: (dir: "keep" | "kill") =>
    dir === "keep"
      ? { x: 420, rotateY: -35, rotateZ: 6, opacity: 0, transition: { duration: 0.4 } }
      : { rotateX: 90, y: 60, opacity: 0, transformOrigin: "50% 100%", transition: { duration: 0.4 } },
};
