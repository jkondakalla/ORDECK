'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '';
const ISSUER     = 'ordeck-auth';

/**
 * Verify a JWT string.
 * Returns the decoded payload, or throws on failure.
 *
 * @param {string} token
 * @param {string} [secret]  - Defaults to JWT_SECRET env var
 * @returns {object}
 */
function verifyToken(token, secret) {
  const s = secret || JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return jwt.verify(token, s, { issuer: ISSUER });
}

/**
 * Express middleware that reads the JWT from the `ordeck_access` cookie
 * or the `Authorization: Bearer <token>` header.
 *
 * Attaches the decoded payload to `req.user`.
 * Responds 401 if the token is missing or invalid.
 *
 * @type {import('express').RequestHandler}
 */
function requireAuth(req, res, next) {
  let token = null;

  // Prefer cookie
  if (req.cookies && req.cookies.ordeck_access) {
    token = req.cookies.ordeck_access;
  }

  // Fallback to Bearer header
  if (!token) {
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken, requireAuth };
