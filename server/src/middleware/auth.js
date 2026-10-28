import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requiresEmailVerification } from "../config/auth.js";

export default async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  if (payload.type !== "access" || !/^[a-f0-9]{24}$/i.test(payload.sub || "")) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  try {
    const user = await User.findById(payload.sub);
    if (!user || user.status === "suspended" || payload.version !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (requiresEmailVerification(user)) {
      return res.status(403).json({ message: "Please verify your email before logging in.", code: "EMAIL_NOT_VERIFIED" });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
