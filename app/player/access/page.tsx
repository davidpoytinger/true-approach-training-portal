import Link from "next/link";
import { createHash, randomBytes } from "crypto";
import { redirect, notFound } from "next/navigation";
import { caspioFetch } from "../../../lib/caspio";
import { ACCOUNTS_TABLE_ID, PLAYER_ACCESS_TABLE_ID, PLAYERS_TABLE_ID, findAccountByEmail, getAccount, getAccountId, getPlayerAccess } from "../../../lib/player-auth";

export const dynamic = "force-dynamic";

type Player = { PlayerID:number; FirstName:string; LastName:string };
type PR = { data:Player[] };
type AccessRow = { AccessID:number; PlayerID:number; AccountID:number; Relationship?:string|null; IsPrimary?:boolean|number|null; IsActive?:boolean|number|null; CanManageAccess?:boolean|number|null };
type AR = { data:AccessRow[] };
type Create = { data?:Array<{AccountID?:number;PK_ID?:number}>; AccountID?:number; PK_ID?:number };
type Params = { playerId?:string; added?:string; invite?:string; error?:string };

async function getPlayer(id:number){
  const r = await caspioFetch<PR>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName&where=PlayerID=${id}&limit=1`);
  return r.data?.[0] ?? null;
}

async function requireManager(playerId:number){
  const accountId = await getAccountId();
  if(!accountId) redirect("/login");
  const access = (await getPlayerAccess(accountId)).find(a => a.PlayerID === playerId);
  if(!access || access.CanManageAccess === false || access.CanManageAccess === 0) redirect(`/player?playerId=${playerId}`);
  return {accountId, access};
}

async function addAccess(formData:FormData){
  "use server";
  const playerId = Number(formData.get("playerId"));
  await requireManager(playerId);
  const first = String(formData.get("firstName") ?? "").trim();
  const last = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const relationship = String(formData.get("relationship") ?? "Parent");
  if(!playerId || !email) redirect(`/player/access?playerId=${playerId}&error=missing`);

  const account = await findAccountByEmail(email);
  let accountId:number|undefined = account?.AccountID;
  let inviteToken = "";

  if(!accountId){
    inviteToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(inviteToken).digest("hex");
    const created = await caspioFetch<Create>(`/tables/${ACCOUNTS_TABLE_ID}/records?echo=true`,{
      method:"POST",
      body:JSON.stringify({
        FirstName:first || "Parent",
        LastName:last || "Guardian",
        Email:email,
        IsActive:true,
        EmailVerified:false,
        EmailVerificationTokenHash:tokenHash,
        EmailVerificationExpires:new Date(Date.now()+7*24*60*60*1000).toISOString(),
        CreatedAt:new Date().toISOString(),
        UpdatedAt:new Date().toISOString()
      })
    });
    accountId = created.data?.[0]?.AccountID ?? created.data?.[0]?.PK_ID ?? created.AccountID ?? created.PK_ID;
  }

  const linkedAccountId = Number(accountId);
  if(!Number.isInteger(linkedAccountId) || linkedAccountId <= 0) redirect(`/player/access?playerId=${playerId}&error=save`);

  const existing = (await caspioFetch<AR>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,IsActive&where=PlayerID=${playerId}%20AND%20AccountID=${linkedAccountId}&limit=1`)).data?.[0];
  if(existing){
    if(existing.IsActive === false || existing.IsActive === 0){
      await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`,{
        method:"PATCH",
        body:JSON.stringify({where:`AccessID=${existing.AccessID}`,recordValues:{IsActive:true,EndedAt:null}})
      });
    } else {
      redirect(`/player/access?playerId=${playerId}&error=exists`);
    }
  } else {
    await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records`,{
      method:"POST",
      body:JSON.stringify({
        PlayerID:playerId,
        AccountID:linkedAccountId,
        Relationship:relationship,
        AccessLevel:"Full",
        IsPrimary:false,
        IsActive:true,
        CanEditProfile:true,
        CanAddSessions:true,
        CanEditPlayerAddedSessions:true,
        CanManageAccess:true,
        CreatedAt:new Date().toISOString()
      })
    });
  }

  const suffix = inviteToken ? `&invite=${inviteToken}` : "";
  redirect(`/player/access?playerId=${playerId}&added=${encodeURIComponent(email)}${suffix}`);
}

async function removeAccess(formData:FormData){
  "use server";
  const playerId = Number(formData.get("playerId"));
  const accessId = Number(formData.get("accessId"));
  const {accountId} = await requireManager(playerId);
  const rows = (await caspioFetch<AR>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,IsActive&where=AccessID=${accessId}&limit=1`)).data ?? [];
  const row = rows[0];
  if(!row || row.PlayerID !== playerId || row.AccountID === accountId) redirect(`/player/access?playerId=${playerId}&error=remove`);
  await caspioFetch(`/tables/${PLAYER_ACCESS_TABLE_ID}/records/bulk`,{
    method:"PATCH",
    body:JSON.stringify({where:`AccessID=${accessId}`,recordValues:{IsActive:false,EndedAt:new Date().toISOString()}})
  });
  redirect(`/player/access?playerId=${playerId}`);
}

export default async function AccessPage({searchParams}:{searchParams:Promise<Params>}){
  const params = await searchParams;
  const playerId = Number(params.playerId);
  const {accountId} = await requireManager(playerId);
  const player = await getPlayer(playerId);
  if(!player) notFound();

  const rows = (await caspioFetch<AR>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccessID,PlayerID,AccountID,Relationship,IsPrimary,IsActive,CanManageAccess&where=PlayerID=${playerId}&limit=100`)).data?.filter(r => r.IsActive !== false && r.IsActive !== 0) ?? [];
  const people = await Promise.all(rows.map(async r => ({row:r,account:await getAccount(r.AccountID)})));
  const inviteUrl = params.invite ? `https://true-approach-training-portal.vercel.app/accept-invite?token=${params.invite}` : "";

  return <main className="shell">
    <header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Manage Family Access</h1><div className="muted">{player.FirstName} {player.LastName}</div></div><Link className="textLink" href={`/player?playerId=${playerId}`}>← Player Portal</Link></header>
    {params.added ? <p className="successBanner">Access added for {params.added}.{params.invite ? " They need to create their password using the invitation link below." : " Their existing True Approach account can access this player now."}</p> : null}
    {params.invite ? <section className="card coachSection"><div className="label">INVITATION LINK</div><p>Until email delivery is connected, copy this link and send it to the new parent:</p><input readOnly value={inviteUrl}/></section> : null}
    {params.error ? <p className="errorBanner">{params.error === "exists" ? "That person already has access to this player." : params.error === "remove" ? "You cannot remove your own access here." : "Unable to update access. Please try again."}</p> : null}
    <section className="card coachSection"><div className="label">CURRENT ACCESS</div><h2>Parents & Guardians</h2><div className="historyList">{people.map(({row,account}) => <div className="historyRow" key={row.AccessID}><div><strong>{account ? `${account.FirstName} ${account.LastName}` : `Account ${row.AccountID}`}</strong><div className="muted">{account?.Email} · {row.Relationship || "Parent/Guardian"}{row.IsPrimary === true || row.IsPrimary === 1 ? " · Primary" : ""}</div></div>{row.AccountID !== accountId ? <form action={removeAccess}><input type="hidden" name="playerId" value={playerId}/><input type="hidden" name="accessId" value={row.AccessID}/><button className="textLink" type="submit">Remove Access</button></form> : <span className="muted">You</span>}</div>)}</div></section>
    <section className="card coachSection"><div className="label">ADD FAMILY MEMBER</div><h2>Add a Parent or Guardian</h2><p className="muted">They will only receive access to {player.FirstName}. If they already have an account, it will be linked automatically.</p><form className="form" action={addAccess}><input type="hidden" name="playerId" value={playerId}/><label>First Name<input name="firstName" required/></label><label>Last Name<input name="lastName" required/></label><label>Email<input name="email" type="email" required/></label><label>Relationship<select name="relationship" defaultValue="Parent"><option>Parent</option><option>Guardian</option><option>Grandparent</option><option>Other</option></select></label><button className="button primary">Add Family Access</button></form></section>
  </main>;
}
