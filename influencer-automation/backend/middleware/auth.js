const jwt = require("jsonwebtoken");

const config = require("../config");
const JWT_SECRET = config.jwtSecret;

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  let token;

  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  } else if (req.query && req.query.token) {
    // Support token via query param for file downloads (e.g. CSV export)
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
