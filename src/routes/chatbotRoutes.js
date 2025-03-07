const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");
const auth = require("../middleware/auth");

// All routes require authentication
router.use(auth);

// Chatbot routes
router.post("/message", chatbotController.sendMessage);

module.exports = router;
