export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || "INFO").toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  debug(message: string, meta?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage("DEBUG", message, meta));
    }
  }

  info(message: string, meta?: any) {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage("INFO", message, meta));
    }
  }

  warn(message: string, meta?: any) {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage("WARN", message, meta));
    }
  }

  error(message: string, error?: any) {
    if (this.level <= LogLevel.ERROR) {
      const errorMsg = error instanceof Error ? error.stack || error.message : error;
      const meta = error ? { error: errorMsg } : undefined;
      console.error(this.formatMessage("ERROR", message, meta));
    }
  }

  fatal(message: string, error?: any) {
    if (this.level <= LogLevel.FATAL) {
      const errorMsg = error instanceof Error ? error.stack || error.message : error;
      const meta = error ? { error: errorMsg } : undefined;
      console.error(this.formatMessage("FATAL", message, meta));
      // In a fail-fast architecture, a fatal error should terminate the process
      process.exit(1);
    }
  }
}

export const logger = new Logger();
