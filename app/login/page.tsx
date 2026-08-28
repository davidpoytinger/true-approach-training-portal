import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../lib/caspio";
import { ACCOUNTS_TABLE_ID, findAccountByEmail, setAccountSession, verifyPassword } from "../../lib/player-auth";

export const dynamic = "force-dynamic";
type Params = { error?: string; reset?: string };

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");
  const account = await findAccountByEmail(email);
  if (!account || account.IsActive === false || account.IsActive === 0 || !account.PasswordHash || !verifyPassword(password, account.PasswordHash)) redirect("/login?error=invalid");
  await setAccountSession(account.AccountID);
  try { await caspioFetch(`/tables/${ACCOUNTS_TABLE_ID}/records?q.where=AccountID=${account.AccountID}`, { method: "PUT", body: JSON.stringify({ LastLoginAt: new Date().toISOString() }) }); } catch (error) { console.error("Unable to update last login", error); }
  redirect("/player");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return <main className="shell"><section className="hero card" style={{ maxWidth: 560, margin: "40px auto" }}><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Account Login</h1><p className="lead">Parents, guardians, and adult players can access training here.</p>{params.error ? <p className="errorBanner">{params.error === "missing" ? "Enter your email and password." : "That email or password was not recognized."}</p> : null}{params.reset === "1" ? <p className="successBanner">Your password has been updated. You can log in now.</p> : null}<form className="form" action={login}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button className="button primary" type="submit">Log In</button></form><div style={{ marginTop: 18 }}><Link className="textLink" href="/forgot-password">Forgot My Password</Link></div></section></main>;
}
