const Profile = require('../models/Profile');

// Utworzenie nowego profilu
async function createProfile(req, res) {
  const { name, age, gender, bio, interests, photoUrl } = req.body;

  if (!name || !age || !gender) {
    return res.status(400).json({ message: 'Imię, wiek i płeć są wymagane.' });
  }

  try {
    const profile = new Profile(name, age, gender, bio, interests, photoUrl);
    const result = await profile.save();
    
    console.log('Utworzono nowy profil:', name, 'ID:', result.insertedId);
    
    res.status(201).json({ 
      message: 'Profil został utworzony pomyślnie.',
      profileId: result.insertedId
    });
  } catch (err) {
    console.error('Błąd podczas tworzenia profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas tworzenia profilu.' });
  }
}

// Pobieranie pojedynczego profilu
async function getProfile(req, res) {
  const { profileId } = req.params;
  
  try {
    const profile = await Profile.findById(profileId);
    
    if (!profile) {
      return res.status(404).json({ message: 'Profil nie istnieje.' });
    }
    
    res.status(200).json(profile);
  } catch (err) {
    console.error('Błąd podczas pobierania profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania profilu.' });
  }
}

// Pobieranie profili do przeglądania
async function getProfilesToSwipe(req, res) {
  const { profileId } = req.params;
  const { gender, minAge, maxAge, limit } = req.query;
  
  try {
    const profiles = await Profile.findProfilesToSwipe(profileId, { gender, minAge, maxAge, limit });
    res.status(200).json(profiles);
  } catch (err) {
    console.error('Błąd podczas pobierania profili:', err);
    
    if (err.message === 'Profil nie istnieje.') {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania profili.' });
  }
}

module.exports = {
  createProfile,
  getProfile,
  getProfilesToSwipe
}; 