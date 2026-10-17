import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { getProfile, todayPK } from "@/lib/profile";
import { getEdition } from "@/lib/edition";
import { Reader } from "@/components/reader/Reader";
import { PrintEdition } from "@/components/PrintEdition";
import { Press } from "@/components/Press";

export const dynamic = "force-dynamic";

export default async function Today() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile?.onboarded) redirect("/start");

  const date = todayPK();
  const ed = await getEdition(user.id, date);
  if (!ed) return <Press name={profile.display_name ?? "your"} />;

  return (
    <>
      <Reader editionId={ed.id} edition={ed.payload} isToday />
      <PrintEdition edition={ed.payload} />
    </>
  );
}
