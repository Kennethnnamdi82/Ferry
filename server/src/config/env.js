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
  const required = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
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
