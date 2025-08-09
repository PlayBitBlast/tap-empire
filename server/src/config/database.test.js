const fs = require('fs');
const path = require('path');
const { Database } = require('./database');

describe('Database Configuration', () => {
  describe('Database Class', () => {
    let db;

    beforeEach(() => {
      db = new Database();
    });

    test('should create Database instance', () => {
      expect(db).toBeInstanceOf(Database);
      expect(db.pool).toBeDefined();
    });

    test('should have all required methods', () => {
      expect(typeof db.query).toBe('function');
      expect(typeof db.queryOne).toBe('function');
      expect(typeof db.queryMany).toBe('function');
      expect(typeof db.beginTransaction).toBe('function');
      expect(typeof db.transaction).toBe('function');
      expect(typeof db.testConnection).toBe('function');
      expect(typeof db.getPoolStatus).toBe('function');
      expect(typeof db.close).toBe('function');
    });
  });

  describe('Migration Files', () => {
    test('should have all migration files', () => {
      const migrationsDir = path.join(__dirname, '../../../database/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      expect(migrationFiles).toEqual([
        '001_create_users.sql',
        '002_create_upgrades.sql',
        '003_create_achievements.sql',
        '004_create_social_tables.sql',
        '005_create_events_and_sessions.sql',
        '006_create_functions.sql',
        '007_add_anticheat_columns.sql'
      ]);
    });

    test('migration files should contain valid SQL', () => {
      const migrationsDir = path.join(__dirname, '../../../database/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      migrationFiles.forEach(file => {
        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic SQL validation
        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(0);
        
        // Should contain CREATE statements
        expect(content.toLowerCase()).toMatch(/create\s+(table|index|function|trigger|or\s+replace\s+function)/);
      });
    });
  });

  describe('Seed Files', () => {
    test('should have seed files', () => {
      const seedsDir = path.join(__dirname, '../../../database/seeds');
      const seedFiles = fs.readdirSync(seedsDir)
        .filter(file => file.endsWith('.sql'));

      expect(seedFiles.length).toBeGreaterThan(0);
      expect(seedFiles).toContain('achievements.sql');
      expect(seedFiles).toContain('upgrades.sql');
    });

    test('achievements seed should contain INSERT statements', () => {
      const seedPath = path.join(__dirname, '../../../database/seeds/achievements.sql');
      const content = fs.readFileSync(seedPath, 'utf8');
      
      expect(content).toBeTruthy();
      expect(content.toLowerCase()).toMatch(/insert\s+into\s+achievements/);
    });
  });

  describe('Schema File', () => {
    test('should have complete schema file', () => {
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(1000); // Should be substantial
      
      // Should contain all main tables
      expect(content.toLowerCase()).toMatch(/create table.*users/);
      expect(content.toLowerCase()).toMatch(/create table.*user_upgrades/);
      expect(content.toLowerCase()).toMatch(/create table.*achievements/);
      expect(content.toLowerCase()).toMatch(/create table.*friendships/);
      expect(content.toLowerCase()).toMatch(/create table.*gifts/);
      expect(content.toLowerCase()).toMatch(/create table.*events/);
      expect(content.toLowerCase()).toMatch(/create table.*game_sessions/);
    });
  });
});