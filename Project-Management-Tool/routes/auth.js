const express = require('express');
const passport = require('passport');
const router = express.Router();

// ===== START GOOGLE AUTH =====
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

// ===== GOOGLE CALLBACK =====
router.get(
  '/callback',
  (req, res, next) => {
    console.log('Incoming Google Callback URL:', req.originalUrl);
    next();
  },
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Successful login
    res.redirect('/projectmanager.html');
  }
);

// ===== LOGOUT =====
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie('connect.sid', { path: '/' });
      res.redirect('/');
    });
  });
});

// ===== CHECK LOGIN STATUS =====
router.get('/check', (req, res) => {
  res.json({ loggedIn: req.isAuthenticated() });
});

// ===== GET CURRENT USER DETAILS =====
router.get('/current_user', (req, res) => {
  if (req.isAuthenticated()) {
    // Assuming user object from Passport.js contains id, displayName, and image
    res.json({
      id: req.user.id,
      displayName: req.user.displayName,
      image: req.user.image
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

module.exports = router;
