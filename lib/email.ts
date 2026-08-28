const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "support@mail.trueapproachbaseball.com";
const LOGO_URL = "https://a6defeefbe5ec18834b4.cdn6.editmysite.com/uploads/b/a6defeefbe5ec18834b4ae0b514e538d4f57ff7d613345ef065b5ef7daa9dcfa/TA%20transparent%20PNG_1777845753.png?width=2400&optimize=medium";

function appUrl() {
  return (process.env.APP_URL || "https://true-approach-training-portal.vercel.app").replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
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

async function resendRequest(payload: Record<string, unknown>, label: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY is not configured. Skipping ${label} email.`);
    return { skipped: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${details}`);
  }

  return response.json();
}

async function sendTemplateEmail(to: string | string[], templateId: string, variables: TemplateVariables) {
  return resendRequest({
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    template: { id: templateId, variables }
  }, templateId);
}

async function sendHtmlEmail(to: string, subject: string, html: string, text: string, label: string) {
  return resendRequest({
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to: [to],
    subject,
    html,
    text
  }, label);
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
  const sessionUrl = playerSessionUrl(args.sessionId, args.playerId);
  const accountName = escapeHtml(args.accountName);
  const playerName = escapeHtml(args.playerName);
  const sessionTitle = escapeHtml(args.sessionTitle);
  const sessionDate = escapeHtml(args.sessionDate);
  const attachmentsHtml = args.attachmentsHtml ?? "";
  const subject = "A new training session is ready in True Approach Dugout";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body style="margin:0;padding:0;background-color:#f4f2ee;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f4f2ee;"><tr><td align="center" style="padding-top:28px;padding-bottom:28px;background-color:#f4f2ee;" bgcolor="#f4f2ee"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;"><tr><td align="center" style="padding-top:30px;padding-right:32px;padding-bottom:24px;padding-left:32px;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#173f31;" bgcolor="#ffffff"><img src="${LOGO_URL}" width="120" height="120" border="0" alt="True Approach Baseball" style="width:120px;height:120px;display:block;"><p style="margin-top:8px;margin-bottom:8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;color:#173f31;font-weight:bold;letter-spacing:2px;">TRUE APPROACH BASEBALL</p><p style="margin-top:0;margin-bottom:0;font-family:Georgia,serif;font-size:15px;line-height:22px;color:#a4874f;font-style:italic;">Developing Players. Building Character.</p></td></tr><tr><td height="4" style="font-size:1px;line-height:4px;background-color:#173f31;" bgcolor="#173f31">&nbsp;</td></tr><tr><td style="padding-top:42px;padding-right:42px;padding-bottom:38px;padding-left:42px;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#222222;" bgcolor="#ffffff"><p style="margin-top:0;margin-bottom:28px;text-align:center;font-family:Georgia,serif;font-size:32px;line-height:40px;color:#173f31;font-weight:bold;">A New Session Is Ready</p><p style="margin-top:0;margin-bottom:18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#222222;">Hi ${accountName},</p><p style="margin-top:0;margin-bottom:22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#222222;">A new training session for <strong>${playerName}</strong> has been published in True Approach Dugout.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr><td style="padding-top:16px;padding-right:18px;padding-bottom:16px;padding-left:18px;background-color:#f8f7f4;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#333333;" bgcolor="#f8f7f4"><strong>${sessionTitle}</strong><br>${sessionDate}</td></tr></table>${attachmentsHtml}<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr><td align="center" style="padding-top:28px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#0f5138" style="background-color:#0f5138;"><a href="${sessionUrl}" style="display:inline-block;padding-top:15px;padding-right:34px;padding-bottom:15px;padding-left:34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#ffffff;text-decoration:none;font-weight:bold;">Review Session</a></td></tr></table></td></tr></table></td></tr><tr><td style="padding-top:28px;padding-right:36px;padding-bottom:30px;padding-left:36px;background-color:#f8f7f4;border-top:1px solid #dedbd4;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#555555;" bgcolor="#f8f7f4"><p style="margin-top:0;margin-bottom:4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;color:#173f31;font-weight:bold;">TRUE APPROACH BASEBALL</p><p style="margin-top:0;margin-bottom:18px;font-family:Georgia,serif;font-size:14px;line-height:20px;color:#a4874f;font-style:italic;">Developing Players. Building Character.</p><p style="margin-top:0;margin-bottom:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#555555;">Need help? Contact us at support@mail.trueapproachbaseball.com</p></td></tr></table></td></tr></table></body></html>`;
  const text = `TRUE APPROACH BASEBALL\n\nDeveloping Players. Building Character.\n\nA New Session Is Ready\n\nHi ${args.accountName},\n\nA new training session for ${args.playerName} has been published in True Approach Dugout.\n\n${args.sessionTitle}\n${args.sessionDate}\n\nReview Session: ${sessionUrl}\n\nNeed help? Contact us at support@mail.trueapproachbaseball.com`;
  return sendHtmlEmail(args.email, subject, html, text, "session-published");
}

export async function sendPlayerSessionAddedToCoach(args: { coachEmail: string; playerName: string; sessionTitle: string; sessionDate: string; sessionId: number }) {
  return sendTemplateEmail(args.coachEmail, "true-approach-player-session-added", {
    PLAYER_NAME: args.playerName,
    SESSION_TITLE: args.sessionTitle,
    SESSION_DATE: args.sessionDate,
    SESSION_URL: coachSessionUrl(args.sessionId)
  });
}
