const axios = require("axios");

// Coordinates for Kabete, Kenya
const KABETE_COORDINATES = {
  lat: -1.25,
  lon: 36.75,
};

const weatherService = {
  getCurrentWeather: async (city) => {
    let cleanCity;
    try {
      // Clean and format the city name
      cleanCity = city
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/\b(ward|district|county)\b/gi, "") // Remove common administrative terms
        .trim(); // Trim again after replacements

      if (!process.env.OPENWEATHER_API_KEY) {
        throw new Error("OpenWeather API key is not configured");
      }

      // Special handling for Kabete
      if (cleanCity === "kabete" || city.toLowerCase().includes("kabete")) {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${KABETE_COORDINATES.lat}&lon=${KABETE_COORDINATES.lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
        );

        return {
          temperature: response.data.main.temp,
          feelsLike: response.data.main.feels_like,
          humidity: response.data.main.humidity,
          description: response.data.weather[0].description,
          icon: response.data.weather[0].icon,
          windSpeed: response.data.wind.speed,
          city: "Kabete",
          country: response.data.sys.country,
        };
      }

      // Try with the cleaned city name and country code first
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            cleanCity
          )},ke&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
        );

        return {
          temperature: response.data.main.temp,
          feelsLike: response.data.main.feels_like,
          humidity: response.data.main.humidity,
          description: response.data.weather[0].description,
          icon: response.data.weather[0].icon,
          windSpeed: response.data.wind.speed,
          city: response.data.name,
          country: response.data.sys.country,
        };
      } catch (firstError) {
        // If first attempt fails, try with the original city name and country code
        if (firstError.response?.status === 404) {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
              city
            )},ke&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
          );

          return {
            temperature: response.data.main.temp,
            feelsLike: response.data.main.feels_like,
            humidity: response.data.main.humidity,
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon,
            windSpeed: response.data.wind.speed,
            city: response.data.name,
            country: response.data.sys.country,
          };
        }
        throw firstError;
      }
    } catch (error) {
      // Enhanced error logging
      console.error("Weather API error:", {
        message: error.message,
        status: error.response?.status,
        city: city,
        cleanCity: cleanCity || "not processed",
        responseData: error.response?.data,
        stack: error.stack,
      });

      if (error.response?.status === 404) {
        throw new Error(
          `City "${city}" not found in Kenya. Please check the city name and try again.`
        );
      }

      if (error.response?.status === 401) {
        throw new Error(
          "Invalid API key. Please check your OpenWeather API configuration."
        );
      }

      if (error.response?.status === 429) {
        throw new Error(
          "Too many requests to the weather API. Please try again later."
        );
      }

      if (!process.env.OPENWEATHER_API_KEY) {
        throw new Error(
          "Weather API key is not configured. Please check your environment variables."
        );
      }

      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  },

  getForecast: async (city) => {
    let cleanCity;
    try {
      // Clean and format the city name
      cleanCity = city
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, " ")
        .replace(/\b(ward|district|county)\b/gi, "")
        .trim();

      if (!process.env.OPENWEATHER_API_KEY) {
        throw new Error("OpenWeather API key is not configured");
      }

      // Special handling for Kabete
      if (cleanCity === "kabete" || city.toLowerCase().includes("kabete")) {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${KABETE_COORDINATES.lat}&lon=${KABETE_COORDINATES.lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
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
      }

      // Try with the cleaned city name and country code first
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
            cleanCity
          )},ke&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
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
      } catch (firstError) {
        // If first attempt fails, try with the original city name and country code
        if (firstError.response?.status === 404) {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
              city
            )},ke&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
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
        }
        throw firstError;
      }
    } catch (error) {
      // Enhanced error logging
      console.error("Weather API error:", {
        message: error.message,
        status: error.response?.status,
        city: city,
        cleanCity: cleanCity || "not processed",
        responseData: error.response?.data,
        stack: error.stack,
      });

      if (error.response?.status === 404) {
        throw new Error(
          `City "${city}" not found in Kenya. Please check the city name and try again.`
        );
      }

      if (error.response?.status === 401) {
        throw new Error(
          "Invalid API key. Please check your OpenWeather API configuration."
        );
      }

      if (error.response?.status === 429) {
        throw new Error(
          "Too many requests to the weather API. Please try again later."
        );
      }

      if (!process.env.OPENWEATHER_API_KEY) {
        throw new Error(
          "Weather API key is not configured. Please check your environment variables."
        );
      }

      throw new Error(`Failed to fetch forecast data: ${error.message}`);
    }
  },
};

module.exports = weatherService;
