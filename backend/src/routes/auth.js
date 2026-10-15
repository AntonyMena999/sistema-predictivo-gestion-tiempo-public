const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const { FRONTEND_URL, JWT_SECRET } = process.env;

// Inicia flujo de Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.events'],
    accessType: 'offline',
    prompt: 'consent',
  })
);

// Callback de Google
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=auth_failed` }),
  (req, res) => {
    // Al autenticar, passport coloca el usuario en req.user
    if (!req.user) {
      return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }

    const payload = {
      google_id: req.user.google_id,
      email: req.user.email,
      nombre: req.user.nombre,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.redirect(`${FRONTEND_URL}/?token=${token}`);
  }
);

// Ruta para obtener datos del usuario a partir del JWT
router.get('/me', requireAuth, (req, res) => {
  // req.usuario fue seteado por el middleware auth
  res.json(req.usuario || null);
});

module.exports = router;
