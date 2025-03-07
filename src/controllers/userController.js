const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const userModel = require("../models/userModel");
const fileService = require("../services/fileService");
const crypto = require("crypto");

const userController = {
  // Sign up new user
  signup: async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { email, password, username } = req.body;

      // Validate input
      if (!email || !password || !username) {
        return res.status(400).json({
          error: "Email, password, and username are required",
        });
      }

      // Check if user already exists with a lock
      const existingUser = await client.query(
        "SELECT * FROM users WHERE email = $1 OR username = $2 FOR UPDATE",
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Email or username already exists",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user (without verification token)
      const result = await client.query(
        "INSERT INTO users (email, password, username, is_verified) VALUES ($1, $2, $3, true) RETURNING id, email, username",
        [email, hashedPassword, username]
      );

      const user = result.rows[0];

      await client.query("COMMIT");

      res.status(201).json({
        message: "User created successfully.",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Signup error:", error);

      // Handle specific database errors
      if (error.code === "23505") {
        // Unique violation
        return res.status(400).json({
          error: "Email or username already exists",
        });
      }

      res.status(500).json({
        error: "An error occurred during signup. Please try again later.",
      });
    } finally {
      client.release();
    }
  },

  // Login user
  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    try {
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { accessToken, refreshToken } = userModel.generateTokens(user);
      res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  verifyEmail: async (req, res) => {
    const { token } = req.params;

    try {
      const user = await userModel.verifyEmail(token);
      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired verification token" });
      }
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  requestPasswordReset: async (req, res) => {
    const { email } = req.body;

    try {
      const result = await userModel.requestPasswordReset(email);
      if (!result) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Password reset email sent" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  resetPassword: async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
      const user = await userModel.resetPassword(token, password);
      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  refreshToken: async (req, res) => {
    const { refreshToken } = req.body;

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await userModel.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const tokens = userModel.generateTokens(user);
      res.json(tokens);
    } catch (error) {
      res.status(401).json({ message: "Invalid refresh token" });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await userModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const updates = req.body;
      const user = await userModel.updateProfile(req.user.id, updates);

      if (!user) {
        return res.status(400).json({ message: "No valid updates provided" });
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  uploadAvatar: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const avatarUrl = fileService.getFileUrl(req.file.filename);
      const user = await userModel.updateProfile(req.user.id, {
        avatar: avatarUrl,
      });

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = userController;
