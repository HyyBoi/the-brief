// The PDF: a flat broadsheet built from the same edition data. Shown only when printing.
import type { EditionPayload } from "@/lib/types";

export function PrintEdition({ edition }: { edition: EditionPayload }) {
  const [lead, ...rest] = edition.stories.filter((s) => !s.explore);
  const explore = edition.stories.filter((s) => s.explore);
  const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(edition.date + "T06:00:00"));

  return (
    <div className="print-only text-black">
      <header className="text-center">
        <h1 className="t-mast" style={{ fontSize: "54pt" }}>
          The Brief.
        </h1>
        <div className="rule mt-1 flex justify-between py-1 text-[8.5pt] italic">
          <span>No. {edition.number}, edited for {edition.reader}</span>
          <span>{longDate}. A {edition.budget}-minute paper.</span>
        </div>
        <div className="rule-double" />
      </header>

      {lead && (
        <section className="mt-3 grid grid-cols-3 gap-[6mm]">
          <div className="col-span-2">
            <p className="t-kicker">{lead.section}</p>
            <h2 className="t-lead" style={{ fontSize: "28pt" }}>
              {lead.title}
            </h2>
            <p className="t-body mt-2" style={{ columnCount: 2, columnGap: "6mm" }}>
              {lead.summary}
            </p>
            <p className="mt-1 text-[8pt] italic">
              {lead.source}. {lead.url}
            </p>
            {edition.bench && (
              <div className="mt-3 border-y-2 border-black py-2">
                <p className="t-kicker">The Opposition Bench</p>
                <p className="text-[11pt] italic">{edition.bench.motion}</p>
                <div className="mt-1 grid grid-cols-2 gap-[6mm]">
                  <p className="t-body">
                    <b>Proposition. </b>
                    {edition.bench.proposition}
                  </p>
                  <p className="t-body">
                    <b>Opposition. </b>
                    {edition.bench.opposition}
                  </p>
                </div>
              </div>
            )}
          </div>
          <aside className="border-l border-[#bbb] pl-[4mm]">
            <p className="t-kicker">From the editor</p>
            <p className="text-[10pt] italic leading-snug">{edition.note}</p>
            <div className="mt-3 border-t border-black pt-2">
              <p className="t-kicker">What the paper learned</p>
              {edition.memo.map((m, i) => (
                <p key={i} className="mt-1 text-[9pt] leading-snug">
                  {m}
                </p>
              ))}
            </div>
          </aside>
        </section>
      )}

      <div className="rule mt-3 pt-3 p-cols">
        {rest.map((s) => (
          <article key={s.id} className="p-avoid mb-3">
            <p className="t-kicker">{s.section}</p>
            <h3 className={s.size === "major" ? "t-major" : "t-std"} style={{ fontSize: s.size === "major" ? "14pt" : "11.5pt" }}>
              {s.title}
            </h3>
            {s.size !== "brief" && <p className="t-body mt-1">{s.summary}</p>}
            <p className="mt-0.5 text-[7.5pt] italic">{s.source}</p>
          </article>
        ))}
        {explore.map((s) => (
          <article key={s.id} className="p-avoid mb-3 border-y border-black py-1">
            <p className="t-kicker">Off your beat: {s.section}</p>
            <h3 className="t-std" style={{ fontSize: "11.5pt" }}>
              {s.title}
            </h3>
            <p className="t-body mt-1">{s.summary}</p>
          </article>
        ))}
      </div>

      {edition.quiz.length > 0 && (
        <section className="p-avoid mt-2 border-t-2 border-black pt-2">
          <p className="t-major" style={{ fontSize: "14pt" }}>
            Three things you now know
          </p>
          <ol className="mt-1 grid grid-cols-3 gap-[6mm] text-[9pt]">
            {edition.quiz.map((q, i) => (
              <li key={i}>
                <b>{i + 1}. </b>
                {q.q}
                <ul className="mt-1">
                  {q.options.map((o, k) => (
                    <li key={k}>☐ {o}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="mt-1 rotate-180 text-right text-[7pt] italic">
            Answers: {edition.quiz.map((q, i) => `${i + 1}. ${q.options[q.answer]}`).join("; ")}
          </p>
        </section>
      )}
    </div>
  );
}
