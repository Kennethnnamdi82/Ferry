import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import Vault from "../models/Vault.js";
import { canSendEmail, requiresEmailVerification } from "../config/auth.js";
import { generateToken, hashToken } from "../utils/authTokens.js";
import { passwordSchema } from "../utils/password.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email/email.service.js";

const emailSchema = z.object({ email: z.string().trim().email().max(255).toLowerCase() });
const registerSchema = emailSchema.extend({ name: z.string().trim().min(1).max(100), password: passwordSchema });
const loginSchema = emailSchema.extend({ password: z.string().min(1).max(128) });
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, "Invalid token");
const resetPasswordSchema = z.object({ token: tokenSchema, password: passwordSchema });
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_RESPONSE = "If an account exists for that email, a password reset link has been sent.";
const VERIFICATION_RESPONSE = "If an unverified account exists for that email, a verification link has been sent.";

function signTokens(user) {
  const claims = { sub: user._id.toString(), version: user.tokenVersion || 0 };
  return {
    accessToken: jwt.sign({ ...claims, type: "access" }, process.env.JWT_ACCESS_SECRET,
      { algorithm: "HS256", expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }),
    refreshToken: jwt.sign({ ...claims, type: "refresh" }, process.env.JWT_REFRESH_SECRET,
      { algorithm: "HS256", expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }),
  };
}

function publicUser(user) {
  return {
    id: user._id, name: user.name, email: user.email, role: user.role,
    status: user.status, emailVerified: user.emailVerified,
    storageUsed: user.storageUsed, createdAt: user.createdAt,
  };
}

async function logActivity(req, user, action) {
  try {
    await ActivityLog.create({ user: user._id, action, ip: req.ip });
  } catch {
    console.error(`[auth] Could not record ${action} activity.`);
  }
}

function appUrl(path) {
  return `${process.env.APP_URL.replace(/\/+$/, "")}${path}`;
}

async function sendUserVerification(user) {
  if (!canSendEmail()) return false;
  try {
    const token = generateToken();
    await User.updateOne({ _id: user._id, emailVerified: false }, { $set: {
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    } });
    await sendVerificationEmail({ to: user.email, name: user.name,
      verificationUrl: appUrl(`/verify-email?token=${token}`) });
    return true;
  } catch {
    console.warn("[auth] Verification email could not be sent. Check the Resend sender domain and configuration.");
    return false;
  }
}

export const register = async (req, res) => {
  const data = registerSchema.parse(req.body);
  // Duplicate signup must never replace credentials or reset verification tokens.
  if (await User.exists({ email: data.email })) {
    return res.status(409).json({ message: "Email already registered. Please sign in or reset your password." });
  }
  const user = await User.create(data);
  try {
    await Vault.create({ name: "My Documents", description: "Your personal vault",
      owner: user._id, icon: "folder", color: "blue" });
  } catch (error) {
    // Only roll back incomplete database provisioning, never email-delivery failures.
    await User.deleteOne({ _id: user._id });
    throw error;
  }
  await logActivity(req, user, "register");
  const verificationEmailSent = await sendUserVerification(user);
  const verificationRequired = requiresEmailVerification(user);
  res.status(201).json({
    message: verificationRequired
      ? verificationEmailSent ? "Account created. Please verify your email." : "Account created. Verification email is currently unavailable. Please try resending later."
      : "Account created successfully. You can now use Ferry.",
    user: publicUser(user), verificationRequired, verificationEmailSent,
    ...(!verificationRequired && signTokens(user)),
  });
};

export const login = async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email }).select("+password");
  if (!user || !(await user.comparePassword(data.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (user.status === "suspended") return res.status(403).json({ message: "Account suspended" });
  if (requiresEmailVerification(user)) {
    return res.status(403).json({ message: "Please verify your email before logging in.", code: "EMAIL_NOT_VERIFIED" });
  }
  const tokens = signTokens(user);
  await logActivity(req, user, "login");
  res.json({ user: publicUser(user), ...tokens });
};

export const refresh = async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().min(1).max(4096) }).parse(req.body);
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  if (payload.type !== "refresh" || !/^[a-f0-9]{24}$/i.test(payload.sub || "")) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status === "suspended" || payload.version !== (user.tokenVersion || 0) || requiresEmailVerification(user)) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  res.json(signTokens(user));
};

export const logout = async (req, res) => {
  // Revoke existing access and refresh tokens on every device.
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  await logActivity(req, req.user, "logout");
  res.json({ ok: true });
};

export const me = async (req, res) => res.json({ user: publicUser(req.user) });

export const verifyEmail = async (req, res) => {
  const token = tokenSchema.parse(req.query.token);
  // Atomically consume the link, including under concurrent requests.
  const user = await User.findOneAndUpdate({
    emailVerificationToken: hashToken(token), emailVerificationExpires: { $gt: new Date() },
  }, {
    $set: { emailVerified: true }, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
  }, { new: true });
  if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });
  await logActivity(req, user, "email_verified");
  res.json({ message: "Email verified successfully" });
};

export const resendVerification = async (req, res) => {
  const { email } = emailSchema.parse(req.body);
  if (!canSendEmail()) return res.status(503).json({ message: "Email verification is currently unavailable. Please try again later." });
  const user = await User.findOne({ email });
  if (user && !user.emailVerified && user.status !== "suspended") {
    // Keep the response uniform to avoid exposing which accounts exist.
    await sendUserVerification(user);
  }
  res.json({ message: VERIFICATION_RESPONSE });
};

export const forgotPassword = async (req, res) => {
  const { email } = emailSchema.parse(req.body);
  if (!canSendEmail()) return res.status(503).json({ message: "Password reset email is currently unavailable. Please try again later." });
  const user = await User.findOne({ email });
  if (user && user.status !== "suspended") {
    const resetToken = generateToken();
    await User.updateOne({ _id: user._id }, { $set: {
      passwordResetToken: hashToken(resetToken),
      passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    } });
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name,
        resetUrl: appUrl(`/reset-password?token=${resetToken}`) });
      await logActivity(req, user, "password_reset_requested");
    } catch {
      console.warn("[auth] Password reset email could not be sent. Check the Resend sender domain and configuration.");
    }
  }
  res.json({ message: PASSWORD_RESET_RESPONSE });
};

export const resetPassword = async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);
  const filter = { passwordResetToken: hashToken(data.token),
    passwordResetExpires: { $gt: new Date() }, status: "active" };
  if (!(await User.exists(filter))) return res.status(400).json({ message: "Invalid or expired password reset token" });
  // Query updates skip save hooks, so hash before the atomic token consumption.
  const password = await bcrypt.hash(data.password, 12);
  const user = await User.findOneAndUpdate(filter, {
    $set: { password }, $inc: { tokenVersion: 1 },
    $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
  }, { new: true });
  if (!user) return res.status(400).json({ message: "Invalid or expired password reset token" });
  await logActivity(req, user, "password_reset");
  res.json({ message: "Password reset successfully. You can now log in." });
};
