
import pool from "../src/db/pool.js";

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database(), NOW()"
    );

    console.log("Database connected successfully!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
