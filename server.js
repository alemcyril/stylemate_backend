const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const specs = require("./src/config/swagger");
const userRoutes = require("./src/routes/userRoutes");
const wardrobeRoutes = require("./src/routes/wardrobeRoutes");
const outfitRoutes = require("./src/routes/outfitRoutes");
const weatherRoutes = require("./src/routes/weatherRoutes");
const chatbotRoutes = require("./src/routes/chatbotRoutes");
const { accessLogger, errorLogger } = require("./src/middleware/logger");
const path = require("path");

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(accessLogger);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/wardrobe", wardrobeRoutes);
app.use("/api/outfits", outfitRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Error handling middleware
app.use(errorLogger);
app.use((err, req, res, next) => {
  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      message: "Too many requests, please try again later",
      retryAfter: err.retryAfter,
    });
  }

  // Handle other errors
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
