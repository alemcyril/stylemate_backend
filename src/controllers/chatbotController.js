const chatbotController = {
  sendMessage: async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Basic response logic based on message content
      let response = "";
      const lowerMessage = message.toLowerCase();

      // Style recommendations
      if (
        lowerMessage.includes("recommend") ||
        lowerMessage.includes("suggest")
      ) {
        response =
          "I can help you with style recommendations! Could you tell me more about the occasion or your preferences?";
      }
      // Weather-related
      else if (
        lowerMessage.includes("weather") ||
        lowerMessage.includes("temperature")
      ) {
        response =
          "I can help you choose weather-appropriate clothing. Would you like me to check the current weather in your location?";
      }
      // Outfit combinations
      else if (
        lowerMessage.includes("outfit") ||
        lowerMessage.includes("combine") ||
        lowerMessage.includes("match")
      ) {
        response =
          "I can help you create outfit combinations from your wardrobe. Would you like me to suggest some combinations?";
      }
      // Wardrobe organization
      else if (
        lowerMessage.includes("organize") ||
        lowerMessage.includes("sort") ||
        lowerMessage.includes("clean")
      ) {
        response =
          "I can help you organize your wardrobe! Would you like tips on categorizing your clothes or creating a capsule wardrobe?";
      }
      // Fashion trends
      else if (
        lowerMessage.includes("trend") ||
        lowerMessage.includes("fashion") ||
        lowerMessage.includes("style")
      ) {
        response =
          "I can help you stay updated with fashion trends! What kind of trends are you interested in?";
      }
      // Default response
      else {
        response =
          "I'm here to help you with your style questions! You can ask me about:\n- Style recommendations\n- Outfit combinations\n- Weather-appropriate clothing\n- Wardrobe organization\n- Fashion trends\n\nWhat would you like to know?";
      }

      res.json({ message: response });
    } catch (error) {
      console.error("Chatbot error:", error);
      res
        .status(500)
        .json({ message: "Sorry, I encountered an error. Please try again." });
    }
  },
};

module.exports = chatbotController;
