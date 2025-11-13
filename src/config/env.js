require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/webrtc",
  dbName: process.env.MONGO_DB_NAME || process.env.DB_NAME || "webrtccall",
};
