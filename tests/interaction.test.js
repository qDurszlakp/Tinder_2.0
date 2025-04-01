const request = require('supertest');
const dbHandler = require('./db-handler');
const app = require('../server');
const Profile = require('../src/models/Profile');
const Match = require('../src/models/Match');
const User = require('../src/models/User');
const { ObjectId } = require('mongodb');

// Dane testowe użytkowników
const testUsers = [
  {
    email: 'anna@example.com',
    password: 'password1'
  },
  {
    email: 'tomasz@example.com',
    password: 'password2'
  }
];

// Dane testowe profili
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

// Zmienne globalne do przechowywania danych testowych
let annaToken, tomaszToken;
let annaUserId, tomaszUserId;
let annaProfileId, tomaszProfileId;

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

// Funkcja pomocnicza do tworzenia użytkownika, profilu i ich łączenia
async function createUserWithProfile(userIndex, profileIndex) {
  // Rejestracja użytkownika
  const registerResponse = await request(app)
    .post('/register')
    .send(testUsers[userIndex]);
  
  const token = registerResponse.body.token;
  const userId = registerResponse.body.userId;
  
  // Tworzenie profilu
  const createProfileResponse = await request(app)
    .post('/profile')
    .set('Authorization', `Bearer ${token}`)
    .send(testProfiles[profileIndex]);
  
  const profileId = createProfileResponse.body.profileId;
  
  // Łączenie profilu z użytkownikiem
  await request(app)
    .post('/link-profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      userId: userId,
      profileId: profileId
    });
  
  return { token, userId, profileId };
}

describe('Interakcje między profilami', () => {
  
  // Test polubienia profilu
  test('Powinien dodać polubienie profilu', async () => {
    // Tworzymy dwa profile z użytkownikami
    const anna = await createUserWithProfile(0, 0);
    const tomasz = await createUserWithProfile(1, 1);
    
    annaToken = anna.token;
    tomaszToken = tomasz.token;
    annaProfileId = anna.profileId;
    tomaszProfileId = tomasz.profileId;
    
    // Anna lubi Tomasza
    const likeResponse = await request(app)
      .post('/like')
      .set('Authorization', `Bearer ${annaToken}`)
      .send({
        profileId: annaProfileId,
        likedProfileId: tomaszProfileId
      })
      .expect(200);
    
    expect(likeResponse.body.message).toBe('Profil został polubiony.');
    expect(likeResponse.body.isMatch).toBe(false); // Jeszcze nie ma dopasowania
    
    // Sprawdzamy, czy polubienie zostało zapisane w bazie
    const annaProfile = await Profile.findById(annaProfileId);
    
    // Sprawdzamy czy ID zostało poprawnie skonwertowane i zapisane
    const hasLiked = annaProfile.likes.some(id => 
      id.toString() === tomaszProfileId || id === tomaszProfileId
    );
    expect(hasLiked).toBe(true);
  });
  
  // Test odrzucenia profilu
  test('Powinien dodać odrzucenie profilu', async () => {
    // Tworzymy dwa profile z użytkownikami
    const anna = await createUserWithProfile(0, 0);
    const tomasz = await createUserWithProfile(1, 1);
    
    annaToken = anna.token;
    tomaszToken = tomasz.token;
    annaProfileId = anna.profileId;
    tomaszProfileId = tomasz.profileId;
    
    // Anna odrzuca Tomasza
    const dislikeResponse = await request(app)
      .post('/dislike')
      .set('Authorization', `Bearer ${annaToken}`)
      .send({
        profileId: annaProfileId,
        dislikedProfileId: tomaszProfileId
      })
      .expect(200);
    
    expect(dislikeResponse.body.message).toBe('Profil został odrzucony.');
    
    // Sprawdzamy, czy odrzucenie zostało zapisane w bazie
    const annaProfile = await Profile.findById(annaProfileId);
    
    // Sprawdzamy czy ID zostało poprawnie skonwertowane i zapisane
    const hasDisliked = annaProfile.dislikes.some(id => 
      id.toString() === tomaszProfileId || id === tomaszProfileId
    );
    expect(hasDisliked).toBe(true);
  });
  
  // Test wykrywania dopasowania (match)
  test('Powinien wykryć dopasowanie gdy dwoje użytkowników wzajemnie się polubi', async () => {
    // Tworzymy dwa profile z użytkownikami
    const anna = await createUserWithProfile(0, 0);
    const tomasz = await createUserWithProfile(1, 1);
    
    annaToken = anna.token;
    tomaszToken = tomasz.token;
    annaProfileId = anna.profileId;
    tomaszProfileId = tomasz.profileId;
    
    // Anna lubi Tomasza
    await request(app)
      .post('/like')
      .set('Authorization', `Bearer ${annaToken}`)
      .send({
        profileId: annaProfileId,
        likedProfileId: tomaszProfileId
      });
    
    // Tomasz lubi Annę - powinno powstać dopasowanie
    const matchResponse = await request(app)
      .post('/like')
      .set('Authorization', `Bearer ${tomaszToken}`)
      .send({
        profileId: tomaszProfileId,
        likedProfileId: annaProfileId
      })
      .expect(200);
    
    expect(matchResponse.body.message).toBe('To dopasowanie! Profil został polubiony i dodany do dopasowań.');
    expect(matchResponse.body.isMatch).toBe(true);
  });
  
  // Test pobierania dopasowań
  test('Powinien zwrócić listę dopasowań dla profilu', async () => {
    // Tworzymy dwa profile z użytkownikami
    const anna = await createUserWithProfile(0, 0);
    const tomasz = await createUserWithProfile(1, 1);
    
    annaToken = anna.token;
    tomaszToken = tomasz.token;
    annaProfileId = anna.profileId;
    tomaszProfileId = tomasz.profileId;
    
    // Anna lubi Tomasza
    await request(app)
      .post('/like')
      .set('Authorization', `Bearer ${annaToken}`)
      .send({
        profileId: annaProfileId,
        likedProfileId: tomaszProfileId
      });
    
    // Tomasz lubi Annę - powstaje dopasowanie
    await request(app)
      .post('/like')
      .set('Authorization', `Bearer ${tomaszToken}`)
      .send({
        profileId: tomaszProfileId,
        likedProfileId: annaProfileId
      });
    
    // Pobieramy dopasowania Anny
    const matchesResponse = await request(app)
      .get(`/matches/${annaProfileId}`)
      .set('Authorization', `Bearer ${annaToken}`)
      .expect(200);
    
    expect(matchesResponse.body.length).toBe(1);
    expect(matchesResponse.body[0].profile.name).toBe(testProfiles[1].name);
    
    // Pobieramy dopasowania Tomasza
    const matchesResponse2 = await request(app)
      .get(`/matches/${tomaszProfileId}`)
      .set('Authorization', `Bearer ${tomaszToken}`)
      .expect(200);
    
    expect(matchesResponse2.body.length).toBe(1);
    expect(matchesResponse2.body[0].profile.name).toBe(testProfiles[0].name);
  });
  
  // Test filtrowania profili do przeglądania, z uwzględnieniem lajków i dislajków
  test('Powinien wykluczyć polubione i odrzucone profile z wyników wyszukiwania', async () => {
    // Tworzymy trzy profile z użytkownikami
    const anna = await createUserWithProfile(0, 0);
    const tomasz = await createUserWithProfile(1, 1);
    
    // Trzeci użytkownik - Michał
    const michalUser = {
      email: 'michal@example.com',
      password: 'password3'
    };
    
    const michalProfile = {
      name: 'Michał Test',
      age: 30,
      gender: 'M',
      bio: 'Profil testowy Michała'
    };
    
    const michalRegister = await request(app)
      .post('/register')
      .send(michalUser);
    
    const michalToken = michalRegister.body.token;
    
    const michalCreateProfile = await request(app)
      .post('/profile')
      .set('Authorization', `Bearer ${michalToken}`)
      .send(michalProfile);
    
    const michalProfileId = michalCreateProfile.body.profileId;
    
    // Łączenie profilu Michała z użytkownikiem
    await request(app)
      .post('/link-profile')
      .set('Authorization', `Bearer ${michalToken}`)
      .send({
        userId: michalRegister.body.userId,
        profileId: michalProfileId
      });
    
    annaToken = anna.token;
    annaProfileId = anna.profileId;
    tomaszProfileId = tomasz.profileId;
    
    // Anna lubi Tomasza
    await request(app)
      .post('/like')
      .set('Authorization', `Bearer ${annaToken}`)
      .send({
        profileId: annaProfileId,
        likedProfileId: tomaszProfileId
      });
    
    // Anna odrzuca Michała
    await request(app)
      .post('/dislike')
      .set('Authorization', `Bearer ${annaToken}`)
      .send({
        profileId: annaProfileId,
        dislikedProfileId: michalProfileId
      });
    
    // Pobieramy profile do przeglądania dla Anny
    const swipeResponse = await request(app)
      .get(`/profiles/${annaProfileId}`)
      .set('Authorization', `Bearer ${annaToken}`)
      .expect(200);
    
    // Nie powinniśmy otrzymać żadnego profilu (wszystkie zostały już ocenione)
    expect(swipeResponse.body.length).toBe(0);
  });
  
  // Test odmowy dostępu bez tokenu
  test('Powinien odmówić dostępu do interakcji bez tokenu', async () => {
    // Najpierw tworzymy profile z użytkownikami
    const anna = await createUserWithProfile(0, 0);
    const tomasz = await createUserWithProfile(1, 1);
    
    annaProfileId = anna.profileId;
    tomaszProfileId = tomasz.profileId;
    
    // Próba polubienia bez tokenu
    const response = await request(app)
      .post('/like')
      .send({
        profileId: annaProfileId,
        likedProfileId: tomaszProfileId
      })
      .expect(401);
    
    expect(response.body.message).toBeDefined();
    expect(response.body.message).toContain('Dostęp zabroniony');
  });
}); 