const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "support@mail.trueapproachbaseball.com";

function appUrl() {
  return (process.env.APP_URL || "https://true-approach-training-portal.vercel.app").replace(/\/$/, "");
}

export function invitationUrl(token: string) {
  return `${appUrl()}/accept-invite?token=${encodeURIComponent(token)}`;
}

export function passwordResetUrl(token: string) {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function playerSessionUrl(sessionId: number, playerId: number) {
  return `${appUrl()}/player/session/${sessionId}?playerId=${playerId}`;
}

export function coachSessionUrl(sessionId: number) {
  return `${appUrl()}/coach/session/${sessionId}`;
}

export function contentFileUrl(videoId: number) {
  return `${appUrl()}/api/video/${videoId}`;
}

export function contentThumbnailUrl(videoId: number) {
  return `${appUrl()}/api/content-thumbnail/${videoId}`;
}

type TemplateVariables = Record<string, string | number>;

async function sendTemplateEmail(to: string | string[], templateId: string, variables: TemplateVariables) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY is not configured. Skipping ${templateId} email.`);
    return { skipped: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      template: { id: templateId, variables }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${details}`);
  }

  return response.json();
}

export async function sendParentInvitation(args: { email: string; parentName: string; playerName: string; token: string }) {
  return sendTemplateEmail(args.email, "true-approach-parent-invitation", {
    PARENT_NAME: args.parentName,
    PLAYER_NAME: args.playerName,
    INVITE_URL: invitationUrl(args.token)
  });
}

export async function sendPasswordReset(args: { email: string; accountName: string; token: string }) {
  return sendTemplateEmail(args.email, "true-approach-password-reset", {
    ACCOUNT_NAME: args.accountName,
    RESET_URL: passwordResetUrl(args.token)
  });
}

export async function sendSessionPublished(args: { email: string; accountName: string; playerName: string; sessionTitle: string; sessionDate: string; sessionId: number; playerId: number; attachmentsHtml?: string }) {
  return sendTemplateEmail(args.email, "true-approach-session-published", {
    ACCOUNT_NAME: args.accountName,
    PLAYER_NAME: args.playerName,
    SESSION_TITLE: args.sessionTitle,
    SESSION_DATE: args.sessionDate,
    SESSION_URL: playerSessionUrl(args.sessionId, args.playerId),
    ATTACHMENTS_HTML: args.attachmentsHtml ?? ""
  });
}

export async function sendPlayerSessionAddedToCoach(args: { coachEmail: string; playerName: string; sessionTitle: string; sessionDate: string; sessionId: number }) {
  return sendTemplateEmail(args.coachEmail, "true-approach-player-session-added", {
    PLAYER_NAME: args.playerName,
    SESSION_TITLE: args.sessionTitle,
    SESSION_DATE: args.sessionDate,
    SESSION_URL: coachSessionUrl(args.sessionId)
  });
}
