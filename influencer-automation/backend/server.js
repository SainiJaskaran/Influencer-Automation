const express = require("express");
const cors = require("cors");
const config = require("./config");
const connectDB = require("./utils/db");
const log = require("./utils/logger");
const influencerRoutes = require("./routes/influencerRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Influencer Bot API Running");
});

app.use("/api/influencers", influencerRoutes);

// Start
connectDB().then(() => {
  app.listen(config.port, () => {
    log.success(`Server running on port ${config.port}`);
  });
});