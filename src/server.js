const http = require("http");
const app = require("./app");
const { port } = require("./config/env");
const { connectDB } = require("./config/db");
const { initIO } = require("./sockets");

// Check if running in Vercel serverless environment
const isVercelEnv = !!process.env.VERCEL;

let server;
let dbConnected = false;
let dbConnectionPromise = null;

// Ensure DB is connected (called once, cached for serverless)
async function ensureDBConnected() {
  if (dbConnected) return;
  if (dbConnectionPromise) return dbConnectionPromise;

  dbConnectionPromise = connectDB()
    .then(() => {
      dbConnected = true;
      console.log("✅ Database connected");
      return true;
    })
    .catch((err) => {
      console.error("❌ Failed to connect to MongoDB:", err.message);
      if (!isVercelEnv) {
        process.exit(1);
      }
      throw err;
    });

  return dbConnectionPromise;
}

function start() {
  // Only create HTTP server if not in serverless environment
  if (!isVercelEnv) {
    server = http.createServer(app);
    initIO(server);

    ensureDBConnected()
      .then(() => {
        server.listen(port, () => {
          console.log("🚀 Server listening on", port);
        });
      })
      .catch((err) => {
        console.error("Failed to start server:", err.message);
        process.exit(1);
      });
  } else {
    // For Vercel: ensure DB is connected (will be called on first request)
    console.log("Running in Vercel serverless environment");
    ensureDBConnected().catch((err) => {
      console.error("Vercel: Failed to connect DB:", err.message);
    });
  }
}

// Start immediately if run directly (local development)
if (require.main === module) {
  start();
}

module.exports = { app, server, start, ensureDBConnected };
