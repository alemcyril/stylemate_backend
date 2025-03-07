const express = require("express");
const router = express.Router();
const outfitController = require("../controllers/outfitController");
const auth = require("../middleware/auth");
const fileService = require("../services/fileService");

// All routes require authentication
router.use(auth);

// Outfit routes
router.get("/", outfitController.getAll);
router.post("/", fileService.upload.single("image"), outfitController.create);
router.put("/:id", fileService.upload.single("image"), outfitController.update);
router.delete("/:id", outfitController.delete);

module.exports = router;
