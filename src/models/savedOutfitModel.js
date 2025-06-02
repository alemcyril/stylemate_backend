const mongoose = require("mongoose");

const savedOutfitSchema = new mongoose.Schema({
  outfitId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  items: [
    {
      id: String,
      name: String,
      image_url: String,
    },
  ],
  occasion: String,
  season: String,
  weather: String,
  rating: Number,
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create compound index for outfitId and userId to prevent duplicates
savedOutfitSchema.index({ outfitId: 1, userId: 1 }, { unique: true });

const SavedOutfit = mongoose.model("SavedOutfit", savedOutfitSchema);

module.exports = SavedOutfit;
