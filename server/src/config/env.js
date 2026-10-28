const envAliases = {
  MONGO_URI: ["MONGODB_URI", "DATABASE_URL"],
};

export function getEnv(name) {
  if (process.env[name]) return process.env[name];

  for (const alias of envAliases[name] || []) {
    if (process.env[alias]) return process.env[alias];
  }

  return "";
}

export function validateStartupEnv() {
  const required = [
    "MONGO_URI",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ];
  const missing = required.filter((name) => !getEnv(name));

  if (missing.length > 0) {
    throw new Error(
      [
        `Missing required environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
        "On Render, add them in the service Environment tab.",
        "MONGO_URI may also be named MONGODB_URI or DATABASE_URL.",
      ].join(" "),
    );
  }

  if (process.env.REQUIRE_EMAIL_VERIFICATION && !["true", "false"].includes(process.env.REQUIRE_EMAIL_VERIFICATION)) {
    throw new Error("REQUIRE_EMAIL_VERIFICATION must be true or false.");
  }
  const emailMissing = ["RESEND_API_KEY", "EMAIL_FROM", "APP_URL"].filter((name) => !getEnv(name));
  if (emailMissing.length && process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
    throw new Error(`Email verification is required but email configuration is missing: ${emailMissing.join(", ")}`);
  }
  if (emailMissing.length) {
    console.warn("[startup] Email is not configured. Signup and login are available; verification and password reset emails are unavailable.");
  }
  if (process.env.APP_URL) {
    const url = new URL(process.env.APP_URL);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error("APP_URL must be an HTTP(S) frontend URL without credentials, query parameters or a fragment.");
    }
  }

  const cloudinaryMissing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((name) => !process.env[name]);

  if (cloudinaryMissing.length > 0) {
    console.warn(
      `[startup] Missing Cloudinary env vars: ${cloudinaryMissing.join(", ")}. File upload/delete features will fail until they are set.`,
    );
  }
}
