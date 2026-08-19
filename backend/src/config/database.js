const { Pool } = require("pg"); // Import the Pool class from the pg module to create a connection pool for PostgreSQL.
const dotenv = require("dotenv");

dotenv.config({ path: require("path").resolve(__dirname, "../../.env") });

const db = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
});

db.on("error", (error) => {
    console.error("PostgreSQL pool error:", error);
});

async function connectDatabase() {
    await db.query("SELECT 1");
    console.log("PostgreSQL connected");
}

module.exports = {
    db,
    connectDatabase,
};