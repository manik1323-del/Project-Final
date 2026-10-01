const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'ev_charging_portal_jwt_super_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }

    const user = db.prepare('SELECT id, name, email, role, phone, vehicle_model, vehicle_number FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    req.user = user;
    next();
  });
}

module.exports = { authenticateToken, JWT_SECRET };
