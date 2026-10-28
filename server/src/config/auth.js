export function requiresEmailVerification(user) {
  return process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
    user.role !== "admin" && !user.emailVerified;
}

export function canSendEmail() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL);
}
