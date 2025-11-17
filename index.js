require("dotenv").config();
const { start, app, ensureDBConnected } = require("./src/server");

// Local development: start the server
if (!process.env.VERCEL) {
  start();
} else {
  // Vercel serverless: ensure DB is connected before first request
  ensureDBConnected();
}

// Vercel serverless: export the Express app as the handler
module.exports = app;
