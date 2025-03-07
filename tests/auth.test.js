const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

describe("Auth Routes", () => {
  let testUser;

  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash("testPassword123", 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password, is_verified) VALUES ($1, $2, $3, true) RETURNING id, username, email",
      ["testuser", "test@example.com", hashedPassword]
    );
    testUser = result.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM users WHERE email = $1", [
      "test@example.com",
    ]);
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "testPassword123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("username");
      expect(response.body.user).toHaveProperty("email");
    });

    it("should not login with invalid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });
  });

  describe("POST /api/auth/refresh-token", () => {
    it("should refresh token with valid refresh token", async () => {
      const refreshToken = jwt.sign(
        { id: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
    });

    it("should not refresh token with invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send({ refreshToken: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid refresh token");
    });
  });
});
