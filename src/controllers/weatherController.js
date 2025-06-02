const weatherService = require("../services/weatherService");

const weatherController = {
  getCurrentWeather: async (req, res) => {
    try {
      const { city } = req.query;
      if (!city) {
        return res.status(400).json({
          message: "City parameter is required",
          example: "?city=London",
        });
      }

      console.log(`Received weather request for city: ${city}`);
      const weather = await weatherService.getCurrentWeather(city);
      res.json(weather);
    } catch (error) {
      console.error("Weather controller error:", {
        message: error.message,
        stack: error.stack,
        city: req.query.city,
      });

      if (error.message.includes("City not found")) {
        return res.status(404).json({
          message: error.message,
          suggestion:
            "Try using a valid city name without special characters or extra spaces",
        });
      }

      if (error.message.includes("API key")) {
        return res.status(500).json({
          message: "Weather service configuration error",
          error: error.message,
        });
      }

      if (error.message.includes("Too many requests")) {
        return res.status(429).json({
          message: error.message,
          suggestion: "Please wait a few minutes before trying again",
        });
      }

      res.status(500).json({
        message: "Failed to fetch weather data",
        error: error.message,
        suggestion:
          "Please try again later or contact support if the problem persists",
      });
    }
  },

  getForecast: async (req, res) => {
    try {
      const { city } = req.query;
      if (!city) {
        return res.status(400).json({
          message: "City parameter is required",
          example: "?city=London",
        });
      }

      console.log(`Received forecast request for city: ${city}`);
      const forecast = await weatherService.getForecast(city);
      res.json(forecast);
    } catch (error) {
      console.error("Weather controller error:", {
        message: error.message,
        stack: error.stack,
        city: req.query.city,
      });

      if (error.message.includes("City not found")) {
        return res.status(404).json({
          message: error.message,
          suggestion:
            "Try using a valid city name without special characters or extra spaces",
        });
      }

      if (error.message.includes("API key")) {
        return res.status(500).json({
          message: "Weather service configuration error",
          error: error.message,
        });
      }

      if (error.message.includes("Too many requests")) {
        return res.status(429).json({
          message: error.message,
          suggestion: "Please wait a few minutes before trying again",
        });
      }

      res.status(500).json({
        message: "Failed to fetch forecast data",
        error: error.message,
        suggestion:
          "Please try again later or contact support if the problem persists",
      });
    }
  },
};

module.exports = weatherController;
