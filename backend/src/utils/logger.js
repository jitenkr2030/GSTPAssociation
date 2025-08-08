// logger.js

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// Define custom log format
const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create logger instance
const logger = createLogger({
    level: 'info', // Default log level
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new transports.Console({
            format: combine(
                colorize(), // Colorize logs in the console
                logFormat
            ),
        }),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
    ],
});

/**
 * Logs an info message.
 * @param {string} message - The info message to log.
 */
const logInfo = (message) => {
    logger.info(message);
};

/**
 * Logs an error message.
 * @param {string} message - The error message to log.
 */
const logError = (message) => {
    logger.error(message);
};

/**
 * Logs a debug message.
 * @param {string} message - The debug message to log.
 */
const logDebug = (message) => {
    logger.debug(message);
};

module.exports = {
    logInfo,
    logError,
    logDebug,
    logger,
};
