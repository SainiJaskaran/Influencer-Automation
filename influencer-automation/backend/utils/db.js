const mongoose = require("mongoose");
const config = require("../config");
const log = require("./logger");

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    log.success("MongoDB connected", { uri: config.mongoUri });
  } catch (error) {
    log.error("Database connection failed", { error: error.message });
    process.exit(1);
  }
};

module.exports = connectDB;