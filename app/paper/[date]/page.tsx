import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { getEdition } from "@/lib/edition";
import { todayPK } from "@/lib/profile";
import { Reader } from "@/components/reader/Reader";
import { PrintEdition } from "@/components/PrintEdition";

export const dynamic = "force-dynamic";

export default async function PastPaper({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const ed = await getEdition(user.id, date);
  if (!ed) notFound();
  return (
    <>
      <Reader editionId={ed.id} edition={ed.payload} isToday={date === todayPK()} />
      <PrintEdition edition={ed.payload} />
    </>
  );
}
