'use strict';

const jwt = require('jsonwebtoken');

const PUBLIC_KEY = (process.env.JKOS_AUTH_PUBLIC_KEY || '').replace(/\\n/g, '\n');

/**
 * Verify a jkos_token JWT using the RSA public key.
 * Returns decoded payload, or throws on failure.
 */
function verifyToken(token) {
  if (!PUBLIC_KEY) throw new Error('JKOS_AUTH_PUBLIC_KEY is not set');
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'], issuer: 'jkos-auth' });
}

/**
 * Express middleware. Reads jkos_token cookie, verifies RS256, sets req.user.
 * Replaces the old JWT_SECRET / ordeck_access approach.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.jkos_token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken, requireAuth };
