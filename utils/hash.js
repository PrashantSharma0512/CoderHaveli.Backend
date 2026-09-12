const crypto = require("crypto");

function generateHash(text) {

    return crypto
        .createHash("sha256")
        .update(text)
        .digest("hex");

}

module.exports = generateHash;