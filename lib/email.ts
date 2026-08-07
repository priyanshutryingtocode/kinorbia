import { Resend } from "resend";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
}

function normalizeBaseUrl() {
  const url = getAppUrl();
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

export function buildLink(path: string) {
  return `${normalizeBaseUrl()}${path}`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "KinOrbia <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}