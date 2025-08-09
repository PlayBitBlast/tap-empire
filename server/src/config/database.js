const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_MAX) || 20,
  queueLimit: 0,
  acquireTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 60000,
  timeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Pool event handlers for monitoring
pool.on('connection', (connection) => {
  console.log('New database connection established as id ' + connection.threadId);
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed.');
  }
  if(err.code === 'ER_CON_COUNT_ERROR') {
    console.log('Database has too many connections.');
  }
  if(err.code === 'ECONNREFUSED') {
    console.log('Database connection was refused.');
  }
});

// Database connection wrapper with error handling
class Database {
  constructor() {
    this.pool = pool;
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    const start = Date.now();
    try {
      const [rows, fields] = await this.pool.execute(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query:', {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: rows.length
        });
      }
      
      return { rows, fields, rowCount: rows.length };
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Database query error:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a query and return the first row
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} First row or null
   */
  async queryOne(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Array of rows
   */
  async queryMany(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }

  /**
   * Begin a database transaction
   * @returns {Promise<Object>} Transaction client
   */
  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    // Add transaction methods to connection
    connection.commit = async () => {
      try {
        await connection.commit();
      } finally {
        connection.release();
      }
    };
    
    connection.rollback = async () => {
      try {
        await connection.rollback();
      } finally {
        connection.release();
      }
    };
    
    return connection;
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Function that receives the transaction connection
   * @returns {Promise<any>} Result of the callback
   */
  async transaction(callback) {
    const connection = await this.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const result = await this.query('SELECT NOW() as `current_time`');
      console.log('Database connection successful:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }
  }

  /**
   * Get connection pool status
   * @returns {Object} Pool statistics
   */
  getPoolStatus() {
    return {
      totalConnections: this.pool._allConnections.length,
      freeConnections: this.pool._freeConnections.length,
      acquiringConnections: this.pool._acquiringConnections.length
    };
  }

  /**
   * Close all connections in the pool
   * @returns {Promise<void>}
   */
  async close() {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

// Create singleton instance
const database = new Database();

// Export both the instance and the class
module.exports = {
  database,
  Database,
  pool
};