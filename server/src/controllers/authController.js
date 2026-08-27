import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import Vault from "../models/Vault.js";
import { generateToken, hashToken } from "../utils/authTokens.js";
import { sendVerificationEmail } from "../services/email/email.service.js";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function signTokens(user) {
  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" },
  );
  const refreshToken = jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" },
  );
  return { accessToken, refreshToken };
}

function publicUser(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    emailVerified: u.emailVerified,
    storageUsed: u.storageUsed,
    createdAt: u.createdAt,
  };
}

export const register = async (req, res) => {
  const data = registerSchema.parse(req.body);

  const exists = await User.findOne({ email: data.email });

  if (exists) {
    return res.status(409).json({
      message: "Email already registered",
    });
  }

  // Generate email verification token
  const verificationToken = generateToken();
  const hashedVerificationToken = hashToken(verificationToken);

  const verificationExpires = new Date(Date.now() + 30 * 60 * 1000);

  // Create user
  const user = await User.create({
    ...data,
    emailVerified: false,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpires: verificationExpires,
  });

  // Create user's default vault
  await Vault.create({
    name: "My Documents",
    description: "Your personal vault",
    owner: user._id,
    icon: "folder",
    color: "blue",
  });

  // Build verification URL
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;

  // Send verification email
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationUrl,
  });

  // Activity log
  await ActivityLog.create({
    user: user._id,
    action: "register",
    ip: req.ip,
  });

  res.status(201).json({
    message: "Account created. Please verify your email.",
    user: publicUser(user),
  });
};

export const login = async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email }).select("+password");
  if (!user || !(await user.comparePassword(data.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (user.status === "suspended") {
    return res.status(403).json({ message: "Account suspended" });
  }
  if (!user.emailVerified) {
    return res.status(403).json({
      message: "Please verify your email before logging in.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  const tokens = signTokens(user);
  await ActivityLog.create({ user: user._id, action: "login", ip: req.ip });
  res.json({ user: publicUser(user), ...tokens });
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "refreshToken required" });
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid token" });
    const tokens = signTokens(user);
    res.json(tokens);
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req, res) => {
  if (req.user) {
    await ActivityLog.create({
      user: req.user._id,
      action: "logout",
      ip: req.ip,
    });
  }
  res.json({ ok: true });
};

export const me = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      message: "Verification token is required",
    });
  }

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    return res.status(400).json({
      message: "Invalid or expired verification token",
    });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  await ActivityLog.create({
    user: user._id,
    action: "email_verified",
    ip: req.ip,
  });

  res.json({
    message: "Email verified successfully",
  });
};
