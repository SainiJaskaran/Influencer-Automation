const mongoose = require("mongoose");
const config = require("../config");
const log = require("./logger");

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    // Log URI with password masked
    const safeUri = config.mongoUri.replace(/:([^@]+)@/, ":****@");
    log.success("MongoDB connected", { uri: safeUri });
  } catch (error) {
    log.error("Database connection failed", { error: error.message });
    // NEVER process.exit() — let the caller handle it
    // In Electron: shows a dialog. In CLI: the caller exits.
    throw error;
  }
};

module.exports = connectDB;
