import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Try to refresh the token
        const response = await api.post("/auth/refresh-token", {
          refreshToken,
        });
        const { accessToken } = response.data;

        // Update the access token
        localStorage.setItem("accessToken", accessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  register: (userData) => api.post("/api/auth/signup", userData),
  login: (credentials) => api.post("/api/auth/login", credentials),
  logout: () => api.post("/api/auth/logout"),
  getProfile: () => api.get("/api/auth/profile"),
  updateProfile: (data) => api.put("/api/auth/profile", data),
  changePassword: (data) => api.put("/api/auth/change-password", data),
};

// Wardrobe endpoints
export const wardrobe = {
  getItems: () => api.get("/wardrobe"),
  addItem: (itemData) => api.post("/wardrobe", itemData),
  updateItem: (id, itemData) => api.put(`/wardrobe/${id}`, itemData),
  deleteItem: (id) => api.delete(`/wardrobe/${id}`),
  getStats: () => api.get("/wardrobe/stats"),
};

// Outfits endpoints
export const outfits = {
  getAll: () => api.get("/outfits"),
  getOne: (id) => api.get(`/outfits/${id}`),
  create: (outfitData) => api.post("/outfits", outfitData),
  update: (id, outfitData) => api.put(`/outfits/${id}`, outfitData),
  delete: (id) => api.delete(`/outfits/${id}`),
  getRecommendations: () => api.get("/outfits/recommendations"),
  toggleFavorite: (id) => api.put(`/outfits/${id}/favorite`),
  saveForLater: (id) => api.put(`/outfits/${id}/save`),
};

// Weather endpoints
export const weather = {
  getCurrent: () => api.get("/weather/current"),
  getForecast: () => api.get("/weather/forecast"),
  updateLocation: (location) => api.put("/weather/location", location),
};

// Chatbot endpoints
export const chatbot = {
  sendMessage: (message) => api.post("/chatbot/message", { message }),
};

// Upload endpoints
export const upload = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default api;
