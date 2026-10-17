import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center px-6 text-sheet">
      <p className="t-mast text-6xl">The Brief.</p>
      <p className="mt-4 text-xl">There&apos;s no paper here. It was never printed, or it isn&apos;t yours.</p>
      <Link href="/paper" className="t-ui link-under mt-6">
        Open today&apos;s paper
      </Link>
    </main>
  );
}
