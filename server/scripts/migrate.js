#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Run individual migration files in order
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure proper order (001_, 002_, etc.)
    
    console.log('Running database migrations...');
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`Running migration: ${migrationFile}`);
      await client.query(migrationSql);
      console.log(`✅ Migration ${migrationFile} completed`);
    }
    
    console.log('✅ All database migrations completed successfully');

    // Run seed files if in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Running seed files...');
      
      const seedsDir = path.join(__dirname, '../../database/seeds');
      const seedFiles = fs.readdirSync(seedsDir).filter(file => file.endsWith('.sql'));
      
      for (const seedFile of seedFiles) {
        const seedPath = path.join(seedsDir, seedFile);
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        
        console.log(`Running seed: ${seedFile}`);
        await client.query(seedSql);
        console.log(`✅ Seed ${seedFile} completed`);
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };