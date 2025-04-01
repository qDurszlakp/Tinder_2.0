const request = require('supertest');
const dbHandler = require('./db-handler');
const app = require('../server');
const Profile = require('../src/models/Profile');
const Match = require('../src/models/Match');
const { ObjectId } = require('mongodb');

// Dane testowe
const testProfiles = [
  {
    name: 'Anna Test',
    age: 25,
    gender: 'K',
    bio: 'Profil testowy Anny',
    interests: ['testy', 'czytanie']
  },
  {
    name: 'Tomasz Test',
    age: 28,
    gender: 'M',
    bio: 'Profil testowy Tomasza',
    interests: ['sport', 'programowanie']
  }
];

// Konfiguracja przed wszystkimi testami
beforeAll(async () => {
  await dbHandler.connect();
});

// Czyszczenie bazy po każdym teście
afterEach(async () => {
  await dbHandler.clearDatabase();
});

// Zamknięcie bazy po wszystkich testach
afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe('Interakcje między profilami', () => {
  
  // Test polubienia profilu
  test('Powinien dodać polubienie profilu', async () => {
    // Tworzymy dwa profile
    const profile1 = await request(app)
      .post('/profile')
      .send(testProfiles[0]);
    
    const profile2 = await request(app)
      .post('/profile')
      .send(testProfiles[1]);
    
    const profile1Id = profile1.body.profileId;
    const profile2Id = profile2.body.profileId;
    
    // Anna lubi Tomasza
    const likeResponse = await request(app)
      .post('/like')
      .send({
        profileId: profile1Id,
        likedProfileId: profile2Id
      })
      .expect(200);
    
    expect(likeResponse.body.message).toBe('Profil został polubiony.');
    expect(likeResponse.body.isMatch).toBe(false); // Jeszcze nie ma dopasowania
    
    // Sprawdzamy, czy polubienie zostało zapisane w bazie
    const annaProfile = await Profile.findById(profile1Id);
    
    // Sprawdzamy czy ID zostało poprawnie skonwertowane i zapisane
    const hasLiked = annaProfile.likes.some(id => 
      id.toString() === profile2Id || id === profile2Id
    );
    expect(hasLiked).toBe(true);
  });
  
  // Test odrzucenia profilu
  test('Powinien dodać odrzucenie profilu', async () => {
    // Tworzymy dwa profile
    const profile1 = await request(app)
      .post('/profile')
      .send(testProfiles[0]);
    
    const profile2 = await request(app)
      .post('/profile')
      .send(testProfiles[1]);
    
    const profile1Id = profile1.body.profileId;
    const profile2Id = profile2.body.profileId;
    
    // Anna odrzuca Tomasza
    const dislikeResponse = await request(app)
      .post('/dislike')
      .send({
        profileId: profile1Id,
        dislikedProfileId: profile2Id
      })
      .expect(200);
    
    expect(dislikeResponse.body.message).toBe('Profil został odrzucony.');
    
    // Sprawdzamy, czy odrzucenie zostało zapisane w bazie
    const annaProfile = await Profile.findById(profile1Id);
    
    // Sprawdzamy czy ID zostało poprawnie skonwertowane i zapisane
    const hasDisliked = annaProfile.dislikes.some(id => 
      id.toString() === profile2Id || id === profile2Id
    );
    expect(hasDisliked).toBe(true);
  });
  
  // Test wykrywania dopasowania (match)
  test('Powinien wykryć dopasowanie gdy dwoje użytkowników wzajemnie się polubi', async () => {
    // Tworzymy dwa profile
    const profile1 = await request(app)
      .post('/profile')
      .send(testProfiles[0]);
    
    const profile2 = await request(app)
      .post('/profile')
      .send(testProfiles[1]);
    
    const profile1Id = profile1.body.profileId;
    const profile2Id = profile2.body.profileId;
    
    // Anna lubi Tomasza
    await request(app)
      .post('/like')
      .send({
        profileId: profile1Id,
        likedProfileId: profile2Id
      });
    
    // Tomasz lubi Annę - powinno powstać dopasowanie
    const matchResponse = await request(app)
      .post('/like')
      .send({
        profileId: profile2Id,
        likedProfileId: profile1Id
      })
      .expect(200);
    
    expect(matchResponse.body.message).toBe('To dopasowanie! Profil został polubiony i dodany do dopasowań.');
    expect(matchResponse.body.isMatch).toBe(true);
  });
  
  // Test pobierania dopasowań
  test('Powinien zwrócić listę dopasowań dla profilu', async () => {
    // Tworzymy dwa profile
    const profile1 = await request(app)
      .post('/profile')
      .send(testProfiles[0]);
    
    const profile2 = await request(app)
      .post('/profile')
      .send(testProfiles[1]);
    
    const profile1Id = profile1.body.profileId;
    const profile2Id = profile2.body.profileId;
    
    // Anna lubi Tomasza
    await request(app)
      .post('/like')
      .send({
        profileId: profile1Id,
        likedProfileId: profile2Id
      });
    
    // Tomasz lubi Annę - powstaje dopasowanie
    await request(app)
      .post('/like')
      .send({
        profileId: profile2Id,
        likedProfileId: profile1Id
      });
    
    // Pobieramy dopasowania Anny
    const matchesResponse = await request(app)
      .get(`/matches/${profile1Id}`)
      .expect(200);
    
    expect(matchesResponse.body.length).toBe(1);
    expect(matchesResponse.body[0].profile.name).toBe(testProfiles[1].name);
    
    // Pobieramy dopasowania Tomasza
    const matchesResponse2 = await request(app)
      .get(`/matches/${profile2Id}`)
      .expect(200);
    
    expect(matchesResponse2.body.length).toBe(1);
    expect(matchesResponse2.body[0].profile.name).toBe(testProfiles[0].name);
  });
  
  // Test filtrowania profili do przeglądania, z uwzględnieniem lajków i dislajków
  test('Powinien wykluczyć polubione i odrzucone profile z wyników wyszukiwania', async () => {
    // Tworzymy trzy profile
    const profile1 = await request(app)
      .post('/profile')
      .send(testProfiles[0]); // Anna
    
    const profile2 = await request(app)
      .post('/profile')
      .send(testProfiles[1]); // Tomasz
    
    const profile3 = await request(app)
      .post('/profile')
      .send({
        name: 'Michał Test',
        age: 30,
        gender: 'M',
        bio: 'Profil testowy Michała'
      }); // Michał
    
    const profile1Id = profile1.body.profileId;
    const profile2Id = profile2.body.profileId;
    const profile3Id = profile3.body.profileId;
    
    // Anna lubi Tomasza
    await request(app)
      .post('/like')
      .send({
        profileId: profile1Id,
        likedProfileId: profile2Id
      });
    
    // Anna odrzuca Michała
    await request(app)
      .post('/dislike')
      .send({
        profileId: profile1Id,
        dislikedProfileId: profile3Id
      });
    
    // Pobieramy profile do przeglądania dla Anny
    const swipeResponse = await request(app)
      .get(`/profiles/${profile1Id}`)
      .expect(200);
    
    // Nie powinniśmy otrzymać żadnego profilu (wszystkie zostały już ocenione)
    expect(swipeResponse.body.length).toBe(0);
  });
}); 