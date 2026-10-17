// The nameplate. Blackletter on top, the edition line underneath, double rule below.
export function Masthead({
  left,
  right,
  size = "lg",
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  size?: "lg" | "md" | "sm";
}) {
  const fs = size === "lg" ? "clamp(3.2rem, 9vw, 7.5rem)" : size === "md" ? "clamp(2.4rem, 6vw, 4.5rem)" : "2rem";
  return (
    <header className="text-center">
      <h1 className="t-mast select-none" style={{ fontSize: fs }}>
        The Brief.
      </h1>
      {(left || right) && (
        <div className="rule mt-3 flex flex-col items-center gap-0.5 py-1.5 t-meta sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span>{left}</span>
          <span className="sm:text-right">{right}</span>
        </div>
      )}
      <div className="rule-double" />
    </header>
  );
}
