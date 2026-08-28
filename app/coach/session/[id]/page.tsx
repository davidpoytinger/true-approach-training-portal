import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import VideoFields from "../../VideoFields";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";
const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type Player = { PlayerID: number; FirstName: string; LastName: string };
type PlayerResponse = { data: Player[] };
type TrainingSession = {
  PK_ID: number;
  SessionID: number;
  PlayerID: number;
  SessionDate: string;
  Title: string;
  CoachNotes?: string | null;
  Status: string;
};
type SessionResponse = { data: TrainingSession[] };
type SessionVideo = {
  PK_ID: number;
  VideoID: number;
  SessionID: number;
  VideoFile: string;
  Title: string;
  CoachNote?: string | null;
  DisplayOrder?: number | null;
};
type VideoResponse = { data: SessionVideo[] };
type UploadResponse = { data: Array<{ fullFilePath: string }> };

function uniqueFileName(originalName: string, index: number): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${index + 1}-${safeName}`;
}

async function uploadVideo(video: File, index: number): Promise<string> {
  const uploadForm = new FormData();
  uploadForm.append("Files", video, uniqueFileName(video.name, index));
  const uploaded = await caspioFetch<UploadResponse>("/fileAssets/files/bulk", { method: "POST", body: uploadForm });
  const fullFilePath = uploaded.data?.[0]?.fullFilePath;
  if (!fullFilePath) throw new Error("Caspio did not return an uploaded file path");
  return fullFilePath;
}

async function getSession(sessionId: number) {
  const result = await caspioFetch<SessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?select=PK_ID,SessionID,PlayerID,SessionDate,Title,CoachNotes,Status&where=SessionID=${sessionId}&limit=1`);
  return result.data?.[0] ?? null;
}

async function getVideos(sessionId: number) {
  const result = await caspioFetch<VideoResponse>(`/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=PK_ID,VideoID,SessionID,VideoFile,Title,CoachNote,DisplayOrder&where=SessionID=${sessionId}&orderBy=DisplayOrder,VideoID&limit=200`);
  return result.data ?? [];
}

async function getPlayers() {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName&limit=500`);
  return result.data ?? [];
}

async function saveSession(sessionId: number, formData: FormData) {
  "use server";

  const session = await getSession(sessionId);
  if (!session) notFound();

  const playerId = Number(formData.get("playerId"));
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const coachNotes = String(formData.get("coachNotes") ?? "").trim();
  const existingVideos = await getVideos(sessionId);

  if (!Number.isInteger(playerId) || !sessionDate || !title) {
    redirect(`/coach/session/${sessionId}?error=missing-fields`);
  }

  try {
    await caspioFetch(`/tables/${SESSIONS_TABLE_ID}/records/${session.PK_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ PlayerID: playerId, SessionDate: sessionDate, Title: title, CoachNotes: coachNotes || null })
    });

    for (const video of existingVideos) {
      const remove = formData.get(`remove_${video.PK_ID}`) === "1";
      if (remove) {
        await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records/${video.PK_ID}`, { method: "DELETE" });
        continue;
      }

      const nextTitle = String(formData.get(`title_${video.PK_ID}`) ?? "").trim();
      const nextNote = String(formData.get(`note_${video.PK_ID}`) ?? "").trim();
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records/${video.PK_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ Title: nextTitle || video.Title, CoachNote: nextNote || null })
      });
    }

    const rawNewVideos = formData.getAll("video");
    const newTitles = formData.getAll("videoTitle").map((value) => String(value ?? "").trim());
    const newNotes = formData.getAll("videoNote").map((value) => String(value ?? "").trim());
    const newVideos = rawNewVideos.filter((value): value is File => value instanceof File && value.size > 0);
    const remainingCount = existingVideos.filter((video) => formData.get(`remove_${video.PK_ID}`) !== "1").length;

    for (let index = 0; index < newVideos.length; index += 1) {
      const sourceVideo = newVideos[index];
      const fullFilePath = await uploadVideo(sourceVideo, index);
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records`, {
        method: "POST",
        body: JSON.stringify({
          SessionID: sessionId,
          VideoFile: fullFilePath,
          Title: newTitles[index] || sourceVideo.name,
          CoachNote: newNotes[index] || null,
          DisplayOrder: remainingCount + index + 1
        })
      });
    }
  } catch (error) {
    console.error("Coach session update failed", error);
    redirect(`/coach/session/${sessionId}?error=save-failed`);
  }

  redirect(`/coach/session/${sessionId}?saved=1`);
}

function dateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function fileName(path: string) {
  return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
}

export default async function CoachSessionPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) notFound();

  const [session, videos, players] = await Promise.all([getSession(sessionId), getVideos(sessionId), getPlayers()]);
  if (!session) notFound();
  const saveAction = saveSession.bind(null, sessionId);

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Review Session</h1></div>
        <Link href="/coach" className="textLink">← Coach Portal</Link>
      </header>

      <section className="card coachSection">
        <div className="label">SESSION HISTORY</div>
        <h2>{session.Title}</h2>
        {query.saved === "1" ? <div className="successBanner"><div className="successIcon">✓</div><div><strong>Changes saved</strong><p>This session was updated in Caspio.</p></div></div> : null}
        {query.error === "missing-fields" ? <p className="errorBanner">Player, date, and session title are required.</p> : null}
        {query.error === "save-failed" ? <p className="errorBanner">Unable to save one or more changes. Please try again.</p> : null}

        <form className="form" action={saveAction}>
          <label>Player<select name="playerId" defaultValue={String(session.PlayerID)} required>{players.map((player) => <option key={player.PlayerID} value={player.PlayerID}>{player.FirstName} {player.LastName}</option>)}</select></label>
          <label>Session date<input name="sessionDate" type="date" defaultValue={dateInputValue(session.SessionDate)} required /></label>
          <label>Session title<input name="title" type="text" defaultValue={session.Title} required /></label>
          <label>Overall coach notes<textarea name="coachNotes" rows={4} defaultValue={session.CoachNotes ?? ""} /></label>

          <fieldset>
            <legend>Current Videos</legend>
            <div className="videoFields">
              {videos.length ? videos.map((video, index) => (
                <div className="videoEntry" key={video.VideoID}>
                  <div className="videoEntryHeader"><strong>Video {index + 1}</strong><span className="muted">{fileName(video.VideoFile)}</span></div>
                  <div className="storedVideoBadge">Stored in Caspio</div>
                  <label>Video title<input name={`title_${video.PK_ID}`} type="text" defaultValue={video.Title} /></label>
                  <label>Video coach note<textarea name={`note_${video.PK_ID}`} rows={3} defaultValue={video.CoachNote ?? ""} /></label>
                  <label className="removeVideoCheck"><input name={`remove_${video.PK_ID}`} type="checkbox" value="1" /> Remove this video from the session</label>
                </div>
              )) : <p className="muted">This session does not have any videos.</p>}
            </div>
          </fieldset>

          <VideoFields />
          <p className="muted">Use the section above only if you want to add new videos to this existing session.</p>
          <div className="actions"><button className="button primary" type="submit">Save Changes</button><Link className="button secondary" href="/coach">Cancel</Link></div>
        </form>
      </section>
    </main>
  );
}
