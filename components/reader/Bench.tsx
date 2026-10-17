// The Opposition Bench: the lead story, argued both ways, set as a formal motion.
import type { EditionPayload } from "@/lib/types";

export function Bench({ bench }: { bench: NonNullable<EditionPayload["bench"]> }) {
  return (
    <section className="mt-8 border-y-2 border-ink py-5" aria-label="The Opposition Bench">
      <p className="t-kicker">The Opposition Bench</p>
      <p className="mt-2 text-[1.3rem] italic leading-snug">{bench.motion}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-0 col-rule">
        <div className="md:pr-6">
          <p className="t-ui">Proposition</p>
          <p className="t-body mt-1">{bench.proposition}</p>
        </div>
        <div className="md:pl-6">
          <p className="t-ui">Opposition</p>
          <p className="t-body mt-1">{bench.opposition}</p>
        </div>
      </div>
    </section>
  );
}
