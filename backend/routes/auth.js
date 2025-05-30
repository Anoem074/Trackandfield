const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ 
      msg: 'Vul alle verplichte velden in' 
    });
  }

  try {
    // Find user and select required fields
    const user = await User.findOne({ username })
      .select('username email password points recovery role')
      .lean();

    if (!user) {
      return res.status(400).json({ 
        msg: 'Gebruiker niet gevonden' 
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        msg: 'Ongeldige inloggegevens' 
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete user.password;

    // Send response
    res.json({ 
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: user.points || 0,
        recovery: user.recovery || 0,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      msg: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}));

// Register (nog niet open)
router.post('/register', (req, res) => {
  res.status(403).json({ 
    msg: 'Registratie is nog niet open.' 
  });
});

// JWT auth middleware
function auth(req, res, next) {
  try {
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ 
        msg: 'Geen token gevonden, toegang geweigerd' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is about to expire (within 1 hour)
    const tokenExp = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (tokenExp - now < oneHour) {
      // Create new token
      const newToken = jwt.sign(
        { id: decoded.id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );
      res.setHeader('x-auth-token', newToken);
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        msg: 'Ongeldig token' 
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        msg: 'Token is verlopen' 
      });
    }
    res.status(500).json({ 
      msg: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}

// Profiel ophalen
router.get('/me', auth, asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        msg: 'Gebruiker niet gevonden' 
      });
    }

    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ 
        msg: 'Ongeldig gebruikers ID' 
      });
    }
    res.status(500).json({ 
      msg: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
}));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({ 
    msg: 'Server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

module.exports = router; 