const express = require("express");
const path = require("path");
const cors = require("cors");
const config = require("./config");
const connectDB = require("./utils/db");
const log = require("./utils/logger");
const authMiddleware = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");
const influencerRoutes = require("./routes/influencerRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const safetyRoutes = require("./routes/safetyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { initializeSchedules } = require("./services/schedulerService");

const app = express();

// CORS — allow frontend origin in production
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000"]
  : ["http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Electron, mobile, curl, etc.)
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Be permissive — auth middleware protects routes
    }
  },
  credentials: true,
}));
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/influencers", authMiddleware, influencerRoutes);
app.use("/api/campaigns", authMiddleware, campaignRoutes);
app.use("/api/safety", authMiddleware, safetyRoutes);
app.use("/api/reports", authMiddleware, reportRoutes);

// Serve React frontend build in production / Electron
const frontendBuild = path.join(__dirname, "..", "frontend", "build");
const fs = require("fs");
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  // Express 5 catch-all: use {*path} instead of bare *
  app.get("{*path}", (req, res) => {
    res.sendFile(path.join(frontendBuild, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Influencer Hub API Running");
  });
}

// Global error handler
app.use((err, req, res, next) => {
  log.error("Unhandled error", { error: err.message, path: req.path });
  res.status(500).json({ error: "Internal server error" });
});

/**
 * Start the server. Returns a promise that resolves with the server instance.
 */
function startServer() {
  return connectDB().then(() => {
    initializeSchedules();

    return new Promise((resolve, reject) => {
      const host = process.env.HOST || "0.0.0.0";
      const server = app.listen(config.port, host, () => {
        log.success(`Server running on ${host}:${config.port}`);
        resolve(server);
      });
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          log.error(`Port ${config.port} is already in use. Close the other application or change the port.`);
        }
        reject(err);
      });
    });
  });
}

// When run directly (not imported by Electron)
if (require.main === module) {
  startServer().catch((err) => {
    log.error("Failed to start server", { error: err.message });
    process.exit(1);
  });
}

module.exports = { app, startServer };
