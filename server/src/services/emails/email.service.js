import { sendEmail } from "./email.provider.js";

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const html = `
    <h1>Welcome to Ferry, ${name}!</h1>

    <p>Thanks for creating your Ferry account.</p>

    <p>Please verify your email address by clicking the button below:</p>

    <p>
      <a href="${verificationUrl}">
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
