const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const emailService = require("../services/emailService");

const userModel = {
  createUser: async (username, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    const result = await pool.query(
      `INSERT INTO users (username, email, password, verification_token, is_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, username, email, is_verified`,
      [username, email, hashedPassword, verificationToken]
    );

    const user = result.rows[0];
    await emailService.sendVerificationEmail(email, verificationToken);

    return user;
  },

  findByEmail: async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0];
  },

  findById: async (id) => {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0];
  },

  verifyEmail: async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        `UPDATE users 
         SET is_verified = true, verification_token = NULL 
         WHERE email = $1 AND verification_token = $2
         RETURNING id, username, email, is_verified`,
        [decoded.email, token]
      );
      return result.rows[0];
    } catch (error) {
      return null;
    }
  },

  requestPasswordReset: async (email) => {
    const user = await userModel.findByEmail(email);
    if (!user) return null;

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    await pool.query("UPDATE users SET reset_token = $1 WHERE id = $2", [
      resetToken,
      user.id,
    ]);

    await emailService.sendPasswordResetEmail(email, resetToken);
    return true;
  },

  resetPassword: async (token, newPassword) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const result = await pool.query(
        `UPDATE users 
         SET password = $1, reset_token = NULL 
         WHERE id = $2 AND reset_token = $3
         RETURNING id, username, email`,
        [hashedPassword, decoded.id, token]
      );
      return result.rows[0];
    } catch (error) {
      return null;
    }
  },

  updateProfile: async (userId, updates) => {
    const allowedUpdates = ["username", "bio", "avatar"];
    const validUpdates = Object.keys(updates).filter((key) =>
      allowedUpdates.includes(key)
    );

    if (validUpdates.length === 0) return null;

    const setClause = validUpdates
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ");
    const values = [userId, ...validUpdates.map((key) => updates[key])];

    const result = await pool.query(
      `UPDATE users 
       SET ${setClause}
       WHERE id = $1
       RETURNING id, username, email, bio, avatar`,
      values
    );

    return result.rows[0];
  },

  generateTokens: (user) => {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  },
};

module.exports = userModel;
