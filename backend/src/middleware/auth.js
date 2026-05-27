/**
 * JWT 认证中间件
 */
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

/**
 * 验证 Token，保护需要登录的接口
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录或 Token 无效' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 已过期或无效' });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

module.exports = { authMiddleware, generateToken };
