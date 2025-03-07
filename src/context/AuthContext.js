import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        const response = await auth.getProfile();
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await auth.login({ email, password });
      const { accessToken, refreshToken, user } = response.data;

      // Store both tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await auth.register(userData);
      const { accessToken, refreshToken, user } = response.data;

      // Store both tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await auth.updateProfile(data);
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (data) => {
    try {
      await auth.changePassword(data);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
