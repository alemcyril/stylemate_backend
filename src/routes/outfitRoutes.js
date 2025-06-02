const express = require("express");
const router = express.Router();
const outfitController = require("../controllers/outfitController");
const auth = require("../middleware/auth");
const fileService = require("../services/fileService");

// All routes require authentication
router.use(auth);

// Outfit routes
router.get("/", outfitController.getAll);
router.get("/recommendations", outfitController.getRecommendations);
router.post("/", fileService.upload.single("image"), outfitController.create);
router.put("/:id", fileService.upload.single("image"), outfitController.update);
router.delete("/:id", outfitController.delete);
router.put("/:id/favorite", outfitController.toggleFavorite);
router.put("/:id/save", outfitController.saveForLater);
router.get("/stats", outfitController.getStats);

// Saved outfit routes
router.post("/saved", outfitController.saveOutfit);
router.delete("/saved", outfitController.removeSavedOutfit);
router.get("/saved", outfitController.getSavedOutfits);

module.exports = router;
