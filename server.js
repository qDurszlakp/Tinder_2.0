const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = 3000;

// Konfiguracja MongoDB
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'tinderCloneDb';
let db;

// Używamy body-parsera do odczytywania danych JSON z ciała żądania
app.use(bodyParser.json());

// Asynchroniczna funkcja do połączenia z MongoDB
async function connectDB() {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log(`Połączono z bazą danych MongoDB: ${dbName}`);
  } catch (err) {
    console.error('Nie można połączyć z MongoDB:', err);
    process.exit(1);
  }
}

// Endpoint do tworzenia nowego profilu
app.post('/profile', async (req, res) => {
  const { name, age, gender, bio, interests, photoUrl } = req.body;

  if (!name || !age || !gender) {
    return res.status(400).json({ message: 'Imię, wiek i płeć są wymagane.' });
  }

  try {
    const profilesCollection = db.collection('profiles');
    
    const profileData = {
      name,
      age: parseInt(age),
      gender,
      bio: bio || '',
      interests: interests || [],
      photoUrl: photoUrl || '',
      likes: [],
      dislikes: [],
      createdAt: new Date()
    };

    const result = await profilesCollection.insertOne(profileData);
    console.log('Utworzono nowy profil:', name, 'ID:', result.insertedId);
    
    res.status(201).json({ 
      message: 'Profil został utworzony pomyślnie.',
      profileId: result.insertedId
    });
  } catch (err) {
    console.error('Błąd podczas tworzenia profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas tworzenia profilu.' });
  }
});

// Endpoint do pobierania profili do przeglądania
// Zwraca profile, które nie były wcześniej lubiane ani odrzucane przez profil o podanym ID
app.get('/profiles/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const { gender, minAge, maxAge, limit = 10 } = req.query;
  
  try {
    const profilesCollection = db.collection('profiles');
    
    // Pobierz profil użytkownika, aby sprawdzić jego polubienia i odrzucenia
    const userProfile = await profilesCollection.findOne({ _id: new ObjectId(profileId) });
    
    if (!userProfile) {
      return res.status(404).json({ message: 'Profil nie istnieje.' });
    }
    
    // Przygotowanie tablicy ID do wykluczenia (własne ID + polubione + odrzucone)
    const excludeIds = [
      new ObjectId(profileId),
      ...(userProfile.likes || []).map(id => typeof id === 'string' ? new ObjectId(id) : id),
      ...(userProfile.dislikes || []).map(id => typeof id === 'string' ? new ObjectId(id) : id)
    ];
    
    // Budowanie filtra zapytania
    const filter = {
      _id: { $nin: excludeIds } // Nie pokazuj własnego profilu ani profilów, które już ocenił
    };
    
    // Dodaj opcjonalne filtry
    if (gender) filter.gender = gender;
    if (minAge) filter.age = { $gte: parseInt(minAge) };
    if (maxAge) {
      if (filter.age) {
        filter.age.$lte = parseInt(maxAge);
      } else {
        filter.age = { $lte: parseInt(maxAge) };
      }
    }
    
    const profiles = await profilesCollection.find(filter)
      .limit(parseInt(limit))
      .toArray();
    
    res.status(200).json(profiles);
  } catch (err) {
    console.error('Błąd podczas pobierania profili:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania profili.' });
  }
});

// Endpoint do polubienia profilu
app.post('/like', async (req, res) => {
  const { profileId, likedProfileId } = req.body;
  
  if (!profileId || !likedProfileId) {
    return res.status(400).json({ message: 'ID profilu i ID lubianego profilu są wymagane.' });
  }
  
  try {
    const profilesCollection = db.collection('profiles');
    
    // Dodaj polubiony profil do tablicy likes
    await profilesCollection.updateOne(
      { _id: new ObjectId(profileId) },
      { $addToSet: { likes: new ObjectId(likedProfileId) } }
    );
    
    // Sprawdź, czy to dopasowanie (match)
    const likedProfile = await profilesCollection.findOne({ _id: new ObjectId(likedProfileId) });
    
    // Sprawdzamy czy polubiony profil również polubił ten profil
    const isMatch = likedProfile.likes && 
                    likedProfile.likes.some(id => id.toString() === profileId);
    
    // Jeśli tak, tworzymy nowy match w kolekcji matches
    if (isMatch) {
      const matchesCollection = db.collection('matches');
      
      await matchesCollection.insertOne({
        profiles: [new ObjectId(profileId), new ObjectId(likedProfileId)],
        createdAt: new Date()
      });
      
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
});

// Endpoint do odrzucenia profilu
app.post('/dislike', async (req, res) => {
  const { profileId, dislikedProfileId } = req.body;
  
  if (!profileId || !dislikedProfileId) {
    return res.status(400).json({ message: 'ID profilu i ID odrzucanego profilu są wymagane.' });
  }
  
  try {
    const profilesCollection = db.collection('profiles');
    
    // Dodaj odrzucony profil do tablicy dislikes
    await profilesCollection.updateOne(
      { _id: new ObjectId(profileId) },
      { $addToSet: { dislikes: new ObjectId(dislikedProfileId) } }
    );
    
    res.status(200).json({ message: 'Profil został odrzucony.' });
  } catch (err) {
    console.error('Błąd podczas odrzucania profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas odrzucania profilu.' });
  }
});

// Endpoint do pobierania dopasowań (matches)
app.get('/matches/:profileId', async (req, res) => {
  const { profileId } = req.params;
  
  try {
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
    
    res.status(200).json(matchedProfiles);
  } catch (err) {
    console.error('Błąd podczas pobierania dopasowań:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania dopasowań.' });
  }
});

// Endpoint do pobrania szczegółów pojedynczego profilu
app.get('/profile/:profileId', async (req, res) => {
  const { profileId } = req.params;
  
  try {
    const profilesCollection = db.collection('profiles');
    
    const profile = await profilesCollection.findOne({ _id: new ObjectId(profileId) });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profil nie istnieje.' });
    }
    
    res.status(200).json(profile);
  } catch (err) {
    console.error('Błąd podczas pobierania profilu:', err);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania profilu.' });
  }
});

// Uruchomienie serwera PO połączeniu z bazą danych
async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Serwer Tinder-Clone nasłuchuje na porcie ${port}`);
  });
}

startServer(); 