const { database } = require('../config/database');

/**
 * Base repository class providing common database operations
 * All specific repositories should extend this class
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = database;
  }

  /**
   * Find a record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    return await this.db.queryOne(query, [id]);
  }

  /**
   * Find all records with optional conditions
   * @param {Object} conditions - WHERE conditions
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Array of records
   */
  async findAll(conditions = {}, options = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        params.push(conditions[key]);
        return `${key} = $${paramIndex++}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    // Add LIMIT
    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    // Add OFFSET
    if (options.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    return await this.db.queryMany(query, params);
  }

  /**
   * Find one record with conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findOne(conditions) {
    const records = await this.findAll(conditions, { limit: 1 });
    return records[0] || null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    return await this.db.queryOne(query, values);
  }

  /**
   * Update a record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) {
      throw new Error('No data provided for update');
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    return await this.db.queryOne(query, [id, ...values]);
  }

  /**
   * Update records with conditions
   * @param {Object} conditions - WHERE conditions
   * @param {Object} data - Updated data
   * @returns {Promise<Array>} Updated records
   */
  async updateWhere(conditions, data) {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const conditionKeys = Object.keys(conditions);
    const conditionValues = Object.values(conditions);
    
    if (dataKeys.length === 0) {
      throw new Error('No data provided for update');
    }

    let paramIndex = 1;
    const setClause = dataKeys.map(key => `${key} = $${paramIndex++}`).join(', ');
    const whereClause = conditionKeys.map(key => `${key} = $${paramIndex++}`).join(' AND ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClause}
      RETURNING *
    `;

    return await this.db.queryMany(query, [...dataValues, ...conditionValues]);
  }

  /**
   * Delete a record by ID
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Delete records with conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteWhere(conditions) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    if (keys.length === 0) {
      throw new Error('No conditions provided for delete');
    }

    const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    const query = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    
    const result = await this.db.query(query, values);
    return result.rowCount;
  }

  /**
   * Count records with optional conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<number>} Record count
   */
  async count(conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => {
        params.push(conditions[key]);
        return `${key} = $${paramIndex++}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    const result = await this.db.queryOne(query, params);
    return parseInt(result.count);
  }

  /**
   * Check if a record exists
   * @param {Object} conditions - WHERE conditions
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /**
   * Execute a raw SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async raw(query, params = []) {
    return await this.db.query(query, params);
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    return await this.db.transaction(callback);
  }

  /**
   * Bulk insert records
   * @param {Array} records - Array of record objects
   * @returns {Promise<Array>} Created records
   */
  async bulkCreate(records) {
    if (!records || records.length === 0) {
      return [];
    }

    const keys = Object.keys(records[0]);
    const columns = keys.join(', ');
    
    // Build VALUES clause with placeholders
    const valuesClauses = [];
    const allValues = [];
    let paramIndex = 1;

    records.forEach(record => {
      const placeholders = keys.map(() => `$${paramIndex++}`).join(', ');
      valuesClauses.push(`(${placeholders})`);
      allValues.push(...keys.map(key => record[key]));
    });

    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES ${valuesClauses.join(', ')}
      RETURNING *
    `;

    return await this.db.queryMany(query, allValues);
  }

  /**
   * Get paginated results
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @param {Object} conditions - WHERE conditions
   * @param {string} orderBy - ORDER BY clause
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async paginate(page = 1, limit = 10, conditions = {}, orderBy = 'id ASC') {
    const offset = (page - 1) * limit;
    const records = await this.findAll(conditions, { limit, offset, orderBy });
    const totalCount = await this.count(conditions);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: records,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}

module.exports = BaseRepository;