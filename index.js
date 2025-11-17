require("dotenv").config();
const { start, app } = require("./src/server");

// Local development: start the server
if (!process.env.VERCEL) {
  start();
}

// Vercel serverless: export the Express app as the handler
module.exports = app;
