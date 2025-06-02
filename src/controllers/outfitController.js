const pool = require("../config/db");
const fileService = require("../services/fileService");

// Helper function to determine if an item is weather appropriate
const isWeatherAppropriate = (item, weather, prefs) => {
  // This is a simplified example. You would implement more sophisticated logic
  const temp = weather.temperature;
  const condition = weather.condition;

  // Basic temperature-based rules
  if (temp < 15) {
    // Cold weather - prefer warmer items
    return (
      item.name.toLowerCase().includes("sweater") ||
      item.name.toLowerCase().includes("jacket") ||
      item.name.toLowerCase().includes("coat")
    );
  } else if (temp > 25) {
    // Hot weather - prefer lighter items
    return (
      item.name.toLowerCase().includes("t-shirt") ||
      item.name.toLowerCase().includes("shorts") ||
      !item.name.toLowerCase().includes("sweater")
    );
  }

  // Condition-based rules
  if (condition === "rainy") {
    return (
      item.name.toLowerCase().includes("rain") ||
      item.name.toLowerCase().includes("waterproof")
    );
  }

  return true; // Default to including the item
};

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

  // Get outfit recommendations
  getRecommendations: async (req, res) => {
    try {
      // Get user's wardrobe items
      const wardrobeResult = await pool.query(
        `SELECT wi.*, c.name as category_name
         FROM wardrobe_items wi
         LEFT JOIN categories c ON wi.category_id = c.id
         WHERE wi.user_id = $1`,
        [req.user.id]
      );

      const wardrobeItems = wardrobeResult.rows;

      if (!wardrobeItems || wardrobeItems.length === 0) {
        return res.status(404).json({
          message:
            "No wardrobe items found. Please add some items to your wardrobe first.",
        });
      }

      // Get current weather data
      const weatherResult = await pool.query(
        `SELECT * FROM weather_preferences WHERE user_id = $1`,
        [req.user.id]
      );

      const weatherPrefs = weatherResult.rows[0] || {
        min_temperature: 15,
        max_temperature: 25,
        preferred_conditions: ["sunny", "cloudy"],
      };

      // Get current weather from external API (you'll need to implement this)
      const currentWeather = {
        temperature: 20, // Example temperature
        condition: "sunny", // Example condition
      };

      // Generate recommendations based on weather and wardrobe
      const recommendations = [];
      const categories = ["tops", "bottoms", "outerwear"];
      const usedItems = new Set();

      // Generate 4 different outfits
      for (let i = 0; i < 4; i++) {
        const outfit = {
          id: `rec_${Date.now()}_${i}`,
          name: `Weather-Appropriate Outfit ${i + 1}`,
          description: `Perfect for ${currentWeather.condition} weather at ${currentWeather.temperature}°C`,
          items: [],
          weather: currentWeather.condition,
          temperature: currentWeather.temperature,
          rating: Math.floor(Math.random() * 5) + 1,
        };

        // First, try to get one item from each category
        for (const category of categories) {
          // Filter items by category and weather appropriateness
          const availableItems = wardrobeItems.filter(
            (item) =>
              item.category_name?.toLowerCase() === category &&
              !usedItems.has(item.id) &&
              isWeatherAppropriate(item, currentWeather, weatherPrefs)
          );

          if (availableItems.length > 0) {
            // Randomly select an item
            const selectedItem =
              availableItems[Math.floor(Math.random() * availableItems.length)];
            outfit.items.push({
              id: selectedItem.id,
              name: selectedItem.name,
              image_url: selectedItem.image_url,
              category_name: selectedItem.category_name,
            });
            usedItems.add(selectedItem.id);
          }
        }

        // Only add outfits that have at least a top and bottom
        if (outfit.items.length >= 2) {
          // Sort items by category to ensure consistent order
          outfit.items.sort((a, b) => {
            const categoryOrder = { tops: 0, bottoms: 1, outerwear: 2 };
            return (
              categoryOrder[a.category_name.toLowerCase()] -
              categoryOrder[b.category_name.toLowerCase()]
            );
          });
          recommendations.push(outfit);
        }
      }

      if (recommendations.length === 0) {
        return res.status(404).json({
          message:
            "Could not generate recommendations with the current wardrobe items. Please add more items to your wardrobe.",
        });
      }

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({
        message: "Failed to generate recommendations",
        error: error.message,
      });
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

  // Toggle favorite status of an outfit
  toggleFavorite: async (req, res) => {
    const { id } = req.params;

    try {
      // Check ownership
      const outfit = await pool.query(
        "SELECT * FROM outfits WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (outfit.rows.length === 0) {
        return res.status(404).json({ message: "Outfit not found" });
      }

      // Toggle the favorite status
      const result = await pool.query(
        `UPDATE outfits 
         SET is_favorite = NOT is_favorite,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, req.user.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Save outfit for later
  saveForLater: async (req, res) => {
    const { id } = req.params;

    try {
      // Check ownership
      const outfit = await pool.query(
        "SELECT * FROM outfits WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (outfit.rows.length === 0) {
        return res.status(404).json({ message: "Outfit not found" });
      }

      // Update the saved status
      const result = await pool.query(
        `UPDATE outfits 
         SET saved_for_later = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, req.user.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get outfit statistics
  getStats: async (req, res) => {
    try {
      // Get all outfits with their items
      const outfitsResult = await pool.query(
        `SELECT o.*, 
         json_agg(json_build_object(
           'id', wi.id,
           'name', wi.name,
           'category_name', c.name
         )) as items
         FROM outfits o
         LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
         LEFT JOIN wardrobe_items wi ON oi.wardrobe_item_id = wi.id
         LEFT JOIN categories c ON wi.category_id = c.id
         WHERE o.user_id = $1
         GROUP BY o.id`,
        [req.user.id]
      );

      const outfits = outfitsResult.rows;

      // Calculate usage distribution by occasion
      const occasionCount = {};
      outfits.forEach((outfit) => {
        const occasion = outfit.occasion?.toLowerCase() || "casual";
        occasionCount[occasion] = (occasionCount[occasion] || 0) + 1;
      });
      const usageDistribution = Object.entries(occasionCount).map(
        ([occasion, count]) => ({
          occasion: occasion.charAt(0).toUpperCase() + occasion.slice(1),
          count,
        })
      );

      // Calculate favorite distribution
      const favoriteCount = {};
      outfits.forEach((outfit) => {
        if (outfit.is_favorite) {
          const category =
            outfit.items[0]?.category_name?.toLowerCase() || "other";
          favoriteCount[category] = (favoriteCount[category] || 0) + 1;
        }
      });
      const favoriteDistribution = Object.entries(favoriteCount).map(
        ([category, count]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          count,
        })
      );

      // Calculate weather distribution
      const weatherCount = {};
      outfits.forEach((outfit) => {
        const weather = outfit.weather?.toLowerCase() || "sunny";
        weatherCount[weather] = (weatherCount[weather] || 0) + 1;
      });
      const weatherDistribution = Object.entries(weatherCount).map(
        ([weather, count]) => ({
          weather: weather.charAt(0).toUpperCase() + weather.slice(1),
          count,
        })
      );

      res.json({
        usageDistribution,
        favoriteDistribution,
        weatherDistribution,
        totalOutfits: outfits.length,
      });
    } catch (error) {
      console.error("Error getting outfit stats:", error);
      res.status(500).json({ message: "Failed to get outfit statistics" });
    }
  },

  // Save outfit
  saveOutfit: async (req, res) => {
    try {
      const {
        id,
        name,
        description,
        items,
        occasion,
        season,
        weather,
        rating,
      } = req.body;

      // Check if this is a recommended outfit (has a rec_ prefix)
      let outfitId = id;
      if (id.startsWith("rec_")) {
        // Create a new outfit record for the recommendation
        const outfitResult = await pool.query(
          `INSERT INTO outfits (user_id, name, description)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [req.user.id, name, description]
        );
        outfitId = outfitResult.rows[0].id;

        // Add outfit items if provided
        if (items && items.length > 0) {
          const values = items.map((item) => [outfitId, item.id]);
          await pool.query(
            `INSERT INTO outfit_items (outfit_id, wardrobe_item_id)
             VALUES ${values
               .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
               .join(", ")}`,
            values.flat()
          );
        }
      }

      // Check if outfit is already saved
      const existingSaved = await pool.query(
        `SELECT * FROM saved_outfits WHERE outfit_id = $1 AND user_id = $2`,
        [outfitId, req.user.id]
      );

      if (existingSaved.rows.length > 0) {
        return res.status(400).json({ message: "Outfit is already saved" });
      }

      // Create new saved outfit
      const result = await pool.query(
        `INSERT INTO saved_outfits (
          outfit_id, user_id, name, description, occasion, season, weather, rating, saved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          outfitId,
          req.user.id,
          name,
          description,
          occasion,
          season,
          weather,
          rating,
          new Date(),
        ]
      );

      res.status(201).json({
        message: "Outfit saved successfully",
        savedOutfit: result.rows[0],
      });
    } catch (error) {
      console.error("Error saving outfit:", error);
      res
        .status(500)
        .json({ message: "Error saving outfit", error: error.message });
    }
  },

  // Remove saved outfit
  removeSavedOutfit: async (req, res) => {
    try {
      const { id } = req.body;

      const result = await pool.query(
        `DELETE FROM saved_outfits WHERE outfit_id = $1 AND user_id = $2 RETURNING *`,
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Saved outfit not found" });
      }

      res.json({ message: "Outfit removed from saved items" });
    } catch (error) {
      console.error("Error removing saved outfit:", error);
      res
        .status(500)
        .json({ message: "Error removing saved outfit", error: error.message });
    }
  },

  // Get saved outfits
  getSavedOutfits: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT so.*, 
         json_agg(
           CASE 
             WHEN wi.id IS NOT NULL THEN
               json_build_object(
                 'id', wi.id,
                 'name', wi.name,
                 'image_url', wi.image_url,
                 'category_name', c.name
               )
             ELSE NULL
           END
         ) FILTER (WHERE wi.id IS NOT NULL) as items,
         o.image_url as outfit_image
         FROM saved_outfits so
         LEFT JOIN outfits o ON so.outfit_id = o.id
         LEFT JOIN outfit_items oi ON so.outfit_id = oi.outfit_id
         LEFT JOIN wardrobe_items wi ON oi.wardrobe_item_id = wi.id
         LEFT JOIN categories c ON wi.category_id = c.id
         WHERE so.user_id = $1
         GROUP BY so.id, o.image_url
         ORDER BY so.saved_at DESC`,
        [req.user.id]
      );

      // Transform the response to ensure items is always an array
      const savedOutfits = result.rows.map((outfit) => ({
        ...outfit,
        items: outfit.items || [],
        outfit_image: outfit.outfit_image || null,
      }));

      res.json(savedOutfits);
    } catch (error) {
      console.error("Error getting saved outfits:", error);
      res
        .status(500)
        .json({ message: "Error getting saved outfits", error: error.message });
    }
  },
};

module.exports = outfitController;
