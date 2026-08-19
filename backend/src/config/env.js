const dotenv = require("dotenv");
const path = require("path");

//dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function requireEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

module.exports = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: requireEnvironmentVariable("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  passwordResetTokenHours:
    process.env.PASSWORD_RESET_TOKEN_HOURS || 1,
  
  database: {
    host: requireEnvironmentVariable("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT || 5432),
    user: requireEnvironmentVariable("DATABASE_USER"),
    password: requireEnvironmentVariable("DATABASE_PASSWORD"),
    name: requireEnvironmentVariable("DATABASE_NAME"),
  },
};