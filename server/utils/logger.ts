import pino from 'pino';

type PinoLogger = pino.Logger;

declare global {
    // eslint-disable-next-line no-var
    var __pinoLogger: PinoLogger | undefined;
}

function createLogger(): PinoLogger {
    const transport = process.env.NODE_ENV !== 'production'
        ? pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        })
        : undefined;

    return pino(
        { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
        transport
    );
}

// In development, reuse the logger across hot reloads to avoid accumulating
// pino-pretty transport listeners on process.stdout.
export const logger = globalThis.__pinoLogger ?? createLogger();
if (process.env.NODE_ENV !== 'production') globalThis.__pinoLogger = logger;