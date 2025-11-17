require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  appName: process.env.APP_NAME || "CallApp",
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/webrtc",
  dbName: process.env.MONGO_DB_NAME || process.env.DB_NAME || "webrtccall",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  smtp: {
    service: process.env.SMTP_SERVICE || "gmail",
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
  },
};
