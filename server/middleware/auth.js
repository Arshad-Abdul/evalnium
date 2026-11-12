import crypto from 'crypto';

/**
 * Constant-time secret comparison using SHA-256 digests so lengths never leak.
 */
export function safeCompareSecret(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || !expected) {
    return false;
  }
  const candDigest = crypto.createHash('sha256').update(candidate.trim(), 'utf8').digest();
  const expDigest = crypto.createHash('sha256').update(expected.trim(), 'utf8').digest();
  return crypto.timingSafeEqual(candDigest, expDigest);
}

/**
 * Shared request-level check for verified administrator cookies or headers.
 */
export function isAdminAuthenticatedRequest(req) {
  if (req.signedCookies?.evalnium_admin_session === 'true') {
    return true;
  }
  const envPasscode = process.env.ADMIN_PASSCODE;
  if (!envPasscode) return false;

  const headerPasscode = req.headers['x-admin-passcode'] || req.headers['x-admin-token'];
  if (typeof headerPasscode === 'string' && safeCompareSecret(headerPasscode, envPasscode)) {
    return true;
  }
  return false;
}

/**
 * Administrative Authentication & Authorization Guard Middleware
 * 
 * Verifies that incoming HTTP requests originate from an authenticated
 * administrator via secure signed session cookie or admin authorization header.
 */
export function authenticateAdmin(req, res, next) {
  if (isAdminAuthenticatedRequest(req)) {
    req.isAdmin = true;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Access Denied: Administrative authentication required for this action.'
  });
}
