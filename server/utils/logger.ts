import pino from 'pino';

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

export const logger = pino(
    { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
    transport
);