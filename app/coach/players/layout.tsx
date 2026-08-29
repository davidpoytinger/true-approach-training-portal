import { redirect } from "next/navigation";
import { requireCoach } from "../../../lib/coach-auth";

export default async function CoachPlayersLayout({ children }: { children: React.ReactNode }) {
  const coach = await requireCoach();
  if (!coach.canManagePlayers) redirect("/coach");
  return children;
}
