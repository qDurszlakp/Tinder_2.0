const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Sekret do podpisywania tokenów JWT
const JWT_SECRET = 'tinder-clone-secret-key';  // W produkcji powinien być w zmiennych środowiskowych

// Rejestracja użytkownika
async function register(req, res) {
  try {
    const { email, password } = req.body;

    // Sprawdź, czy wszystkie wymagane pola są obecne
    if (!email || !password) {
      return res.status(400).json({ message: 'Podaj email i hasło' });
    }

    // Sprawdź, czy użytkownik o podanym emailu już istnieje
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Użytkownik o podanym adresie email już istnieje' });
    }

    // Utwórz nowego użytkownika
    const user = new User(email, password);
    const result = await user.save();

    // Wygeneruj token JWT
    const token = jwt.sign(
      { userId: result.insertedId.toString() }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Zwróć odpowiedź z tokenem
    res.status(201).json({
      message: 'Konto zostało utworzone pomyślnie',
      token,
      userId: result.insertedId
    });
  } catch (err) {
    console.error('Błąd podczas rejestracji:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas rejestracji.' });
  }
}

// Logowanie użytkownika
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Sprawdź, czy wszystkie wymagane pola są obecne
    if (!email || !password) {
      return res.status(400).json({ message: 'Podaj email i hasło' });
    }

    // Znajdź użytkownika
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
    }

    // Sprawdź hasło
    const isValidPassword = User.verifyPassword(
      password, 
      user.password.salt, 
      user.password.hash
    );

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
    }

    // Wygeneruj token JWT
    const token = jwt.sign(
      { userId: user._id.toString() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Zwróć odpowiedź z tokenem
    res.status(200).json({
      message: 'Zalogowano pomyślnie',
      token,
      userId: user._id,
      profileId: user.profileId
    });
  } catch (err) {
    console.error('Błąd podczas logowania:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas logowania.' });
  }
}

// Aktualizacja powiązania użytkownika z profilem
async function linkProfile(req, res) {
  try {
    const { userId, profileId } = req.body;

    // Sprawdź, czy wszystkie wymagane pola są obecne
    if (!userId || !profileId) {
      return res.status(400).json({ message: 'Podaj ID użytkownika i ID profilu' });
    }

    // Zaktualizuj użytkownika
    await User.linkProfile(userId, profileId);

    res.status(200).json({ message: 'Profil został powiązany z kontem użytkownika' });
  } catch (err) {
    console.error('Błąd podczas łączenia profilu z użytkownikiem:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas aktualizacji konta.' });
  }
}

// Sprawdzenie aktualnego tokenu
async function verifyToken(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Brak tokenu uwierzytelniającego' });
    }

    // Weryfikacja tokenu
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Nieprawidłowy token' });
    }

    res.status(200).json({
      userId: user._id,
      profileId: user.profileId,
      email: user.email
    });
  } catch (err) {
    console.error('Błąd podczas weryfikacji tokenu:', err);
    res.status(401).json({ message: 'Nieprawidłowy token uwierzytelniający' });
  }
}

module.exports = {
  register,
  login,
  linkProfile,
  verifyToken
}; 