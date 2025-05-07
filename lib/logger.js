import winston from 'winston';

const NODE_ENV = process.env?.NODE_ENV || 'development';
const { combine, timestamp, cli, json, simple } = winston.format;

export const logger = winston.createLogger({
  level: process.env?.LOG_LEVEL || 'info',
  format: NODE_ENV === 'development' ? combine(timestamp(), cli(), simple()) : combine(timestamp(), json()),
  transports: [new winston.transports.Console()],
});
