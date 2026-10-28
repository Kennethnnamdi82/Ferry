import "express-async-errors";
import { after, before, beforeEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import { Resend } from "resend";
import authRoutes from "../src/routes/auth.js";
import errorHandler from "../src/middleware/error.js";
import User from "../src/models/User.js";
import Vault from "../src/models/Vault.js";
import ActivityLog from "../src/models/ActivityLog.js";
import { invite } from "../src/controllers/vaultController.js";
import { generateToken, hashToken } from "../src/utils/authTokens.js";
import { validateStartupEnv } from "../src/config/env.js";

let mongo, server, baseUrl;
let deliveryFails = false;
const emails = [];
const signup = { name: "External User", email: "external@example.net", password: "Strong-password-42" };

before(async () => {
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve("node_modules/.cache/mongodb-binaries");
  const localBinary = path.join(process.env.MONGOMS_DOWNLOAD_DIR, "mongod.exe");
  if (process.platform === "win32" && existsSync(localBinary)) process.env.MONGOMS_SYSTEM_BINARY = localBinary;
  process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-production";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";
  // Mock the provider transport only; every account operation uses a real isolated MongoDB.
  mock.method(Resend.prototype, "fetchRequest", async (_url, options) => {
    emails.push(JSON.parse(options.body));
    if (deliveryFails) return { error: { message: "Only testing recipients are allowed" }, data: null };
    return { error: null, data: { id: "test-email-id" } };
  });
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.init();
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Vault.deleteMany({}), ActivityLog.deleteMany({})]);
  delete process.env.REQUIRE_EMAIL_VERIFICATION;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.APP_URL;
  deliveryFails = false;
  emails.length = 0;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  mock.restoreAll();
});

async function request(route, body, token) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

function enableEmail() {
  process.env.RESEND_API_KEY = "re_test_placeholder";
  process.env.EMAIL_FROM = "Ferry <onboarding@resend.dev>";
  process.env.APP_URL = "https://ferry.example";
}

test("external signup without email configuration persists hashed credentials and a vault, then logs in", async () => {
  const result = await request("/register", { ...signup, name: " External User ", email: " EXTERNAL@EXAMPLE.NET ", role: "admin", emailVerified: true });
  assert.equal(result.status, 201);
  assert.equal(result.data.verificationRequired, false);
  assert.equal(result.data.verificationEmailSent, false);
  assert.equal(result.data.user.name, signup.name);
  assert.equal(result.data.user.email, signup.email);
  assert.equal(result.data.user.role, "user");
  assert.equal(result.data.user.emailVerified, false);
  assert.equal(result.data.user.password, undefined);
  const stored = await User.findById(result.data.user.id).select("+password");
  assert.notEqual(stored.password, signup.password);
  assert.ok(await stored.comparePassword(signup.password));
  assert.equal(await Vault.countDocuments({ owner: stored._id, name: "My Documents" }), 1);
  assert.equal((await request("/me", undefined, result.data.accessToken)).status, 200);
  const login = await request("/login", { email: " EXTERNAL@EXAMPLE.NET ", password: signup.password });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.id, result.data.user.id);
  assert.equal((await request("/refresh", { refreshToken: login.data.refreshToken })).status, 200);
});

test("Resend rejection never rolls back a user or vault or prevents later login", async () => {
  enableEmail();
  deliveryFails = true;
  const result = await request("/register", signup);
  assert.equal(result.status, 201);
  assert.equal(result.data.verificationEmailSent, false);
  assert.ok(result.data.accessToken);
  assert.equal(await User.countDocuments(), 1);
  assert.equal(await Vault.countDocuments(), 1);
  assert.equal((await request("/login", signup)).status, 200);
});

test("duplicate and concurrent signups cannot overwrite credentials or create extra accounts", async () => {
  const results = await Promise.all([request("/register", signup), request("/register", signup)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const duplicate = await request("/register", { ...signup, password: "Attacker-password-42", name: "Attacker" });
  assert.equal(duplicate.status, 409);
  assert.equal(await User.countDocuments(), 1);
  assert.equal(await Vault.countDocuments(), 1);
  assert.equal((await request("/login", signup)).status, 200);
  assert.equal((await request("/login", { ...signup, password: "Attacker-password-42" })).status, 401);
});

test("legacy unverified users can log in by default; explicit verification policy is enforced everywhere", async () => {
  const initial = await request("/register", signup);
  assert.equal((await request("/login", signup)).status, 200);
  process.env.REQUIRE_EMAIL_VERIFICATION = "true";
  assert.equal((await request("/login", signup)).data.code, "EMAIL_NOT_VERIFIED");
  assert.equal((await request("/me", undefined, initial.data.accessToken)).status, 403);
  assert.equal((await request("/refresh", { refreshToken: initial.data.refreshToken })).status, 401);
});

test("required verification keeps a failed-delivery account without granting tokens", async () => {
  enableEmail();
  process.env.REQUIRE_EMAIL_VERIFICATION = "true";
  deliveryFails = true;
  const result = await request("/register", signup);
  assert.equal(result.status, 201);
  assert.equal(result.data.accessToken, undefined);
  assert.equal(result.data.verificationRequired, true);
  assert.equal(await User.countDocuments(), 1);
  assert.equal((await request("/login", signup)).status, 403);
});

test("verification uses hashed, expiring, single-use tokens and escapes user names in email", async () => {
  enableEmail();
  const registered = await request("/register", { ...signup, name: "<img src=x onerror=alert(1)>" });
  assert.equal(registered.data.verificationEmailSent, true);
  const token = emails[0].html.match(/token=([a-f0-9]{64})/)[1];
  assert.ok(emails[0].html.includes("&lt;img"));
  const stored = await User.findOne({ email: signup.email }).select("+emailVerificationToken");
  assert.equal(stored.emailVerificationToken, hashToken(token));
  const responses = await Promise.all([request(`/verify-email?token=${token}`), request(`/verify-email?token=${token}`)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await User.findById(stored._id)).emailVerified, true);
});

test("suspended users cannot log in, access protected routes, or refresh tokens", async () => {
  const { data } = await request("/register", signup);
  await User.updateOne({ _id: data.user.id }, { status: "suspended" });
  assert.equal((await request("/login", signup)).status, 403);
  assert.equal((await request("/me", undefined, data.accessToken)).status, 401);
  assert.equal((await request("/refresh", { refreshToken: data.refreshToken })).status, 401);
});

test("logout revokes both access and refresh tokens", async () => {
  const { data } = await request("/register", signup);
  assert.equal((await request("/logout", {}, data.accessToken)).status, 200);
  assert.equal((await request("/me", undefined, data.accessToken)).status, 401);
  assert.equal((await request("/refresh", { refreshToken: data.refreshToken })).status, 401);
  assert.equal((await request("/login", signup)).status, 200);
});

test("password reset is atomic, single-use, hashed, and revokes old sessions", async () => {
  enableEmail();
  const { data } = await request("/register", signup);
  assert.equal((await request("/forgot-password", { email: signup.email })).status, 200);
  const token = emails.at(-1).html.match(/token=([a-f0-9]{64})/)[1];
  const password = "Changed-password-42";
  const responses = await Promise.all([request("/reset-password", { token, password }), request("/reset-password", { token, password })]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await request("/login", signup)).status, 401);
  assert.equal((await request("/login", { email: signup.email, password })).status, 200);
  assert.equal((await request("/me", undefined, data.accessToken)).status, 401);
  assert.equal((await request("/refresh", { refreshToken: data.refreshToken })).status, 401);
  const stored = await User.findById(data.user.id).select("+password +passwordResetToken");
  assert.notEqual(stored.password, password);
  assert.equal(stored.passwordResetToken, undefined);
});

test("invalid, expired and malformed verification/reset tokens are rejected", async () => {
  const { data } = await request("/register", signup);
  const token = generateToken();
  await User.updateOne({ _id: data.user.id }, { emailVerificationToken: hashToken(token), emailVerificationExpires: new Date(0), passwordResetToken: hashToken(token), passwordResetExpires: new Date(0) });
  assert.equal((await request(`/verify-email?token=${token}`)).status, 400);
  assert.equal((await request("/reset-password", { token, password: signup.password })).status, 400);
  assert.equal((await request("/verify-email?token[a]=x")).status, 400);
  assert.equal((await request("/reset-password", { token: { $ne: null }, password: signup.password })).status, 400);
});

test("invalid requests and oversized bcrypt passwords return 400 without creating users", async () => {
  for (const body of [{ ...signup, email: { $ne: null } }, { ...signup, password: "short" }, { ...signup, password: "x".repeat(73) }, { ...signup, password: "😀".repeat(19) }]) {
    assert.equal((await request("/register", body)).status, 400);
  }
  assert.equal((await request("/refresh", {})).status, 400);
  assert.equal(await User.countDocuments(), 0);
});

test("access and refresh token types cannot be substituted, even with identical secrets", async () => {
  const original = process.env.JWT_REFRESH_SECRET;
  process.env.JWT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET;
  try {
    const { data } = await request("/register", signup);
    assert.equal((await request("/me", undefined, data.refreshToken)).status, 401);
    assert.equal((await request("/refresh", { refreshToken: data.accessToken })).status, 401);
    const expired = jwt.sign({ sub: data.user.id, type: "access", version: 0 }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
    assert.equal((await request("/me", undefined, expired)).status, 401);
  } finally {
    process.env.JWT_REFRESH_SECRET = original;
  }
});

test("audit log failures cannot break successful signup or login", async () => {
  const activityMock = mock.method(ActivityLog, "create", async () => { throw new Error("Log unavailable"); });
  try {
    assert.equal((await request("/register", signup)).status, 201);
    assert.equal((await request("/login", signup)).status, 200);
    assert.equal(await User.countDocuments(), 1);
  } finally { activityMock.mock.restore(); }
});

test("vault provisioning failures roll back only incomplete registrations", async () => {
  const vaultMock = mock.method(Vault, "create", async () => { throw new Error("Provisioning unavailable"); });
  try {
    assert.equal((await request("/register", signup)).status, 500);
    assert.equal(await User.countDocuments(), 0);
  } finally { vaultMock.mock.restore(); }
});

test("unverified email claims cannot receive someone else's vault invitations", async () => {
  const { data: owner } = await request("/register", signup);
  const { data: recipient } = await request("/register", { ...signup, email: "claimed@example.net" });
  const vault = await Vault.findOne({ owner: owner.user.id });
  let status;
  const res = { status(value) { status = value; return this; }, json() { return this; } };
  const req = { params: { id: vault._id.toString() }, user: { _id: new mongoose.Types.ObjectId(owner.user.id) }, body: { email: recipient.user.email } };
  await invite(req, res);
  assert.equal(status, 400);
  await User.updateOne({ _id: recipient.user.id }, { emailVerified: true });
  await invite(req, res);
  assert.equal(status, 201);
});

test("email recovery endpoints preserve generic responses when Resend rejects delivery", async () => {
  enableEmail();
  await request("/register", signup);
  deliveryFails = true;
  for (const route of ["/forgot-password", "/resend-verification"]) {
    const known = await request(route, { email: signup.email });
    const unknown = await request(route, { email: "unknown@example.net" });
    assert.equal(known.status, 200);
    assert.deepEqual(known, unknown);
  }
});

test("startup permits missing email config by default and rejects missing config under required verification", () => {
  process.env.MONGO_URI = "mongodb://127.0.0.1/test";
  assert.doesNotThrow(validateStartupEnv);
  process.env.REQUIRE_EMAIL_VERIFICATION = "true";
  assert.throws(validateStartupEnv, /email configuration is missing/);
});
