/**
 * Logging utility for the server
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Write log to file
   */
  writeToFile(level, formattedMessage) {
    const filename = `${level}-${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(this.logDir, filename);
    
    fs.appendFileSync(filepath, formattedMessage + '\n');
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    const formatted = this.formatMessage('info', message, meta);
    console.log(`[INFO] ${formatted}`);
    this.writeToFile('info', formatted);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(`[WARN] ${formatted}`);
    this.writeToFile('warn', formatted);
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    const formatted = this.formatMessage('error', message, meta);
    console.error(`[ERROR] ${formatted}`);
    this.writeToFile('error', formatted);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, meta);
      console.log(`[DEBUG] ${formatted}`);
      this.writeToFile('debug', formatted);
    }
  }
}

module.exports = new Logger();