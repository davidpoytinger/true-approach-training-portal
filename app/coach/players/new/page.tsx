import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";

type CreatePlayerResponse = { data?: Array<{ PlayerID?: number }>; PlayerID?: number; PK_ID?: number };
type Params = { error?: string };

async function createPlayer(formData: FormData) {
  "use server";
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!firstName || !lastName) redirect("/coach/players/new?error=missing-fields");

  try {
    await caspioFetch<CreatePlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?echo=true`, {
      method: "POST",
      body: JSON.stringify({ FirstName: firstName, LastName: lastName, Email: email || null, IsActive: true })
    });
  } catch (error) {
    console.error("Create player failed", error);
    redirect("/coach/players/new?error=save-failed");
  }

  const q = `${firstName} ${lastName}`;
  redirect(`/coach/players?created=1&q=${encodeURIComponent(q)}`);
}

export default async function NewPlayerPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return (
    <main className="shell">
      <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>New Player</h1></div><Link href="/coach" className="textLink">Coach Home</Link></header>
      <section className="card coachSection">
        <div className="label">PLAYER SETUP</div><h2>Create a new player</h2>
        <p className="muted">Add the player here first. Once saved, you can immediately create a training session for them.</p>
        {params.error === "missing-fields" ? <p className="errorBanner">First name and last name are required.</p> : null}
        {params.error === "save-failed" ? <p className="errorBanner">Unable to create the player. Please try again.</p> : null}
        <form className="form" action={createPlayer}>
          <label>First name<input name="firstName" type="text" required /></label>
          <label>Last name<input name="lastName" type="text" required /></label>
          <label>Email<input name="email" type="email" placeholder="Optional for now" /></label>
          <button className="button primary" type="submit">Create Player</button>
        </form>
      </section>
    </main>
  );
}
