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
      const stats = await pool.query(
        `SELECT 
          COUNT(*) as total_items,
          COUNT(DISTINCT category_id) as total_categories,
          COUNT(DISTINCT color) as total_colors,
          COUNT(DISTINCT brand) as total_brands
         FROM wardrobe_items 
         WHERE user_id = $1`,
        [req.user.id]
      );

      const categoryStats = await pool.query(
        `SELECT c.name, COUNT(wi.id) as count
         FROM categories c
         LEFT JOIN wardrobe_items wi ON c.id = wi.category_id AND wi.user_id = $1
         GROUP BY c.id, c.name`,
        [req.user.id]
      );

      res.json({
        overall: stats.rows[0],
        byCategory: categoryStats.rows,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Add a new wardrobe item
  addItem: async (req, res) => {
    const { name, category_id, description, color, brand } = req.body;
    const imageUrl = req.file
      ? fileService.getFileUrl(req.file.filename)
      : null;

    try {
      const result = await pool.query(
        `INSERT INTO wardrobe_items 
         (user_id, category_id, name, description, image_url, color, brand)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, category_id, name, description, imageUrl, color, brand]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update a wardrobe item
  updateItem: async (req, res) => {
    const { id } = req.params;
    const { name, category_id, description, color, brand } = req.body;
    const imageUrl = req.file
      ? fileService.getFileUrl(req.file.filename)
      : null;

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
