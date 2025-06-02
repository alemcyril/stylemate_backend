const pool = require("../config/db");
const fileService = require("../services/fileService");

const wardrobeController = {
  // Get all wardrobe items for a user
  getItems: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT wi.*, c.name as category_name 
         FROM wardrobe_items wi 
         JOIN categories c ON wi.category_id = c.id 
         WHERE wi.user_id = $1 
         ORDER BY wi.created_at DESC`,
        [req.user.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get wardrobe statistics
  getStats: async (req, res) => {
    try {
      // Get all wardrobe items with their categories
      const itemsResult = await pool.query(
        `SELECT wi.*, c.name as category_name
         FROM wardrobe_items wi
         LEFT JOIN categories c ON wi.category_id = c.id
         WHERE wi.user_id = $1`,
        [req.user.id]
      );

      const items = itemsResult.rows;

      // Calculate category distribution
      const categoryCount = {};
      items.forEach((item) => {
        const category = item.category_name?.toLowerCase() || "uncategorized";
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      const categoryDistribution = Object.entries(categoryCount).map(
        ([category, count]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          count,
        })
      );

      // Calculate color distribution
      const colorCount = {};
      items.forEach((item) => {
        const color = item.color?.toLowerCase() || "other";
        colorCount[color] = (colorCount[color] || 0) + 1;
      });
      const colorDistribution = Object.entries(colorCount).map(
        ([color, count]) => ({
          color: color.charAt(0).toUpperCase() + color.slice(1),
          count,
        })
      );

      // Calculate season distribution
      const seasonCount = {};
      items.forEach((item) => {
        const seasons = item.seasons || [];
        seasons.forEach((season) => {
          seasonCount[season] = (seasonCount[season] || 0) + 1;
        });
      });
      const seasonDistribution = Object.entries(seasonCount).map(
        ([season, count]) => ({
          season: season.charAt(0).toUpperCase() + season.slice(1),
          count,
        })
      );

      res.json({
        categoryDistribution,
        colorDistribution,
        seasonDistribution,
        totalItems: items.length,
      });
    } catch (error) {
      console.error("Error getting wardrobe stats:", error);
      res.status(500).json({ message: "Failed to get wardrobe statistics" });
    }
  },

  // Add a new wardrobe item
  addItem: async (req, res) => {
    const { name, category_id, description, color, brand } = req.body;

    // Log the file details from multer
    console.log("Uploaded file details:", {
      file: req.file,
      path: req.file?.path,
      filename: req.file?.filename,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
    });

    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    const imageUrl = fileService.getFileUrl(req.file.path);
    console.log("Generated image URL:", imageUrl);

    try {
      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Get category ID from name
        const categoryResult = await client.query(
          "SELECT id FROM categories WHERE LOWER(name) = LOWER($1)",
          [category_id]
        );

        if (categoryResult.rows.length === 0) {
          throw new Error("Invalid category");
        }

        const categoryId = categoryResult.rows[0].id;

        // Create the wardrobe item
        const result = await client.query(
          `INSERT INTO wardrobe_items 
           (user_id, category_id, name, description, image_url, color, brand)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [req.user.id, categoryId, name, description, imageUrl, color, brand]
        );

        await client.query("COMMIT");
        res.status(201).json(result.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error adding wardrobe item:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  // Update a wardrobe item
  updateItem: async (req, res) => {
    const { id } = req.params;
    const { name, category_id, description, color, brand } = req.body;
    const imageUrl = req.file ? fileService.getFileUrl(req.file.path) : null;

    try {
      // Get the current item to check ownership
      const currentItem = await pool.query(
        "SELECT * FROM wardrobe_items WHERE id = $1",
        [id]
      );

      if (currentItem.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (currentItem.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Delete old image if new one is uploaded
      if (req.file && currentItem.rows[0].image_url) {
        const oldFilename = currentItem.rows[0].image_url.split("/").pop();
        fileService.deleteFile(oldFilename);
      }

      const result = await pool.query(
        `UPDATE wardrobe_items 
         SET name = $1, category_id = $2, description = $3, 
             image_url = COALESCE($4, image_url), color = $5, brand = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [
          name,
          category_id,
          description,
          imageUrl,
          color,
          brand,
          id,
          req.user.id,
        ]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete a wardrobe item
  deleteItem: async (req, res) => {
    const { id } = req.params;

    try {
      // Get the item to check ownership and get image URL
      const item = await pool.query(
        "SELECT * FROM wardrobe_items WHERE id = $1",
        [id]
      );

      if (item.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Delete the image file if it exists
      if (item.rows[0].image_url) {
        const filename = item.rows[0].image_url.split("/").pop();
        fileService.deleteFile(filename);
      }

      await pool.query(
        "DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = wardrobeController;
