const Profile = require('../models/Profile');
const Match = require('../models/Match');

// Polubienie profilu
async function likeProfile(req, res) {
  const { profileId, likedProfileId } = req.body;
  
  if (!profileId || !likedProfileId) {
    return res.status(400).json({ message: 'ID profilu i ID lubianego profilu są wymagane.' });
  }
  
  try {
    const { isMatch, likedProfile } = await Profile.addLike(profileId, likedProfileId);
    
    // Jeśli jest dopasowanie, utwórz nowy match
    if (isMatch) {
      await Match.createMatch(profileId, likedProfileId);
      
      return res.status(200).json({ 
        message: 'To dopasowanie! Profil został polubiony i dodany do dopasowań.',
        isMatch: true
      });
    }
    
    res.status(200).json({ 
      message: 'Profil został polubiony.',
      isMatch: false
    });
  } catch (err) {
    console.error('Błąd podczas polubienia profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas polubienia profilu.' });
  }
}

// Odrzucenie profilu
async function dislikeProfile(req, res) {
  const { profileId, dislikedProfileId } = req.body;
  
  if (!profileId || !dislikedProfileId) {
    return res.status(400).json({ message: 'ID profilu i ID odrzucanego profilu są wymagane.' });
  }
  
  try {
    await Profile.addDislike(profileId, dislikedProfileId);
    res.status(200).json({ message: 'Profil został odrzucony.' });
  } catch (err) {
    console.error('Błąd podczas odrzucania profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas odrzucania profilu.' });
  }
}

// Pobieranie dopasowań dla profilu
async function getMatches(req, res) {
  const { profileId } = req.params;
  
  try {
    const matches = await Match.findMatchesForProfile(profileId);
    res.status(200).json(matches);
  } catch (err) {
    console.error('Błąd podczas pobierania dopasowań:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania dopasowań.' });
  }
}

module.exports = {
  likeProfile,
  dislikeProfile,
  getMatches
}; 