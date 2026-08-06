/**
 * CARSAI HOST — Winston logger
 */
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || './logs';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'carsai-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length && meta.service
            ? `[${meta.service}]`
            : '';
          return `${timestamp} ${level} ${metaStr} ${message}`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: `${logDir}/error.log`,
      level: 'error',
    }),
    new winston.transports.File({
      filename: `${logDir}/combined.log`,
    }),
  ],
});

export type Logger = typeof logger;
