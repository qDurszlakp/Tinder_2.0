const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Wszystkie endpointy wymagają uwierzytelnienia
router.use(requireAuth);

// Polubienie profilu
router.post('/like', interactionController.likeProfile);

// Odrzucenie profilu
router.post('/dislike', interactionController.dislikeProfile);

// Pobieranie dopasowań dla profilu
router.get('/matches/:profileId', interactionController.getMatches);

module.exports = router; 