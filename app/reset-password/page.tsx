import Link from "next/link";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../lib/caspio";
import { ACCOUNTS_TABLE_ID, hashPassword, setAccountSession } from "../../lib/player-auth";

export const dynamic = "force-dynamic";

type Account = { AccountID: number; FirstName: string; LastName: string; Email: string; PasswordResetExpires?: string | null };
type AccountResponse = { data: Account[] };
type Params = { token?: string; error?: string };

async function findByResetToken(token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  const where = encodeURIComponent(`PasswordResetTokenHash='${hash}'`);
  const result = await caspioFetch<AccountResponse>(`/tables/${ACCOUNTS_TABLE_ID}/records?select=AccountID,FirstName,LastName,Email,PasswordResetExpires&where=${where}&limit=1`);
  return result.data?.[0] ?? null;
}

async function resetPassword(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=length`);
  if (password !== confirm) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=match`);

  const account = await findByResetToken(token);
  if (!account || !account.PasswordResetExpires || new Date(account.PasswordResetExpires).getTime() < Date.now()) redirect("/reset-password?error=invalid");

  await caspioFetch(`/tables/${ACCOUNTS_TABLE_ID}/records/bulk`, {
    method: "PATCH",
    body: JSON.stringify({
      where: `AccountID=${account.AccountID}`,
      recordValues: {
        PasswordHash: hashPassword(password),
        PasswordResetTokenHash: null,
        PasswordResetExpires: null,
        UpdatedAt: new Date().toISOString()
      }
    })
  });

  await setAccountSession(account.AccountID);
  redirect("/player");
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const token = params.token ?? "";
  const account = token ? await findByResetToken(token) : null;
  const expired = Boolean(account?.PasswordResetExpires && new Date(account.PasswordResetExpires).getTime() < Date.now());

  if (!account || expired) {
    return <main className="shell"><section className="hero card" style={{ maxWidth: 620, margin: "40px auto" }}><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Reset Password</h1><p className="lead">This password reset link is invalid or has expired.</p><Link className="button primary" href="/forgot-password">Request a New Link</Link></section></main>;
  }

  return <main className="shell"><section className="hero card" style={{ maxWidth: 620, margin: "40px auto" }}><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Reset Your Password</h1><p className="lead">Hi {account.FirstName}. Create a new password for your True Approach Dugout account.</p>{params.error ? <p className="errorBanner">{params.error === "match" ? "The passwords do not match." : "Password must be at least 8 characters."}</p> : null}<form className="form" action={resetPassword}><input type="hidden" name="token" value={token} /><label>Email<input value={account.Email} disabled /></label><label>New Password<input name="password" type="password" minLength={8} required /></label><label>Confirm Password<input name="confirm" type="password" minLength={8} required /></label><button className="button primary">Save New Password & Log In</button></form></section></main>;
}
