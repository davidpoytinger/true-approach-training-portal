import Link from "next/link";
import { createHash, randomBytes } from "crypto";
import { caspioFetch } from "../../lib/caspio";
import { ACCOUNTS_TABLE_ID, findAccountByEmail } from "../../lib/player-auth";

export const dynamic = "force-dynamic";
type Params = { sent?: string };

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const account = email ? await findAccountByEmail(email) : null;
  if (account) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await caspioFetch(`/tables/${ACCOUNTS_TABLE_ID}/records?q.where=AccountID=${account.AccountID}`, { method: "PUT", body: JSON.stringify({ PasswordResetTokenHash: tokenHash, PasswordResetExpires: expires }) });
    console.log(`Password reset requested for account ${account.AccountID}. Email delivery not configured yet.`);
  }
  return;
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return <main className="shell"><section className="hero card" style={{ maxWidth: 560, margin: "40px auto" }}><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Reset Password</h1><p className="lead">Enter the email address associated with your account.</p>{params.sent === "1" ? <p className="successBanner">If an account exists for that email, reset instructions have been requested.</p> : null}<form className="form" action={async (data) => { "use server"; await requestReset(data); const { redirect } = await import("next/navigation"); redirect("/forgot-password?sent=1"); }}><label>Email<input name="email" type="email" autoComplete="email" required /></label><button className="button primary" type="submit">Send Reset Instructions</button></form><div style={{ marginTop: 18 }}><Link className="textLink" href="/login">Back to Login</Link></div></section></main>;
}
