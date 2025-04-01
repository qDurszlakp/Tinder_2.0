const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Wszystkie endpointy wymagają uwierzytelnienia
router.use(requireAuth);

// Tworzenie nowego profilu
router.post('/profile', profileController.createProfile);

// Pobieranie pojedynczego profilu
router.get('/profile/:profileId', profileController.getProfile);

// Pobieranie profili do przeglądania (swipe)
router.get('/profiles/:profileId', profileController.getProfilesToSwipe);

module.exports = router; 