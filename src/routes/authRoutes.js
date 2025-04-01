const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');
const router = express.Router();

// Publiczne trasy (nie wymagają uwierzytelniania)
// Rejestracja nowego użytkownika
router.post('/register', authController.register);

// Logowanie użytkownika
router.post('/login', authController.login);

// Trasy wymagające uwierzytelniania
// Powiązanie profilu z kontem
router.post('/link-profile', requireAuth, authController.linkProfile);

// Weryfikacja tokenu
router.get('/verify-token', requireAuth, authController.verifyToken);

module.exports = router; 