const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

// Rejestracja nowego użytkownika
router.post('/register', authController.register);

// Logowanie użytkownika
router.post('/login', authController.login);

// Powiązanie profilu z kontem
router.post('/link-profile', authController.linkProfile);

// Weryfikacja tokenu
router.get('/verify-token', authController.verifyToken);

module.exports = router; 