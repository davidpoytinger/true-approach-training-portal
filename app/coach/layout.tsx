import { requireCoach } from "../../lib/coach-auth";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireCoach();
  return children;
}
