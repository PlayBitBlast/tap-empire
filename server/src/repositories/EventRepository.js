const BaseRepository = require('./BaseRepository');

class EventRepository extends BaseRepository {
  constructor() {
    super('events');
  }

  /**
   * Get all active events
   */
  async getActiveEvents() {
    const query = `
      SELECT * FROM get_active_events()
      ORDER BY start_time ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    const query = `
      SELECT * FROM events 
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [eventId]);
    return result.rows[0];
  }

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    const query = `
      INSERT INTO events (name, description, type, start_time, end_time, multiplier, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      eventData.name,
      eventData.description,
      eventData.type,
      eventData.start_time,
      eventData.end_time,
      eventData.multiplier || 1.0,
      eventData.config || {}
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update an event
   */
  async updateEvent(eventId, eventData) {
    const query = `
      UPDATE events 
      SET name = $2, description = $3, type = $4, start_time = $5, 
          end_time = $6, multiplier = $7, config = $8, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      eventId,
      eventData.name,
      eventData.description,
      eventData.type,
      eventData.start_time,
      eventData.end_time,
      eventData.multiplier,
      eventData.config
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Check if an event is currently active
   */
  async isEventActive(eventId) {
    const query = `SELECT is_event_active($1) as is_active`;
    const result = await this.db.query(query, [eventId]);
    return result.rows[0].is_active;
  }

  /**
   * Get event upgrades for a specific event
   */
  async getEventUpgrades(eventId) {
    const query = `
      SELECT * FROM event_upgrades 
      WHERE event_id = $1
      ORDER BY cost ASC
    `;
    
    const result = await this.db.query(query, [eventId]);
    return result.rows;
  }

  /**
   * Get event upgrade by ID
   */
  async getEventUpgradeById(eventUpgradeId) {
    const query = `
      SELECT eu.*, e.name as event_name, e.type as event_type
      FROM event_upgrades eu
      JOIN events e ON eu.event_id = e.id
      WHERE eu.id = $1
    `;
    
    const result = await this.db.query(query, [eventUpgradeId]);
    return result.rows[0];
  }

  /**
   * Create an event upgrade
   */
  async createEventUpgrade(eventUpgradeData) {
    const query = `
      INSERT INTO event_upgrades (event_id, name, description, type, cost, benefit, max_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      eventUpgradeData.event_id,
      eventUpgradeData.name,
      eventUpgradeData.description,
      eventUpgradeData.type,
      eventUpgradeData.cost,
      eventUpgradeData.benefit,
      eventUpgradeData.max_level || 1
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get user's event upgrades for a specific event
   */
  async getUserEventUpgrades(userId, eventId) {
    const query = `
      SELECT ueu.*, eu.name, eu.description, eu.type, eu.benefit, eu.max_level
      FROM user_event_upgrades ueu
      JOIN event_upgrades eu ON ueu.event_upgrade_id = eu.id
      WHERE ueu.user_id = $1 AND eu.event_id = $2
      ORDER BY eu.cost ASC
    `;
    
    const result = await this.db.query(query, [userId, eventId]);
    return result.rows;
  }

  /**
   * Get user's specific event upgrade
   */
  async getUserEventUpgrade(userId, eventUpgradeId) {
    const query = `
      SELECT * FROM user_event_upgrades 
      WHERE user_id = $1 AND event_upgrade_id = $2
    `;
    
    const result = await this.db.query(query, [userId, eventUpgradeId]);
    return result.rows[0];
  }

  /**
   * Get all user's event upgrades across all events
   */
  async getUserAllEventUpgrades(userId) {
    const query = `
      SELECT ueu.*, eu.name, eu.description, eu.type, eu.benefit, eu.event_id
      FROM user_event_upgrades ueu
      JOIN event_upgrades eu ON ueu.event_upgrade_id = eu.id
      JOIN events e ON eu.event_id = e.id
      WHERE ueu.user_id = $1 
        AND e.is_active = true 
        AND NOW() >= e.start_time 
        AND NOW() <= e.end_time
      ORDER BY eu.event_id, eu.cost ASC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Purchase an event upgrade
   */
  async purchaseEventUpgrade(userId, eventUpgradeId, cost) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Deduct coins from user
      await client.query(
        'UPDATE users SET coins = coins - $1 WHERE id = $2',
        [cost, userId]
      );
      
      // Check if user already has this upgrade
      const existingResult = await client.query(
        'SELECT level FROM user_event_upgrades WHERE user_id = $1 AND event_upgrade_id = $2',
        [userId, eventUpgradeId]
      );
      
      if (existingResult.rows.length > 0) {
        // Upgrade existing level
        await client.query(
          'UPDATE user_event_upgrades SET level = level + 1 WHERE user_id = $1 AND event_upgrade_id = $2',
          [userId, eventUpgradeId]
        );
      } else {
        // Create new upgrade entry
        await client.query(
          'INSERT INTO user_event_upgrades (user_id, event_upgrade_id, level) VALUES ($1, $2, 1)',
          [userId, eventUpgradeId]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get expired events
   */
  async getExpiredEvents() {
    const query = `
      SELECT * FROM events 
      WHERE end_time < NOW() AND is_active = true
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Clean up expired event data
   */
  async cleanupEventData(eventId) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Delete user event upgrades
      await client.query(
        'DELETE FROM user_event_upgrades WHERE event_upgrade_id IN (SELECT id FROM event_upgrades WHERE event_id = $1)',
        [eventId]
      );
      
      // Delete event upgrades
      await client.query('DELETE FROM event_upgrades WHERE event_id = $1', [eventId]);
      
      // Mark event as inactive
      await client.query('UPDATE events SET is_active = false WHERE id = $1', [eventId]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(type) {
    const query = `
      SELECT * FROM events 
      WHERE type = $1 
      ORDER BY start_time DESC
    `;
    
    const result = await this.db.query(query, [type]);
    return result.rows;
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents() {
    const query = `
      SELECT * FROM events 
      WHERE start_time > NOW() AND is_active = true
      ORDER BY start_time ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }
}

module.exports = EventRepository;
