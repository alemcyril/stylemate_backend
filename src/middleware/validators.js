const { body } = require("express-validator");

const userValidators = {
  signup: [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      ),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .matches(/\d/)
      .withMessage("Password must contain at least one number")
      .matches(/[a-zA-Z]/)
      .withMessage("Password must contain at least one letter"),
  ],
  login: [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  forgotPassword: [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail(),
  ],
  resetPassword: [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .matches(/\d/)
      .withMessage("Password must contain at least one number")
      .matches(/[a-zA-Z]/)
      .withMessage("Password must contain at least one letter"),
  ],
  updateProfile: [
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      ),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio must not exceed 500 characters"),
  ],
};

module.exports = userValidators;
