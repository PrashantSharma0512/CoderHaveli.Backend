const { v2 } = require('cloudinary')

v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});


const uploadToCloudinary = async (filePath) => {
    try {
        const result = await v2.uploader.upload(filePath, {
            folder: "user_avatars",
            width: 300,
            height: 300,
            crop: "fill"
        });
        return result;
    } catch (error) {
        console.error('Cloudinary error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};

module.exports = { uploadToCloudinary }