import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import errorHandler from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import vaultRoutes from "./routes/vaults.js";
import shareRoutes from "./routes/shares.js";
import exportRoutes from "./routes/exports.js";
import adminRoutes from "./routes/admin.js";
import activityRoutes from "./routes/activity.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://10.147.94.72:8081",
    credentials: true,
  }),
);
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/refresh", authLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/vaults", vaultRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activity", activityRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`API running on :${PORT}`));
});
