import { sendEmail } from "./email.provider.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const html = `
    <h1>Welcome to Ferry, ${escapeHtml(name)}!</h1>

    <p>Thanks for creating your Ferry account.</p>

    <p>Please verify your email address by clicking the button below:</p>

    <p>
      <a href="${escapeHtml(verificationUrl)}">
        Verify my email
      </a>
    </p>

    <p>This link will expire soon.</p>

    <p>— The Ferry Team 🚢</p>
  `;

  return sendEmail({
    to,
    subject: "Verify your Ferry email address",
    html,
  });
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = `
    <h1>Reset your Ferry password</h1>

    <p>Hi ${escapeHtml(name)},</p>

    <p>Use the link below to choose a new password for your Ferry account:</p>

    <p>
      <a href="${escapeHtml(resetUrl)}">
        Reset my password
      </a>
    </p>

    <p>This link expires soon and can only be used once.</p>

    <p>If you did not request this, you can safely ignore this email.</p>

    <p>- The Ferry Team</p>
  `;

  return sendEmail({
    to,
    subject: "Reset your Ferry password",
    html,
  });
};
