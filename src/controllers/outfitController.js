const pool = require("../config/db");
const fileService = require("../services/fileService");

const outfitController = {
  // Get all outfits for a user
  getAll: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT o.*, 
         json_agg(json_build_object(
           'id', wi.id,
           'name', wi.name,
           'image_url', wi.image_url,
           'category_name', c.name
         )) as items
         FROM outfits o
         LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
         LEFT JOIN wardrobe_items wi ON oi.wardrobe_item_id = wi.id
         LEFT JOIN categories c ON wi.category_id = c.id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [req.user.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Create a new outfit
  create: async (req, res) => {
    const { name, description, items } = req.body;
    const imageUrl = req.file
      ? fileService.getFileUrl(req.file.filename)
      : null;

    try {
      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Create the outfit
        const outfitResult = await client.query(
          `INSERT INTO outfits (user_id, name, description, image_url)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [req.user.id, name, description, imageUrl]
        );

        const outfit = outfitResult.rows[0];

        // Add outfit items
        if (items && items.length > 0) {
          const values = items.map((itemId) => [outfit.id, itemId]);
          await client.query(
            `INSERT INTO outfit_items (outfit_id, wardrobe_item_id)
             VALUES ${values
               .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
               .join(", ")}`,
            values.flat()
          );
        }

        await client.query("COMMIT");
        res.status(201).json(outfit);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update an outfit
  update: async (req, res) => {
    const { id } = req.params;
    const { name, description, items } = req.body;
    const imageUrl = req.file
      ? fileService.getFileUrl(req.file.filename)
      : null;

    try {
      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Check ownership
        const outfit = await client.query(
          "SELECT * FROM outfits WHERE id = $1 AND user_id = $2",
          [id, req.user.id]
        );

        if (outfit.rows.length === 0) {
          return res.status(404).json({ message: "Outfit not found" });
        }

        // Delete old image if new one is uploaded
        if (req.file && outfit.rows[0].image_url) {
          const oldFilename = outfit.rows[0].image_url.split("/").pop();
          fileService.deleteFile(oldFilename);
        }

        // Update the outfit
        const updateResult = await client.query(
          `UPDATE outfits 
           SET name = $1, description = $2, 
               image_url = COALESCE($3, image_url),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4 AND user_id = $5
           RETURNING *`,
          [name, description, imageUrl, id, req.user.id]
        );

        // Update outfit items
        await client.query("DELETE FROM outfit_items WHERE outfit_id = $1", [
          id,
        ]);

        if (items && items.length > 0) {
          const values = items.map((itemId) => [id, itemId]);
          await client.query(
            `INSERT INTO outfit_items (outfit_id, wardrobe_item_id)
             VALUES ${values
               .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
               .join(", ")}`,
            values.flat()
          );
        }

        await client.query("COMMIT");
        res.json(updateResult.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete an outfit
  delete: async (req, res) => {
    const { id } = req.params;

    try {
      // Check ownership and get image URL
      const outfit = await pool.query(
        "SELECT * FROM outfits WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (outfit.rows.length === 0) {
        return res.status(404).json({ message: "Outfit not found" });
      }

      // Delete the image file if it exists
      if (outfit.rows[0].image_url) {
        const filename = outfit.rows[0].image_url.split("/").pop();
        fileService.deleteFile(filename);
      }

      // Delete the outfit (cascade will handle outfit_items)
      await pool.query("DELETE FROM outfits WHERE id = $1", [id]);

      res.json({ message: "Outfit deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = outfitController;
