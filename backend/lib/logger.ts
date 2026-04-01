import { EventEmitter } from 'events';

// Global Event Emitter for Real-Time Logs
class SecurityLogger extends EventEmitter {}

// Make sure we only have one instance even with Next.js HMR
const globalForLogger = global as unknown as { logger: SecurityLogger };

export const securityLogger = globalForLogger.logger || new SecurityLogger();

if (process.env.NODE_ENV !== 'production') globalForLogger.logger = securityLogger;

export function emitLog(type: string, message: string, details: any = {}) {
  const logEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    type,
    message,
    details,
  };
  
  securityLogger.emit('log', logEntry);
  console.log(`[SEC_LOG] ${type}: ${message}`, details);
}
