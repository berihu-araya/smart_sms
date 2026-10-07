const { Pool, types } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: require("path").resolve(__dirname, "../../.env") });

// Parse PostgreSQL DATE type (OID 1082) as a raw 'YYYY-MM-DD' string to avoid UTC/local timezone shifts
types.setTypeParser(1082, (val) => val);

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