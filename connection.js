const mongoose = require('mongoose');

const connection = async (url, retries = 5, delayMs = 3000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await mongoose.connect(url);
        } catch (err) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
            if (attempt === retries) throw err;
            await new Promise((res) => setTimeout(res, delayMs));
        }
    }
};

module.exports = connection;
