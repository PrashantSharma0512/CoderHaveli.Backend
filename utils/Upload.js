const { v2 } = require('cloudinary');

// Configure once
v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// 1. For file path uploads (existing)
const uploadWithFilePath = async (filePath) => {
  try {
    return await v2.uploader.upload(filePath, {
      folder: "user_avatars",
      width: 300,
      height: 300,
      crop: "fill"
    });
  } catch (error) {
    console.error('Cloudinary file upload error:', error);
    throw new Error('File upload failed');
  }
};

// 2. NEW: For direct buffer/base64 uploads
const uploadDirectly = async (fileData) => {
  try {
    return await v2.uploader.upload(fileData, {
      folder: "user_avatars",
      width: 300,
      height: 300,
      crop: "fill",
      resource_type: "auto" // Handles both images and videos
    });
  } catch (error) {
    console.error('Cloudinary direct upload error:', error);
    throw new Error('Direct upload failed');
  }
};

module.exports = { 
  uploadWithFilePath,
  uploadDirectly // Export the new function
};