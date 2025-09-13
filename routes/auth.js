const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const passport = require('passport');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('auth.db');
const logger = require('../logger');

// Helper function to log authentication attempts
const logAuthAttempt = (userId, action, status, req) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  db.run(
    'INSERT INTO auth_logs (id, userId, action, status, ipAddress, userAgent) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId || 'unknown', action, status, ip, userAgent],
    (err) => {
      if (err) {
        logger.error('Error logging auth attempt:', err);
      }
    }
  );
};

// Register route
router.post('/register', [
  check('email').isEmail().normalizeEmail(),
  check('password').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logAuthAttempt(null, 'register', 'validation_failed', req);
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const userId = uuidv4();
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  try {
    // Check if email already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        logger.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (row) {
        logAuthAttempt(row.id, 'register', 'email_exists', req);
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      db.run(
        'INSERT INTO users (id, email, password, verificationCode, verificationExpires) VALUES (?, ?, ?, ?, ?)',
        [userId, email, hashedPassword, verificationCode, verificationExpires.toISOString()],
        async (err) => {
          if (err) {
            logger.error('Error creating user:', err);
            return res.status(500).json({ error: 'Error creating user' });
          }
          
          // Send verification email
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            text: `Your verification code is: ${verificationCode}`,
            html: `<p>Please use the following code to verify your email: <strong>${verificationCode}</strong></p>`
          };
          
          try {
            await transporter.sendMail(mailOptions);
            logAuthAttempt(userId, 'register', 'success', req);
            res.status(201).json({ message: 'Registration successful. Please check your email for verification code.' });
          } catch (emailErr) {
            logger.error('Error sending verification email:', emailErr);
            res.status(500).json({ error: 'Error sending verification email' });
          }
        }
      );
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email route
router.post('/verify', [
  check('email').isEmail().normalizeEmail(),
  check('code').isLength({ min: 6, max: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, code } = req.body;
  
  db.get('SELECT id, verificationCode, verificationExpires FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      logger.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      logAuthAttempt(null, 'verify', 'user_not_found', req);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.verificationCode !== code) {
      logAuthAttempt(user.id, 'verify', 'invalid_code', req);
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    if (new Date(user.verificationExpires) < new Date()) {
      logAuthAttempt(user.id, 'verify', 'code_expired', req);
      return res.status(400).json({ error: 'Verification code has expired' });
    }
    
    // Update user as verified
    db.run('UPDATE users SET isVerified = 1, verificationCode = NULL, verificationExpires = NULL WHERE id = ?', 
      [user.id], 
      (err) => {
        if (err) {
          logger.error('Error updating user verification status:', err);
          return res.status(500).json({ error: 'Error verifying email' });
        }
        
        logAuthAttempt(user.id, 'verify', 'success', req);
        res.json({ message: 'Email verified successfully' });
      }
    );
  });
});

// Login route
router.post('/login', [
  check('email').isEmail().normalizeEmail(),
  check('password').exists()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logger.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      logAuthAttempt(null, 'login', 'invalid_credentials', req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isVerified) {
      logAuthAttempt(user.id, 'login', 'not_verified', req);
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        logger.error('Session error:', err);
        return res.status(500).json({ error: 'Error creating session' });
      }
      
      // Update last login time
      db.run('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      logAuthAttempt(user.id, 'login', 'success', req);
      res.json({ message: 'Login successful', user: { id: user.id, email: user.email } });
    });
  })(req, res, next);
});

// Logout route
router.get('/logout', (req, res) => {
  if (req.user) {
    logAuthAttempt(req.user.id, 'logout', 'success', req);
  }
  req.logout();
  res.json({ message: 'Logout successful' });
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: { id: req.user.id, email: req.user.email } });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
