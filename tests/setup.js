const dotenv = require("dotenv");
const path = require("path");

// Load test environment variables
dotenv.config({ path: path.join(__dirname, "../.env.test") });

// Mock console.error to keep test output clean
console.error = jest.fn();

// Global test timeout
jest.setTimeout(10000);
