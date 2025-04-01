const Message = require('../models/Message');
const Profile = require('../models/Profile');
const Match = require('../models/Match');
const { ObjectId } = require('mongodb');

/**
 * Pobiera listę konwersacji dla danego profilu
 */
const getConversations = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    if (!profileId) {
      return res.status(400).json({ message: 'Brakuje ID profilu' });
    }
    
    // Sprawdź, czy profil istnieje
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profil nie został znaleziony' });
    }
    
    // Pobierz wszystkie konwersacje dla tego profilu
    const conversations = await Message.getConversationsForProfile(profileId);
    
    return res.status(200).json(conversations);
    
  } catch (error) {
    console.error('Błąd podczas pobierania konwersacji:', error);
    return res.status(500).json({ message: 'Wystąpił błąd serwera', error: error.message });
  }
};

/**
 * Pobiera wiadomości dla konwersacji między dwoma profilami
 */
const getMessages = async (req, res) => {
  try {
    const { profileId, otherProfileId } = req.params;
    
    if (!profileId || !otherProfileId) {
      return res.status(400).json({ message: 'Brakuje ID profilu' });
    }
    
    // Sprawdź, czy profile istnieją
    const profile = await Profile.findById(profileId);
    const otherProfile = await Profile.findById(otherProfileId);
    
    if (!profile || !otherProfile) {
      return res.status(404).json({ message: 'Jeden lub oba profile nie zostały znalezione' });
    }
    
    // Sprawdź, czy istnieje dopasowanie między tymi profilami
    const isMatch = await Match.exists(profileId, otherProfileId);
    
    if (!isMatch) {
      return res.status(403).json({ message: 'Brak dopasowania między tymi profilami' });
    }
    
    // Pobierz wiadomości
    const messages = await Message.getConversation(profileId, otherProfileId);
    
    // Oznacz wiadomości od drugiego profilu jako przeczytane
    await Message.markConversationAsRead(otherProfileId, profileId);
    
    return res.status(200).json(messages);
    
  } catch (error) {
    console.error('Błąd podczas pobierania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd serwera', error: error.message });
  }
};

/**
 * Wysyła wiadomość od jednego profilu do drugiego
 */
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    
    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ message: 'Brakuje wymaganych danych (senderId, receiverId, content)' });
    }
    
    // Sprawdź, czy profile istnieją
    const sender = await Profile.findById(senderId);
    const receiver = await Profile.findById(receiverId);
    
    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Jeden lub oba profile nie zostały znalezione' });
    }
    
    // Sprawdź, czy istnieje dopasowanie między tymi profilami
    const isMatch = await Match.exists(senderId, receiverId);
    
    if (!isMatch) {
      return res.status(403).json({ message: 'Brak dopasowania między tymi profilami' });
    }
    
    // Utwórz i zapisz wiadomość
    const message = new Message(senderId, receiverId, content);
    const savedMessage = await message.save();
    
    return res.status(201).json(savedMessage);
    
  } catch (error) {
    console.error('Błąd podczas wysyłania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd serwera', error: error.message });
  }
};

/**
 * Oznacza wiadomości w konwersacji jako przeczytane
 */
const markAsRead = async (req, res) => {
  try {
    const { profileId, otherProfileId } = req.params;
    
    if (!profileId || !otherProfileId) {
      return res.status(400).json({ message: 'Brakuje ID profilu' });
    }
    
    // Oznacz wiadomości jako przeczytane
    await Message.markConversationAsRead(otherProfileId, profileId);
    
    return res.status(200).json({ message: 'Wiadomości oznaczone jako przeczytane' });
    
  } catch (error) {
    console.error('Błąd podczas oznaczania wiadomości jako przeczytane:', error);
    return res.status(500).json({ message: 'Wystąpił błąd serwera', error: error.message });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
}; 