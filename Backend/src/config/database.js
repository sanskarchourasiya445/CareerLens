const mongoose = require("mongoose");

async function connectToDB(uri) {
    const mongoUri = uri || process.env.MONGO_URI;
    try {
        await mongoose.connect(mongoUri);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
        throw error;
    }
}

module.exports = connectToDB;