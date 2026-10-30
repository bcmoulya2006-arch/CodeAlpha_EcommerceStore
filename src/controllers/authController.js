const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

function register(req, res) {
  try {
    const { username, email, password, name, address = '', phone = '' } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existing = db.prepare(`
      SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(username.trim(), email.trim());

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Username or email is already registered.'
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, email, password, name, address, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, 'customer')
    `).run(username.trim(), email.trim(), hashedPassword, name.trim(), address.trim(), phone.trim());

    const userId = Number(result.lastInsertRowid);
    const user = {
      id: userId,
      username: username.trim(),
      email: email.trim(),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      role: 'customer'
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to AlphaStore.',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
}

function login(req, res) {
  try {
    const { identifier, username, password } = req.body;
    const loginUser = (identifier || username || '').trim();

    if (!loginUser || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password.'
      });
    }

    const user = db.prepare(`
      SELECT id, username, email, password, name, address, phone, role, created_at
      FROM users
      WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(loginUser, loginUser);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      address: user.address,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at
    };

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${safeUser.name}!`,
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
}

function getMe(req, res) {
  try {
    const user = db.prepare(`
      SELECT id, username, email, name, address, phone, role, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const orderStats = db.prepare(`
      SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent
      FROM orders WHERE user_id = ?
    `).get(req.user.id);

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        total_orders: orderStats ? orderStats.total_orders : 0,
        total_spent: orderStats ? orderStats.total_spent : 0
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

function updateProfile(req, res) {
  try {
    const { name, address, phone } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT id, username, email, name, address, phone, role, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};
