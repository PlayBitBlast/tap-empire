const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: './server/.env' });

async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Read the schema file and split by statements
    const schema = fs.readFileSync('./database/mysql_schema.sql', 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log('📊 Executing database schema...');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            console.log('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }
    
    console.log('✅ Database setup completed!');
    
    // Test the connection
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables in database:', rows.map(row => Object.values(row)[0]));
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  } finally {
    await connection.end();
  }
}

setupDatabase();