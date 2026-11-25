const app = require("./app");
const { connectDatabase, db } = require("./config/database");
const { closeRedis } = require("./config/redis");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error(`Server error on port ${PORT}:`, error.message);
      if (error.code === "EACCES") {
        console.error(
          `Port ${PORT} is forbidden or excluded by Windows/OS. Try using a different PORT.`
        );
      } else if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use by another process.`);
      }
      process.exit(1);
    });

    // Graceful Shutdown for Container & Process Orchestration (Docker/K8s/PM2)
    function gracefulShutdown(signal) {
      console.log(`\n[${new Date().toISOString()}] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log("HTTP server closed. Closing database connection pool...");
        try {
          await db.end();
          await closeRedis();
          console.log("Database connection pool & Redis closed successfully.");
          process.exit(0);
        } catch (err) {
          console.error("Error closing database connections during shutdown:", err);
          process.exit(1);
        }
      });

      // Force exit if connections do not drain within 10 seconds
      setTimeout(() => {
        console.error("Forced shutdown triggered after timeout.");
        process.exit(1);
      }, 10000).unref();
    }

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Unable to connect to PostgreSQL");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    await db.end();
    process.exit(1);
  }
}

startServer();