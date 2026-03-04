type LogLevel = 'info' | 'error' | 'warn' | 'debug';

const isProduction = process.env.NODE_ENV === 'production';

function formatLog(level: LogLevel, context: string, message: string, data?: unknown) {
    if (isProduction) return;

    const prefix = `[${context}]`;
    const logData = data ? [prefix, message, data] : [prefix, message];

    switch(level) {
        case 'error':
            console.error(...logData);
            break;
        case 'warn':
            console.warn(...logData);
            break;
        case 'debug':
            console.debug(...logData);
            break;
        default:
            console.log(...logData);
    }
}

export const clientLogger = {
    info: (context: string, message: string, data?: unknown) => formatLog('info', context, message, data),
    error: (context: string, message: string, data?: unknown) => formatLog('error', context, message, data),
    warn: (context: string, message: string, data?: unknown) => formatLog('warn', context, message, data),
    debug: (context: string, message: string, data?: unknown) => formatLog('debug', context, message, data),
};