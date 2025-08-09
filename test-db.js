// Set environment variables for database connection
process.env.DATABASE_URL = "postgresql://tap_empire_user:test_prod_password_123@localhost:5432/tap_empire";

const { Database } = require('./server/src/config/database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
    
    const db = new Database();
    const result = await db.testConnection();
    console.log('Database test result:', result);
    
    if (result) {
      // Test a simple query
      const queryResult = await db.query('SELECT 1 as test, NOW() as current_time');
      console.log('Query result:', queryResult.rows);
      console.log('✅ Database is working correctly');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testDatabase();