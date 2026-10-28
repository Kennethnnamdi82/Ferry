import { Resend } from "resend";

export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email is not configured");
  }
  // Initialize lazily so missing email configuration cannot stop authentication.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    { from: process.env.EMAIL_FROM, to, subject, html },
    { signal: AbortSignal.timeout(10000) },
  );
  if (error) throw new Error("Email delivery failed");
  return data;
};
