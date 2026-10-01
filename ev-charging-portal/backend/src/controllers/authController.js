const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, vehicle_model, vehicle_number, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, vehicle_model, vehicle_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      emailNorm,
      passwordHash,
      assignedRole,
      phone || '',
      vehicle_model || '',
      vehicle_number || ''
    );

    const user = db.prepare('SELECT id, name, email, role, phone, vehicle_model, vehicle_number, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create account.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailNorm);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vehicle_model: user.vehicle_model,
      vehicle_number: user.vehicle_number,
      created_at: user.created_at
    };

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: sanitizedUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Failed to log in.' });
  }
};

exports.getProfile = async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicle_model, vehicle_number } = req.body;
    const userId = req.user.id;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          vehicle_model = COALESCE(?, vehicle_model),
          vehicle_number = COALESCE(?, vehicle_number)
      WHERE id = ?
    `).run(name, phone, vehicle_model, vehicle_number, userId);

    const updatedUser = db.prepare('SELECT id, name, email, role, phone, vehicle_model, vehicle_number, created_at FROM users WHERE id = ?').get(userId);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};
