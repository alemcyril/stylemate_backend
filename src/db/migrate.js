const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert the first migration as already executed
    await client.query(`
      INSERT INTO migrations (name) 
      VALUES ('001_initial_schema.sql')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Get list of executed migrations
    const { rows: executedMigrations } = await client.query(
      "SELECT name FROM migrations"
    );
    const executedMigrationNames = executedMigrations.map((row) => row.name);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, "migrations");
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort();

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        console.log(`Running migration: ${file}`);

        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, "utf8");

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO migrations (name) VALUES ($1)", [
            file,
          ]);
          await client.query("COMMIT");
          console.log(`Successfully executed migration: ${file}`);
        } catch (error) {
          await client.query("ROLLBACK");
          console.error(`Error executing migration ${file}:`, error);
          throw error;
        }
      }
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
