const http = require("http");
const app = require("./app");
const { port } = require("./config/env");
const { connectDB } = require("./config/db");
const { initIO } = require("./sockets");

// Check if running in Vercel serverless environment
const isVercelEnv = !!process.env.VERCEL;

let server;

function start() {
  // Only create HTTP server if not in serverless environment
  if (!isVercelEnv) {
    server = http.createServer(app);
    initIO(server);
  }

  connectDB()
    .then(() => {
      if (!isVercelEnv) {
        server.listen(port, () => {
          console.log("Server listening on", port);
        });
      } else {
        console.log("Running in Vercel serverless environment");
      }
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB:", err.message);
      process.exit(1);
    });
}

// Start immediately if run directly (local development)
if (require.main === module) {
  start();
}

module.exports = { app, server, start };
