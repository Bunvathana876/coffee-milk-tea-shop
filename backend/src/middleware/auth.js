import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { dbQuery } from '../db/database.js';

export const STAFF_ROLES = Object.freeze(['admin', 'staff']);
export const SELLER_ROLES = Object.freeze(['seller']);

export function isSupportedStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function isSupportedSellerRole(role) {
  return SELLER_ROLES.includes(role);
}

export function createToken(payload, expiresIn = config.jwtExpiresIn) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

export function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * Ensures request has a valid Customer JWT token.
 */
export async function authenticateCustomer(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'customer') {
      return res.status(401).json({ detail: 'Invalid or expired customer token.' });
    }

    const result = await dbQuery('SELECT id, full_name, phone, email, loyalty_stamps, is_active FROM customer_users WHERE id = $1', [decoded.sub]);
    const customer = result.rows[0];

    if (!customer || !customer.is_active) {
      return res.status(401).json({ detail: 'Customer account not found or inactive.' });
    }

    req.customer = customer;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures request has a valid Staff / Admin JWT token.
 */
export async function authenticateStaff(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !isSupportedStaffRole(decoded.role)) {
      return res.status(403).json({ detail: 'Forbidden: Insufficient privileges.' });
    }

    const result = await dbQuery('SELECT id, email, full_name, role, is_active FROM staff_users WHERE id = $1', [decoded.sub]);
    const staff = result.rows[0];

    if (!staff || !staff.is_active) {
      return res.status(401).json({ detail: 'Staff account not found or inactive.' });
    }

    // Tokens issued before a role change cannot retain or acquire privileges.
    if (!isSupportedStaffRole(staff.role) || staff.role !== decoded.role) {
      return res.status(403).json({ detail: 'Forbidden: Staff role has changed or is unsupported.' });
    }

    req.staff = staff;
    next();
  } catch (err) {
    next(err);
  }
}

/** Requires the current staff account to have the admin role. */
export function requireAdmin(req, res, next) {
  if (req.staff?.role !== 'admin') {
    return res.status(403).json({ detail: 'Forbidden: Administrator privileges required.' });
  }
  next();
}

/**
 * Ensures request has a valid Seller JWT token.
 */
export async function authenticateSeller(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !isSupportedSellerRole(decoded.role)) {
      return res.status(403).json({ detail: 'Forbidden: Insufficient privileges.' });
    }

    const result = await dbQuery('SELECT id, email, full_name, role, is_active FROM staff_users WHERE id = $1', [decoded.sub]);
    const seller = result.rows[0];

    if (!seller || !seller.is_active) {
      return res.status(401).json({ detail: 'Seller account not found or inactive.' });
    }

    if (seller.role !== 'seller') {
      return res.status(403).json({ detail: 'Forbidden: Account is not a registered seller.' });
    }

    req.seller = seller;
    next();
  } catch (err) {
    next(err);
  }
}
