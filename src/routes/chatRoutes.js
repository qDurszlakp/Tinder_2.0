const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Wszystkie endpointy wymagają uwierzytelnienia
router.use(requireAuth);

// Pobieranie listy konwersacji dla profilu
router.get('/conversations/:profileId', chatController.getConversations);

// Pobieranie wiadomości między dwoma profilami
router.get('/messages/:profileId/:otherProfileId', chatController.getMessages);

// Wysyłanie wiadomości
router.post('/messages', chatController.sendMessage);

// Oznaczanie wiadomości jako przeczytane
router.put('/messages/read/:profileId/:otherProfileId', chatController.markAsRead);

module.exports = router; 