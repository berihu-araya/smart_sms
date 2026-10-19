const app = require("./app");
const { connectDatabase, db } = require("./config/database");

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