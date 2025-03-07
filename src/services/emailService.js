const nodemailer = require("nodemailer");

// Check if email credentials are configured
const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;

let transporter;
if (hasEmailConfig) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Verify email configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error("Email configuration error:", error);
    } else {
      console.log("Email server is ready to send messages");
    }
  });
} else {
  console.log("Email service not configured. Running in development mode.");
}

const emailService = {
  sendVerificationEmail: async (email, token) => {
    if (!hasEmailConfig) {
      console.log(
        "Development mode: Verification email would be sent to:",
        email
      );
      console.log("Verification token:", token);
      return;
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your Email",
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("Verification email sent successfully");
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error(
        "Failed to send verification email. Please try again later."
      );
    }
  },

  sendPasswordResetEmail: async (email, token) => {
    if (!hasEmailConfig) {
      console.log(
        "Development mode: Password reset email would be sent to:",
        email
      );
      console.log("Reset token:", token);
      return;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log("Password reset email sent successfully");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw new Error(
        "Failed to send password reset email. Please try again later."
      );
    }
  },
};

module.exports = emailService;
