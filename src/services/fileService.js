const { upload, cloudinary } = require("../config/cloudinary");

const fileService = {
  // Export the upload middleware directly
  upload,

  // Get the URL of an uploaded file
  getFileUrl: (path) => {
    console.log("Getting file URL for path:", path);
    // For Cloudinary, the path is already the URL
    return path;
  },

  // Delete a file
  deleteFile: async (publicId) => {
    try {
      console.log("Attempting to delete file with publicId:", publicId);
      // Extract public_id from URL if a full URL is provided
      const public_id = publicId.includes("cloudinary")
        ? publicId.split("/").slice(-2).join("/").split(".")[0]
        : publicId;

      console.log("Extracted public_id:", public_id);
      await cloudinary.uploader.destroy(public_id);
      console.log("Successfully deleted file from Cloudinary");
    } catch (error) {
      console.error("Error deleting file from Cloudinary:", error);
      throw error;
    }
  },
};

module.exports = fileService;
