/**
 * Logger estruturado com timestamp, nível e contexto.
 * Nível controlado pela variável de ambiente LOG_LEVEL (DEBUG | INFO | WARN | ERROR).
 * Padrão: INFO
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LEVELS[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] ?? LEVELS.INFO;

function formatTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function log(level, context, message, extra) {
    if (LEVELS[level] < CURRENT_LEVEL) return;

    const ts = formatTimestamp();
    const ctx = context ? `[${context}]` : '';
    const line = `[${ts}] [${level.padEnd(5)}] ${ctx} ${message}`;

    if (level === 'ERROR') {
        console.error(line, extra !== undefined ? extra : '');
    } else {
        console.log(line, extra !== undefined ? extra : '');
    }
}

export const logger = {
    /** @param {string} ctx @param {string} msg @param {*} [extra] */
    debug: (ctx, msg, extra) => log('DEBUG', ctx, msg, extra),
    /** @param {string} ctx @param {string} msg @param {*} [extra] */
    info:  (ctx, msg, extra) => log('INFO',  ctx, msg, extra),
    /** @param {string} ctx @param {string} msg @param {*} [extra] */
    warn:  (ctx, msg, extra) => log('WARN',  ctx, msg, extra),
    /** @param {string} ctx @param {string} msg @param {*} [extra] */
    error: (ctx, msg, extra) => log('ERROR', ctx, msg, extra),
};
