import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { caspioFetch } from "../../../../lib/caspio";
import PlayerContentFields from "../../PlayerContentFields";

export const dynamic = "force-dynamic";

const PLAYERS_TABLE_ID = "k2a3fa";
const SESSIONS_TABLE_ID = "o1u972";
const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type Player = { PlayerID: number; FirstName: string; LastName: string; IsActive: boolean };
type PlayerResponse = { data: Player[] };
type CreateSessionResponse = { data?: Array<{ SessionID?: number }>; SessionID?: number; PK_ID?: number };
type UploadResponse = { data: Array<{ fullFilePath: string }> };

type Params = { playerId?: string; error?: string };

async function getPlayer(playerId: number) {
  const result = await caspioFetch<PlayerResponse>(`/tables/${PLAYERS_TABLE_ID}/records?select=PlayerID,FirstName,LastName,IsActive&where=PlayerID=${playerId}&limit=1`);
  return result.data?.[0] ?? null;
}

function uniqueFileName(originalName: string, index: number) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${index + 1}-${safeName}`;
}

async function uploadContent(file: File, index: number) {
  const uploadForm = new FormData();
  uploadForm.append("Files", file, uniqueFileName(file.name, index));
  const uploaded = await caspioFetch<UploadResponse>("/fileAssets/files/bulk", { method: "POST", body: uploadForm });
  const fullFilePath = uploaded.data?.[0]?.fullFilePath;
  if (!fullFilePath) throw new Error("Stored file path was not returned");
  return fullFilePath;
}

async function publishPlayerSession(formData: FormData) {
  "use server";

  const playerId = Number(formData.get("playerId"));
  const sessionDate = String(formData.get("sessionDate") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const sessionNotes = String(formData.get("sessionNotes") ?? "").trim();
  const rawFiles = formData.getAll("video");
  const titles = formData.getAll("videoTitle").map((value) => String(value ?? "").trim());
  const notes = formData.getAll("videoNote").map((value) => String(value ?? "").trim());
  const files = rawFiles.filter((value): value is File => value instanceof File && value.size > 0);

  if (!Number.isInteger(playerId) || playerId <= 0 || !sessionDate || !title) {
    redirect(`/player/session/new?playerId=${playerId}&error=missing-fields`);
  }

  try {
    const created = await caspioFetch<CreateSessionResponse>(`/tables/${SESSIONS_TABLE_ID}/records?echo=true`, {
      method: "POST",
      body: JSON.stringify({
        PlayerID: playerId,
        SessionDate: sessionDate,
        Title: title,
        CoachNotes: sessionNotes || null,
        Status: "Player Submitted",
        PublishedAt: new Date().toISOString()
      })
    });

    const sessionId = created.data?.[0]?.SessionID ?? created.SessionID ?? created.PK_ID;
    if (!sessionId) throw new Error("Session ID was not returned");

    for (let index = 0; index < files.length; index += 1) {
      const sourceFile = files[index];
      const fullFilePath = await uploadContent(sourceFile, index);
      await caspioFetch(`/tables/${SESSION_VIDEOS_TABLE_ID}/records`, {
        method: "POST",
        body: JSON.stringify({
          SessionID: sessionId,
          VideoFile: fullFilePath,
          Title: titles[index] || sourceFile.name,
          CoachNote: notes[index] || null,
          DisplayOrder: index + 1
        })
      });
    }

    redirect(`/player/session/${sessionId}?playerId=${playerId}&created=1`);
  } catch (error) {
    console.error("Player session publish failed", error);
    redirect(`/player/session/new?playerId=${playerId}&error=save-failed`);
  }
}

export default async function NewPlayerSessionPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const playerId = Number(params.playerId);
  if (!Number.isInteger(playerId) || playerId <= 0) notFound();

  const player = await getPlayer(playerId);
  if (!player || !player.IsActive) notFound();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">TRUE APPROACH BASEBALL</div><h1>New Training Session</h1></div>
        <Link href={`/player?playerId=${playerId}`} className="textLink">← Player Portal</Link>
      </header>

      <section className="card coachSection">
        <div className="label">ADD YOUR SESSION</div>
        <h2>{player.FirstName} {player.LastName}</h2>
        <p className="muted">Upload videos or pictures from your own training so you and your coach can review them later.</p>

        {params.error === "missing-fields" ? <p className="errorBanner">Session date and title are required.</p> : null}
        {params.error === "save-failed" ? <p className="errorBanner">Unable to save this session. Please reselect your content files and try again.</p> : null}

        <form className="form" action={publishPlayerSession}>
          <input type="hidden" name="playerId" value={playerId} />
          <label>Session Date<input name="sessionDate" type="date" defaultValue={today} required /></label>
          <label>Session Title<input name="title" type="text" defaultValue="Player Session" required /></label>
          <label>Session Notes<textarea name="sessionNotes" rows={5} placeholder="What did you work on? What felt good? What do you want your coach to look at?" /></label>
          <PlayerContentFields />
          <button className="button primary" type="submit">Add Session</button>
        </form>
      </section>
    </main>
  );
}
