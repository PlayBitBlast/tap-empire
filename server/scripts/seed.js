#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runSeeds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const seedsDir = path.join(__dirname, '../../database/seeds');
    const seedFiles = fs.readdirSync(seedsDir).filter(file => file.endsWith('.sql'));
    
    console.log('Running seed files...');
    
    for (const seedFile of seedFiles) {
      const seedPath = path.join(seedsDir, seedFile);
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      
      console.log(`Running seed: ${seedFile}`);
      await client.query(seedSql);
      console.log(`✅ Seed ${seedFile} completed`);
    }

    console.log('🌱 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run seeds if this script is executed directly
if (require.main === module) {
  runSeeds();
}

module.exports = { runSeeds };