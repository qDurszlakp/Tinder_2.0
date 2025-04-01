const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

class Profile {
  constructor(name, age, gender, bio, interests, photoUrl) {
    this.name = name;
    this.age = parseInt(age);
    this.gender = gender;
    this.bio = bio || '';
    this.interests = interests || [];
    this.photoUrl = photoUrl || '';
    this.likes = [];
    this.dislikes = [];
    this.createdAt = new Date();
  }

  // Zapis profilu do bazy danych
  async save() {
    const db = getDb();
    const profilesCollection = db.collection('profiles');
    const result = await profilesCollection.insertOne(this);
    return result;
  }

  // Pobieranie wszystkich profili do przejrzenia (z uwzględnieniem filtrów)
  static async findProfilesToSwipe(profileId, filters = {}) {
    const db = getDb();
    const profilesCollection = db.collection('profiles');
    
    // Pobieranie profilu użytkownika
    const userProfile = await profilesCollection.findOne({ _id: new ObjectId(profileId) });
    
    if (!userProfile) {
      throw new Error('Profil nie istnieje.');
    }
    
    // Przygotowanie tablicy ID do wykluczenia (własne ID + polubione + odrzucone)
    const excludeIds = [
      new ObjectId(profileId),
      ...(userProfile.likes || []).map(id => typeof id === 'string' ? new ObjectId(id) : id),
      ...(userProfile.dislikes || []).map(id => typeof id === 'string' ? new ObjectId(id) : id)
    ];
    
    // Budowanie filtra zapytania
    const queryFilter = {
      _id: { $nin: excludeIds }
    };
    
    // Dodanie opcjonalnych filtrów
    if (filters.gender) queryFilter.gender = filters.gender;
    if (filters.minAge) queryFilter.age = { $gte: parseInt(filters.minAge) };
    if (filters.maxAge) {
      if (queryFilter.age) {
        queryFilter.age.$lte = parseInt(filters.maxAge);
      } else {
        queryFilter.age = { $lte: parseInt(filters.maxAge) };
      }
    }
    
    // Wykonanie zapytania z limitem
    return await profilesCollection.find(queryFilter)
      .limit(parseInt(filters.limit || 10))
      .toArray();
  }

  // Pobieranie profilu po ID
  static async findById(profileId) {
    const db = getDb();
    const profilesCollection = db.collection('profiles');
    return await profilesCollection.findOne({ _id: new ObjectId(profileId) });
  }

  // Dodanie polubienia
  static async addLike(profileId, likedProfileId) {
    const db = getDb();
    const profilesCollection = db.collection('profiles');
    
    // Dodanie polubionego profilu do tablicy likes
    await profilesCollection.updateOne(
      { _id: new ObjectId(profileId) },
      { $addToSet: { likes: new ObjectId(likedProfileId) } }
    );
    
    // Sprawdzenie, czy to dopasowanie
    const likedProfile = await profilesCollection.findOne({ _id: new ObjectId(likedProfileId) });
    
    // Sprawdzamy czy polubiony profil również polubił ten profil
    const isMatch = likedProfile.likes && 
                    likedProfile.likes.some(id => id.toString() === profileId);
    
    return { isMatch, likedProfile };
  }

  // Dodanie odrzucenia
  static async addDislike(profileId, dislikedProfileId) {
    const db = getDb();
    const profilesCollection = db.collection('profiles');
    
    // Dodanie odrzuconego profilu do tablicy dislikes
    await profilesCollection.updateOne(
      { _id: new ObjectId(profileId) },
      { $addToSet: { dislikes: new ObjectId(dislikedProfileId) } }
    );
  }
}

module.exports = Profile; 