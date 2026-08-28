import Link from "next/link";
import { redirect } from "next/navigation";
import { caspioFetch } from "../../lib/caspio";
import VideoFields from "./VideoFields";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";
const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type Player = { PlayerID: number; FirstName: string; LastName: string; IsActive: boolean };
type PlayerResponse = { data: Player[] };
type CreateSessionResponse = { data?: Array<{ SessionID?: number }>; PK_ID?: number; SessionID?: number };
type UploadResponse = { data: Array<{ name: string; fileId: string; fullFilePath: string }> };
type CoachParams = {
  saved?: string;
  error?: string;
  playerId?: string;
  sessionDate?: string;
  title?: string;
  coachNotes?: string;
  videoTitles?: string;
  videoNotes?: string;
  videoCount?: string;
};

async function getPlayers(): Promise<Player[]> {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,IsActive&where=IsActive=1&orderBy=LastName,FirstName&limit=200`);
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

function errorRedirect(values: {
  playerId: number;
  sessionDate: string;
  title: string;
  coachNotes: string;
  videoTitles: string[];
  videoNotes: string[];
}) {
  const params = new URLSearchParams({
    error: "save-failed",
    playerId: String(values.playerId),
    sessionDate: values.sessionDate,
    title: values.title,
    coachNotes: values.coachNotes,
    videoTitles: JSON.stringify(values.videoTitles),
    videoNotes: JSON.stringify(values.videoNotes)
  });
  redirect(`/coach?${params.toString()}`);
}

async function publishSession(formData: FormData) {
  "use server";

  const playerId = Number(formData.get("playerId"));
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const coachNotes = String(formData.get("coachNotes") ?? "").trim();
  const rawVideos = formData.getAll("video");
  const videoTitles = formData.getAll("videoTitle").map((value) => String(value ?? "").trim());
  const videoNotes = formData.getAll("videoNote").map((value) => String(value ?? "").trim());
  const videos = rawVideos.filter((value): value is File => value instanceof File && value.size > 0);

  if (!Number.isInteger(playerId) || playerId <= 0 || !sessionDate || !title) {
    redirect("/coach?error=missing-fields");
  }

  try {
    let uploadedFiles: UploadResponse["data"] = [];

    if (videos.length) {
      const uploadForm = new FormData();
      videos.forEach((video) => uploadForm.append("Files", video, video.name));
      const uploaded = await caspioFetch<UploadResponse>("/fileAssets/files/bulk", {
        method: "POST",
        body: uploadForm
      });
      uploadedFiles = uploaded.data ?? [];
      if (uploadedFiles.length !== videos.length || uploadedFiles.some((file) => !file.fullFilePath)) {
        throw new Error("Caspio did not return all uploaded file paths");
      }
    }

    const created = await caspioFetch<CreateSessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?echo=true`, {
      method: "POST",
      body: JSON.stringify({
        PlayerID: playerId,
        SessionDate: sessionDate,
        Title: title,
        CoachNotes: coachNotes || null,
        Status: "Published",
        PublishedAt: new Date().toISOString()
      })
    });

    const sessionId = created.data?.[0]?.SessionID ?? created.SessionID ?? created.PK_ID;
    if (!sessionId) throw new Error("Caspio did not return the new SessionID");

    for (let index = 0; index < uploadedFiles.length; index += 1) {
      const uploadedFile = uploadedFiles[index];
      const sourceVideo = videos[index];
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records`, {
        method: "POST",
        body: JSON.stringify({
          SessionID: sessionId,
          VideoFile: uploadedFile.fullFilePath,
          Title: videoTitles[index] || sourceVideo.name,
          CoachNote: videoNotes[index] || null,
          DisplayOrder: index + 1
        })
      });
    }
  } catch (error) {
    console.error("Publish session failed", error);
    errorRedirect({ playerId, sessionDate, title, coachNotes, videoTitles, videoNotes });
  }

  const params = new URLSearchParams({
    saved: "1",
    playerId: String(playerId),
    sessionDate,
    title,
    videoCount: String(videos.length)
  });
  redirect(`/coach?${params.toString()}`);
}

export default async function CoachDashboard({ searchParams }: { searchParams: Promise<CoachParams> }) {
  const params = await searchParams;
  let players: Player[] = [];
  let playerLoadError = false;
  try {
    players = await getPlayers();
  } catch {
    playerLoadError = true;
  }

  const today = new Date().toISOString().slice(0, 10);
  const savedPlayer = players.find((player) => String(player.PlayerID) === params.playerId);
  const savedPlayerName = savedPlayer ? `${savedPlayer.FirstName} ${savedPlayer.LastName}` : "Selected player";
  const savedDate = params.sessionDate
    ? new Date(`${params.sessionDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "";
  const retrying = params.error === "save-failed";
  const initialVideoTitles = retrying ? parseArray(params.videoTitles) : [""];
  const initialVideoNotes = retrying ? parseArray(params.videoNotes) : [""];
  const videoCount = Number(params.videoCount ?? 0);

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>Coach Portal</h1></div>
        <Link href="/" className="textLink">Log out</Link>
      </header>
      <section className="card">
        <div className="label">MVP COACH WORKFLOW</div>
        <h2>Create a training session</h2>
        {params.saved === "1" ? (
          <div className="successBanner" role="status">
            <div className="successIcon">✓</div>
            <div>
              <strong>Session published successfully</strong>
              <p>
                {params.title || "Training session"} for {savedPlayerName}{savedDate ? ` on ${savedDate}` : ""} was saved to Caspio.
                {videoCount > 0 ? ` ${videoCount} video${videoCount === 1 ? " was" : "s were"} uploaded and linked to this session.` : ""}
              </p>
              <span>You can create another session below.</span>
            </div>
          </div>
        ) : null}
        {params.error === "missing-fields" ? <p className="errorBanner">Please select a player and enter a session date and title.</p> : null}
        {retrying ? <p className="errorBanner">Unable to save the session or videos. Your form details were preserved below. Please reselect the video files and try again.</p> : null}

        <form className="form" action={publishSession}>
          <label>
            Player
            <select name="playerId" defaultValue={retrying ? params.playerId ?? "" : ""} required>
              <option value="" disabled>{playerLoadError ? "Unable to load players" : players.length ? "Select a player" : "No active players yet"}</option>
              {players.map((player) => <option key={player.PlayerID} value={player.PlayerID}>{player.FirstName} {player.LastName}</option>)}
            </select>
          </label>
          <label>Session date<input name="sessionDate" type="date" defaultValue={retrying ? params.sessionDate ?? today : today} required /></label>
          <label>Session title<input name="title" type="text" defaultValue={retrying ? params.title ?? "Hitting Session" : "Hitting Session"} required /></label>
          <label>Overall coach notes<textarea name="coachNotes" rows={4} placeholder="What should the player focus on?" defaultValue={retrying ? params.coachNotes ?? "" : ""} /></label>
          <VideoFields initialTitles={initialVideoTitles} initialNotes={initialVideoNotes} />
          <button className="button primary" type="submit" disabled={!players.length || playerLoadError}>Publish Session</button>
        </form>
      </section>
    </main>
  );
}
