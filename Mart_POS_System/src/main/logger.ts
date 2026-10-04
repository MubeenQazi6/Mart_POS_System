import { app } from 'electron';
import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

class MainLogger {
  private logDir: string | null = null;
  private logFilePath: string | null = null;
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized) return;

    try {
      if (app.isReady()) {
        this.setupLogFiles();
      } else {
        app.once('ready', () => {
          this.setupLogFiles();
        });
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('[Logger] Initialization failed:', err);
    }
  }

  private setupLogFiles(): void {
    try {
      const userData = app.getPath('userData');
      this.logDir = join(userData, 'logs');
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }
      this.logFilePath = join(this.logDir, 'martpos.log');
    } catch (err) {
      console.error('[Logger] Failed to create log directory:', err);
    }
  }

  private write(level: LogLevel, context: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      context,
      message,
      ...(data !== undefined ? { data } : {}),
    };

    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
    if (level === 'error') {
      if (data !== undefined) {
        console.error(prefix, message, data);
      } else {
        console.error(prefix, message);
      }
    } else if (level === 'warn') {
      if (data !== undefined) {
        console.warn(prefix, message, data);
      } else {
        console.warn(prefix, message);
      }
    } else if (level === 'debug') {
      if (data !== undefined) {
        console.debug(prefix, message, data);
      } else {
        console.debug(prefix, message);
      }
    } else {
      if (data !== undefined) {
        console.info(prefix, message, data);
      } else {
        console.info(prefix, message);
      }
    }

    if (this.logFilePath) {
      try {
        const line = JSON.stringify(entry) + '\n';
        appendFileSync(this.logFilePath, line, 'utf-8');
      } catch {
        // Suppress write errors to avoid crashing
      }
    }
  }

  public debug(context: string, message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production' || process.env.MARTPOS_DEBUG === '1') {
      this.write('debug', context, message, data);
    }
  }

  public info(context: string, message: string, data?: unknown): void {
    this.write('info', context, message, data);
  }

  public warn(context: string, message: string, data?: unknown): void {
    this.write('warn', context, message, data);
  }

  public error(context: string, message: string, data?: unknown): void {
    this.write('error', context, message, data);
  }
}

export const logger = new MainLogger();
