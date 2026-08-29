import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../lib/caspio";
import { ACCOUNTS_TABLE_ID, findAccountByEmail, setAccountSession, verifyPassword } from "../../lib/player-auth";
import { createCoachAccess, getCoachAccess } from "../../lib/coach-auth";

export const dynamic = "force-dynamic";
type Params = { error?: string };

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/coach-login?error=missing");

  const account = await findAccountByEmail(email);
  if (!account || account.IsActive === false || account.IsActive === 0 || !account.PasswordHash || !verifyPassword(password, account.PasswordHash)) {
    redirect("/coach-login?error=invalid");
  }

  let access = await getCoachAccess(account.AccountID);
  const bootstrapEmail = String(process.env.COACH_NOTIFICATION_EMAIL ?? "").trim().toLowerCase();
  if (!access && bootstrapEmail && email === bootstrapEmail) {
    await createCoachAccess(account.AccountID, "Admin");
    access = await getCoachAccess(account.AccountID);
  }
  if (!access) redirect("/coach-login?error=access");

  await setAccountSession(account.AccountID);
  try {
    await caspioFetch(`/tables/${ACCOUNTS_TABLE_ID}/records?q.where=AccountID=${account.AccountID}`, {
      method: "PUT",
      body: JSON.stringify({ LastLoginAt: new Date().toISOString() })
    });
  } catch (error) {
    console.error("Unable to update coach last login", error);
  }
  redirect("/coach");
}

export default async function CoachLoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const message = params.error === "missing" ? "Enter your email and password."
    : params.error === "access" ? "This account does not have Coach Portal access."
    : params.error ? "That email or password was not recognized."
    : "";

  return (
    <main className="shell">
      <section className="hero card" style={{ maxWidth: 560, margin: "40px auto" }}>
        <h1>Coach Login</h1>
        <p className="lead">Sign in to manage players and training sessions.</p>
        {message ? <p className="errorBanner">{message}</p> : null}
        <form className="form" action={login}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="button primary" type="submit">Log In</button>
        </form>
        <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Link className="textLink" href="/forgot-password">Forgot My Password</Link>
          <Link className="textLink" href="/">Back to Dugout</Link>
        </div>
      </section>
    </main>
  );
}
