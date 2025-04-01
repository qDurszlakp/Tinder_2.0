const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

class Match {
  constructor(profiles) {
    this.profiles = profiles.map(id => new ObjectId(id));
    this.createdAt = new Date();
  }

  // Zapis dopasowania do bazy danych
  async save() {
    const db = getDb();
    const matchesCollection = db.collection('matches');
    const result = await matchesCollection.insertOne(this);
    return result;
  }

  // Utworzenie nowego dopasowania między dwoma profilami
  static async createMatch(profileId1, profileId2) {
    const match = new Match([profileId1, profileId2]);
    return await match.save();
  }

  // Pobieranie wszystkich dopasowań dla profilu
  static async findMatchesForProfile(profileId) {
    const db = getDb();
    const matchesCollection = db.collection('matches');
    const profilesCollection = db.collection('profiles');
    
    // Znajdź wszystkie dopasowania zawierające profil użytkownika
    const matches = await matchesCollection.find({
      profiles: { $in: [new ObjectId(profileId)] }
    }).toArray();
    
    // Pobierz szczegóły dopasowanych profili
    const matchedProfiles = [];
    
    for (const match of matches) {
      // Znajdź ID drugiego profilu w dopasowaniu
      const otherProfileId = match.profiles.find(
        id => id.toString() !== profileId
      );
      
      // Pobierz dane tego profilu
      const profile = await profilesCollection.findOne({ _id: otherProfileId });
      
      if (profile) {
        matchedProfiles.push({
          matchId: match._id,
          profile: {
            _id: profile._id,
            name: profile.name,
            age: profile.age,
            gender: profile.gender,
            bio: profile.bio,
            photoUrl: profile.photoUrl,
            matchDate: match.createdAt
          }
        });
      }
    }
    
    return matchedProfiles;
  }
}

module.exports = Match; 