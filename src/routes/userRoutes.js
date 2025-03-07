const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const userValidators = require("../middleware/validators");
const { authLimiter } = require("../middleware/rateLimiter");
const fileService = require("../services/fileService");

// Public routes
router.post("/signup", userValidators.signup, validate, userController.signup);

router.post(
  "/login",
  authLimiter,
  userValidators.login,
  validate,
  userController.login
);

router.post("/refresh-token", userController.refreshToken);

// Email verification
router.get("/verify-email/:token", userController.verifyEmail);

// Password reset
router.post(
  "/forgot-password",
  userValidators.forgotPassword,
  validate,
  userController.requestPasswordReset
);
router.post(
  "/reset-password/:token",
  userValidators.resetPassword,
  validate,
  userController.resetPassword
);

// Protected routes
router.get("/profile", auth, userController.getProfile);
router.patch(
  "/profile",
  auth,
  userValidators.updateProfile,
  validate,
  userController.updateProfile
);
router.post(
  "/avatar",
  auth,
  fileService.upload.single("avatar"),
  userController.uploadAvatar
);

module.exports = router;
