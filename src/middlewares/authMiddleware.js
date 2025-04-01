const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Sekret do podpisywania tokenów JWT (ten sam co w authController)
const JWT_SECRET = 'tinder-clone-secret-key';

// Middleware do weryfikacji tokenu JWT
const requireAuth = async (req, res, next) => {
  try {
    // Sprawdź, czy token jest w nagłówku Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Dostęp zabroniony. Wymagane uwierzytelnienie.' });
    }
    
    // Wyciągnij token z nagłówka
    const token = authHeader.split(' ')[1];
    
    try {
      // Weryfikuj token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Znajdź użytkownika po ID
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'Użytkownik nie istnieje.' });
      }
      
      // Dodaj dane użytkownika do obiektu req
      req.user = {
        userId: user._id.toString(),
        email: user.email,
        profileId: user.profileId
      };
      
      // Przejdź do następnego middleware
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Nieprawidłowy token uwierzytelniający.' });
    }
  } catch (error) {
    console.error('Błąd w middleware uwierzytelniania:', error);
    return res.status(500).json({ message: 'Wystąpił błąd serwera.' });
  }
};

module.exports = { requireAuth }; 