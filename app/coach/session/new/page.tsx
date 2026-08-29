import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import { PLAYER_ACCESS_TABLE_ID, getAccount } from "../../../../lib/player-auth";
import { requireCoach } from "../../../../lib/coach-auth";
import { contentThumbnailUrl, playerSessionUrl, sendSessionPublished } from "../../../../lib/email";
import VideoFields from "../../VideoFields";
import RichTextEditor from "../../RichTextEditor";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";
const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type Player = { PlayerID: number; FirstName: string; LastName: string; IsActive: boolean };
type PlayerResponse = { data: Player[] };
type CreateSessionResponse = { data?: Array<{ SessionID?: number }>; PK_ID?: number; SessionID?: number };
type AccessRow = { AccountID: number; IsActive?: boolean | number | null };
type AccessResponse = { data: AccessRow[] };
type SessionContent = { VideoID: number; VideoFile: string; Title?: string | null; DisplayOrder?: number | null };
type SessionContentResponse = { data: SessionContent[] };
type Params = { saved?: string; error?: string; playerId?: string; sessionDate?: string; title?: string; coachNotes?: string; videoTitles?: string; videoNotes?: string; videoPaths?: string; videoOriginalNames?: string; videoCount?: string; emailed?: string; emailSkipped?: string };

async function getPlayers(): Promise<Player[]> {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,IsActive&where=IsActive=1&orderBy=LastName,FirstName&limit=200`);
  return result.data ?? [];
}

async function getPlayer(playerId: number) {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,IsActive&where=PlayerID=${playerId}&limit=1`);
  return result.data?.[0] ?? null;
}

async function getSessionContent(sessionId: number) {
  const result = await caspioFetch<SessionContentResponse>(`/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=VideoID,VideoFile,Title,DisplayOrder&where=SessionID=${sessionId}&orderBy=DisplayOrder,VideoID&limit=100`);
  return result.data ?? [];
}

function parseArray(value?: string): string[] {
  if (!value) return [""];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed.map((item) => String(item ?? "")) : [""];
  } catch {
    return [""];
  }
}

function errorRedirect(values: { playerId: number; sessionDate: string; title: string; coachNotes: string; videoTitles: string[]; videoNotes: string[]; videoPaths: string[]; videoOriginalNames: string[] }) {
  const params = new URLSearchParams({
    error: "save-failed",
    playerId: String(values.playerId),
    sessionDate: values.sessionDate,
    title: values.title,
    coachNotes: values.coachNotes,
    videoTitles: JSON.stringify(values.videoTitles),
    videoNotes: JSON.stringify(values.videoNotes),
    videoPaths: JSON.stringify(values.videoPaths),
    videoOriginalNames: JSON.stringify(values.videoOriginalNames)
  });
  redirect(`/coach/session/new?${params.toString()}`);
}

function fileName(path: string) {
  return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function contentKind(path: string) {
  const name = fileName(path).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|avif|bmp|heic|heif)$/.test(name)) return "image";
  if (/\.(mp4|mov|m4v|webm)$/.test(name)) return "video";
  return "document";
}

function documentLabel(path: string) {
  const extension = fileName(path).split(".").pop()?.toUpperCase() || "DOC";
  return extension.length <= 5 ? extension : "DOC";
}

function buildAttachmentsHtml(content: SessionContent[], sessionId: number, playerId: number) {
  if (!content.length) return "";
  const sessionUrl = playerSessionUrl(sessionId, playerId);
  const items = content.map((item) => {
    const title = escapeHtml(item.Title || fileName(item.VideoFile));
    const kind = contentKind(item.VideoFile);
    if (kind === "document") {
      return `<tr><td style="padding-top:8px;padding-right:0;padding-bottom:8px;padding-left:0;"><a href="${sessionUrl}" style="text-decoration:none;"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="62" align="center" valign="middle" bgcolor="#f0eee8" style="width:62px;height:58px;background-color:#f0eee8;border:1px solid #dedbd4;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#173f31;font-weight:bold;">${documentLabel(item.VideoFile)}</td></tr></table></a></td></tr>`;
    }
    const previewUrl = contentThumbnailUrl(item.VideoID);
    const alt = kind === "video" ? `Video preview: ${title}` : `Image preview: ${title}`;
    return `<tr><td style="padding-top:8px;padding-right:0;padding-bottom:10px;padding-left:0;"><a href="${sessionUrl}" style="text-decoration:none;"><img src="${previewUrl}" width="516" height="290" border="0" alt="${escapeHtml(alt)}" style="width:100%;max-width:516px;height:auto;display:block;border:0;border-radius:8px;"></a></td></tr>`;
  }).join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr><td style="padding-top:24px;padding-right:0;padding-bottom:4px;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#6b7280;font-weight:bold;letter-spacing:1px;">SESSION CONTENT</td></tr>${items}</table>`;
}

async function notifyFamily(playerId: number, sessionId: number, title: string, sessionDate: string) {
  const player = await getPlayer(playerId);
  if (!player) return 0;
  const [accessResult, content] = await Promise.all([
    caspioFetch<AccessResponse>(`/tables/${PLAYER_ACCESS_TABLE_ID}/records?select=AccountID,IsActive&where=PlayerID=${playerId}&limit=100`),
    getSessionContent(sessionId)
  ]);
  const access = accessResult.data?.filter((row) => row.IsActive !== false && row.IsActive !== 0) ?? [];
  const attachmentsHtml = buildAttachmentsHtml(content, sessionId, playerId);
  let sent = 0;
  for (const row of access) {
    const account = await getAccount(row.AccountID);
    if (!account?.Email) continue;
    try {
      await sendSessionPublished({
        email: account.Email,
        accountName: account.FirstName || "there",
        playerName: `${player.FirstName} ${player.LastName}`,
        sessionTitle: title,
        sessionDate,
        sessionId,
        playerId,
        attachmentsHtml
      });
      sent += 1;
    } catch (error) {
      console.error(`Session email failed for account ${row.AccountID}`, error);
    }
  }
  return sent;
}

async function publishSession(formData: FormData) {
  "use server";
  const coach = await requireCoach();
  if (!coach.canAddSessions) redirect("/coach");
  const playerId = Number(formData.get("playerId"));
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const coachNotes = String(formData.get("coachNotes") ?? "").trim();
  const suppressEmail = formData.get("suppressEmail") === "on";
  const videoPaths = formData.getAll("videoPath").map((value) => String(value ?? "").trim());
  const videoOriginalNames = formData.getAll("videoOriginalName").map((value) => String(value ?? "").trim());
  const videoTitles = formData.getAll("videoTitle").map((value) => String(value ?? "").trim());
  const videoNotes = formData.getAll("videoNote").map((value) => String(value ?? "").trim());
  const contentEntries = videoPaths.map((path, index) => ({
    path,
    originalName: videoOriginalNames[index] ?? "",
    title: videoTitles[index] ?? "",
    note: videoNotes[index] ?? ""
  })).filter((entry) => Boolean(entry.path));

  if (!Number.isInteger(playerId) || playerId <= 0 || !sessionDate || !title) redirect("/coach/session/new?error=missing-fields");

  let sessionId: number | undefined;
  let emailed = 0;
  try {
    const created = await caspioFetch<CreateSessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?echo=true`, {
      method: "POST",
      body: JSON.stringify({ PlayerID: playerId, SessionDate: sessionDate, Title: title, CoachNotes: coachNotes || null, Status: "Published", SessionSource: `Coach:${coach.account.AccountID}`, PublishedAt: new Date().toISOString() })
    });
    sessionId = created.data?.[0]?.SessionID ?? created.SessionID ?? created.PK_ID;
    if (!sessionId) throw new Error("Caspio did not return the new SessionID");

    for (let index = 0; index < contentEntries.length; index += 1) {
      const entry = contentEntries[index];
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records`, {
        method: "POST",
        body: JSON.stringify({ SessionID: sessionId, VideoFile: entry.path, Title: entry.title || entry.originalName || fileName(entry.path), CoachNote: entry.note || null, DisplayOrder: index + 1 })
      });
    }

    if (!suppressEmail) emailed = await notifyFamily(playerId, sessionId, title, sessionDate);
  } catch (error) {
    console.error("Publish session failed", error);
    errorRedirect({ playerId, sessionDate, title, coachNotes, videoTitles, videoNotes, videoPaths, videoOriginalNames });
  }

  const params = new URLSearchParams({ saved: "1", playerId: String(playerId), sessionDate, title, videoCount: String(contentEntries.length), emailed: String(emailed), emailSkipped: suppressEmail ? "1" : "0" });
  redirect(`/coach/session/new?${params.toString()}`);
}

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<Params> }) {
  const coach = await requireCoach();
  if (!coach.canAddSessions) redirect("/coach");
  const params = await searchParams;
  let players: Player[] = [];
  let playerLoadError = false;
  try { players = await getPlayers(); } catch { playerLoadError = true; }
  const today = new Date().toISOString().slice(0, 10);
  const selectedPlayer = players.find((player) => String(player.PlayerID) === params.playerId);
  const selectedPlayerName = selectedPlayer ? `${selectedPlayer.FirstName} ${selectedPlayer.LastName}` : "Selected player";
  const savedDate = params.sessionDate ? new Date(`${params.sessionDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  const retrying = params.error === "save-failed";
  const initialVideoTitles = retrying ? parseArray(params.videoTitles) : [""];
  const initialVideoNotes = retrying ? parseArray(params.videoNotes) : [""];
  const initialVideoPaths = retrying ? parseArray(params.videoPaths) : [];
  const initialVideoFileNames = retrying ? parseArray(params.videoOriginalNames) : [];
  const videoCount = Number(params.videoCount ?? 0);
  const emailed = Number(params.emailed ?? 0);
  const emailSkipped = params.emailSkipped === "1";

  return <main className="shell"><header className="topbar"><div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>New Session</h1><div className="muted">Coach: {coach.account.FirstName} {coach.account.LastName}</div></div><Link href="/coach" className="textLink">Coach Home</Link></header><section className="card coachSection"><div className="label">ADD SESSION</div><h2>Create a Training Session</h2>{params.saved === "1" ? <div className="successBanner" role="status"><div className="successIcon">✓</div><div><strong>Session published successfully</strong><p>{params.title || "Training session"} for {selectedPlayerName}{savedDate ? ` on ${savedDate}` : ""} was saved.{videoCount > 0 ? ` ${videoCount} content item${videoCount === 1 ? " was" : "s were"} uploaded and linked to this session.` : ""}{emailSkipped ? " Family notification email was skipped." : emailed > 0 ? ` ${emailed} family notification email${emailed === 1 ? " was" : "s were"} sent.` : ""}</p><span>You can add another session or return to Coach Home.</span></div></div> : null}{params.error === "missing-fields" ? <p className="errorBanner">Please select a player and enter a session date and title.</p> : null}{retrying ? <p className="errorBanner">Unable to save the session. Your form details and successfully uploaded content were preserved below. Please try publishing again.</p> : null}<form className="form" action={publishSession}><label>Player<select name="playerId" defaultValue={params.playerId ?? ""} required><option value="" disabled>{playerLoadError ? "Unable to load players" : players.length ? "Select a player" : "No active players yet"}</option>{players.map((player) => <option key={player.PlayerID} value={player.PlayerID}>{player.FirstName} {player.LastName}</option>)}</select></label><label>Session Date<input name="sessionDate" type="date" defaultValue={retrying ? params.sessionDate ?? today : today} required /></label><label>Session Title<input name="title" type="text" defaultValue={retrying ? params.title ?? "Hitting Session" : "Hitting Session"} required /></label><div className="formField"><div className="formFieldLabel">Overall Coach Notes</div><RichTextEditor name="coachNotes" initialValue={retrying ? params.coachNotes ?? "" : ""} placeholder="What should the player focus on?" /></div><VideoFields initialTitles={initialVideoTitles} initialNotes={initialVideoNotes} initialPaths={initialVideoPaths} initialFileNames={initialVideoFileNames} /><label style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 10, fontWeight: 700 }}><input name="suppressEmail" type="checkbox" style={{ width: "auto" }} /> Do not send a family notification email for this session</label><button className="button primary" type="submit" disabled={!players.length || playerLoadError}>Publish Session</button></form></section></main>;
}
