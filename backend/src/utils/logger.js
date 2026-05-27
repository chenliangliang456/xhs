/**
 * 简单日志工具 - 控制台输出带时间戳的日志
 */
const logger = {
  info: (...args) => console.log(`[INFO] ${new Date().toISOString()}`, ...args),
  warn: (...args) => console.warn(`[WARN] ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
};

module.exports = logger;
