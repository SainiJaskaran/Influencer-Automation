const express = require("express");
const cors = require("cors");
const config = require("./config");
const connectDB = require("./utils/db");
const log = require("./utils/logger");
const influencerRoutes = require("./routes/influencerRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const safetyRoutes = require("./routes/safetyRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { initializeSchedules } = require("./services/schedulerService");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Influencer Bot API Running");
});

app.use("/api/influencers", influencerRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api/reports", reportRoutes);

// Start
connectDB().then(() => {
  initializeSchedules();

  app.listen(config.port, () => {
    log.success(`Server running on port ${config.port}`);
  });
});
