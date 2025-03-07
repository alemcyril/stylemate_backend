const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});

// Create a write stream for error logs
const errorLogStream = fs.createWriteStream(path.join(logsDir, "error.log"), {
  flags: "a",
});

// Custom token for request body
morgan.token("body", (req) => JSON.stringify(req.body));

// Access logger
const accessLogger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :body',
  {
    stream: accessLogStream,
    skip: (req) => req.statusCode < 400,
  }
);

// Error logger
const errorLogger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :body',
  {
    stream: errorLogStream,
    skip: (req) => req.statusCode < 400,
  }
);

module.exports = { accessLogger, errorLogger };
