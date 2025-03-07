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

      const weather = await weatherService.getCurrentWeather(city);
      res.json(weather);
    } catch (error) {
      console.error(error);
      if (error.message.includes("City not found")) {
        return res.status(404).json({
          message: error.message,
          suggestion:
            "Try using a valid city name without special characters or extra spaces",
        });
      }
      res.status(500).json({
        message: "Failed to fetch weather data",
        error: error.message,
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

      const forecast = await weatherService.getForecast(city);
      res.json(forecast);
    } catch (error) {
      console.error(error);
      if (error.message.includes("City not found")) {
        return res.status(404).json({
          message: error.message,
          suggestion:
            "Try using a valid city name without special characters or extra spaces",
        });
      }
      res.status(500).json({
        message: "Failed to fetch forecast data",
        error: error.message,
      });
    }
  },
};

module.exports = weatherController;
