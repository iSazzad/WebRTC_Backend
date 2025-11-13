const mongoose = require("mongoose");
const { mongodbUri, dbName } = require("./env");

function connectDB() {
  mongoose.connection.on("connected", () => console.log("MongoDB connected"));
  mongoose.connection.on("error", (err) =>
    console.error("MongoDB connection error:", err.message)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected")
  );

  return mongoose.connect(mongodbUri, {
    autoIndex: true,
    dbName,
  });
}

module.exports = { connectDB };
