const axios = require("axios");

const weatherService = {
  getCurrentWeather: async (city) => {
    try {
      // Clean the city name by removing any extra spaces and special characters
      const cleanCity = city.trim().replace(/[^\w\s-]/g, "");

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          cleanCity
        )}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );

      return {
        temperature: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        humidity: response.data.main.humidity,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        windSpeed: response.data.wind.speed,
        city: response.data.name,
      };
    } catch (error) {
      // Log error without exposing sensitive information
      console.error("Weather API error:", {
        message: error.message,
        status: error.response?.status,
        city: city,
      });

      if (error.response?.status === 404) {
        throw new Error(
          "City not found. Please check the city name and try again."
        );
      }

      throw new Error("Failed to fetch weather data");
    }
  },

  getForecast: async (city) => {
    try {
      // Clean the city name
      const cleanCity = city.trim().replace(/[^\w\s-]/g, "");

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          cleanCity
        )}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );

      return response.data.list.map((item) => ({
        date: item.dt_txt,
        temperature: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        windSpeed: item.wind.speed,
      }));
    } catch (error) {
      console.error("Weather API error:", {
        message: error.message,
        status: error.response?.status,
        city: city,
      });

      if (error.response?.status === 404) {
        throw new Error(
          "City not found. Please check the city name and try again."
        );
      }

      throw new Error("Failed to fetch forecast data");
    }
  },
};

module.exports = weatherService;
