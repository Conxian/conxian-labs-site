/**
 * Conxian Labs - Institutional Logger Utility
 * Standardized telemetry and error tracking for sovereign infrastructure surfaces.
 */
const Logger = (function() {
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    };

    let currentLevel = LOG_LEVELS.INFO;

    function formatMessage(level, module, message, data) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ' | Data: ' + JSON.stringify(data) : '';
        return `[${timestamp}] [${level}] [${module}] ${message}${dataStr}`;
    }

    function log(level, module, message, data) {
        if (LOG_LEVELS[level] >= currentLevel) {
            const formatted = formatMessage(level, module, message, data);
            switch(level) {
                case 'DEBUG': console.debug(formatted); break;
                case 'INFO': console.info(formatted); break;
                case 'WARN': console.warn(formatted); break;
                case 'ERROR':
                case 'FATAL': console.error(formatted); break;
            }
        }
    }

    // Global Error Handlers
    function initGlobalHandlers() {
        window.onerror = function(message, source, lineno, colno, error) {
            log('FATAL', 'GLOBAL', message, { source, lineno, colno, error: error ? error.stack : null });
        };

        window.onunhandledrejection = function(event) {
            log('ERROR', 'PROMISE', 'Unhandled Promise Rejection', { reason: event.reason });
        };

        log('INFO', 'LOGGER', 'Institutional Logger Initialized');
    }

    return {
        debug: (module, msg, data) => log('DEBUG', module, msg, data),
        info: (module, msg, data) => log('INFO', module, msg, data),
        warn: (module, msg, data) => log('WARN', module, msg, data),
        error: (module, msg, data) => log('ERROR', module, msg, data),
        fatal: (module, msg, data) => log('FATAL', module, msg, data),
        setLevel: (level) => { if (LOG_LEVELS[level] !== undefined) currentLevel = LOG_LEVELS[level]; },
        init: initGlobalHandlers
    };
})();

// Attach to window if present
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    Logger.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
