const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");
const auth = require("../middleware/auth");

// All routes require authentication
router.use(auth);

// Weather routes
router.get("/current", weatherController.getCurrentWeather);
router.get("/forecast", weatherController.getForecast);

module.exports = router;
