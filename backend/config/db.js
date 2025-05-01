const mongoose = require("mongoose");
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");
    console.log("Connected to database:", conn.connection.db.databaseName);
    return conn;
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    console.error("Connection string used:", process.env.MONGODB_URI);
    process.exit(1);
  }
};

module.exports = connectDB;