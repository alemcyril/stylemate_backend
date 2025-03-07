const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts, please try again after 15 minutes",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests, please try again later",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
