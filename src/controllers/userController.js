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

      // Input sanitization and validation
      const sanitizedEmail = email?.trim().toLowerCase();
      const sanitizedUsername = username?.trim();

      // Comprehensive input validation
      if (!sanitizedEmail || !password || !sanitizedUsername) {
        return res.status(400).json({
          status: "error",
          error: "Missing required fields",
          details: {
            email: !sanitizedEmail ? "Email is required" : null,
            password: !password ? "Password is required" : null,
            username: !sanitizedUsername ? "Username is required" : null,
          },
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return res.status(400).json({
          status: "error",
          error: "Invalid email format",
        });
      }

      // Username format validation
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(sanitizedUsername)) {
        return res.status(400).json({
          status: "error",
          error:
            "Username must be 3-30 characters long and can only contain letters, numbers, and underscores",
        });
      }

      // Check for existing user with detailed error message
      const existingUserQuery = await client.query(
        `SELECT email, username FROM users 
         WHERE email = $1 OR username = $2`,
        [sanitizedEmail, sanitizedUsername]
      );

      if (existingUserQuery.rows.length > 0) {
        const existingUser = existingUserQuery.rows[0];
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          error: "Account already exists",
          details: {
            email:
              existingUser.email === sanitizedEmail
                ? "Email is already registered"
                : null,
            username:
              existingUser.username === sanitizedUsername
                ? "Username is already taken"
                : null,
          },
        });
      }

      // Password strength validation
      if (password.length < 6) {
        return res.status(400).json({
          status: "error",
          error: "Password must be at least 6 characters long",
        });
      }

      if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
        return res.status(400).json({
          status: "error",
          error: "Password must contain at least one letter and one number",
        });
      }

      // Hash password with error handling
      let hashedPassword;
      try {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Password hashing error:", error);
        return res.status(500).json({
          status: "error",
          error: "Error processing password",
        });
      }

      // Create user with error handling
      try {
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const result = await client.query(
          `INSERT INTO users (
            email, 
            password, 
            username, 
            verification_token,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW()) 
          RETURNING id, email, username, created_at, is_verified`,
          [sanitizedEmail, hashedPassword, sanitizedUsername, verificationToken]
        );

        const user = result.rows[0];
        await client.query("COMMIT");

        // Generate tokens for immediate login
        const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "15m",
        });
        const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        // TODO: Send verification email with verificationToken
        // This should be implemented in an email service

        res.status(201).json({
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            created_at: user.created_at,
            is_verified: user.is_verified,
          },
        });
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("User creation error:", error);
        return res.status(500).json({
          status: "error",
          error: "Failed to create account",
        });
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Signup error:", error);
      res.status(500).json({
        status: "error",
        error: "An unexpected error occurred. Please try again later.",
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

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await userModel.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      // Generate new tokens
      const tokens = userModel.generateTokens(user);

      // Return both tokens
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
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
