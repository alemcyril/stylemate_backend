const express = require("express");
const router = express.Router();
const wardrobeController = require("../controllers/wardrobeController");
const auth = require("../middleware/auth");
const fileService = require("../services/fileService");

// All routes require authentication
router.use(auth);

// Wardrobe items routes
router.get("/", wardrobeController.getItems);
router.get("/stats", wardrobeController.getStats);
router.post(
  "/",
  fileService.upload.single("image"),
  wardrobeController.addItem
);
router.put(
  "/:id",
  fileService.upload.single("image"),
  wardrobeController.updateItem
);
router.delete("/:id", wardrobeController.deleteItem);

module.exports = router;
