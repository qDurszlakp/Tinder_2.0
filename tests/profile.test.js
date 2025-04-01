const request = require('supertest');
const dbHandler = require('./db-handler');
const app = require('../server');
const Profile = require('../src/models/Profile');

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
  },
  {
    name: 'Karolina Test',
    age: 23,
    gender: 'K',
    bio: 'Profil testowy Karoliny',
    interests: ['muzyka', 'taniec']
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

describe('Operacje na profilach', () => {
  
  // Test tworzenia profilu
  test('Powinien utworzyć nowy profil', async () => {
    const response = await request(app)
      .post('/profile')
      .send(testProfiles[0])
      .expect(201);
    
    expect(response.body.message).toBe('Profil został utworzony pomyślnie.');
    expect(response.body.profileId).toBeDefined();
    
    // Sprawdzenie, czy profil faktycznie został zapisany w bazie
    const savedProfile = await Profile.findById(response.body.profileId);
    
    expect(savedProfile).toBeDefined();
    expect(savedProfile.name).toBe(testProfiles[0].name);
  });
  
  // Test pobierania profilu po ID
  test('Powinien pobrać profil po ID', async () => {
    // Najpierw tworzymy profil
    const createResponse = await request(app)
      .post('/profile')
      .send(testProfiles[0]);
    
    const profileId = createResponse.body.profileId;
    
    // Teraz pobieramy go po ID
    const getResponse = await request(app)
      .get(`/profile/${profileId}`)
      .expect(200);
    
    expect(getResponse.body.name).toBe(testProfiles[0].name);
    expect(getResponse.body.age).toBe(testProfiles[0].age);
    expect(getResponse.body.gender).toBe(testProfiles[0].gender);
  });
  
  // Test pobierania profili do przeglądania (swipe)
  test('Powinien zwrócić profile do przeglądania z wykluczeniem własnego', async () => {
    // Tworzymy trzy profile
    const profile1 = await request(app)
      .post('/profile')
      .send(testProfiles[0]);
    
    const profile2 = await request(app)
      .post('/profile')
      .send(testProfiles[1]);
    
    const profile3 = await request(app)
      .post('/profile')
      .send(testProfiles[2]);
    
    // Pobieramy profile do przeglądania dla pierwszego profilu
    const response = await request(app)
      .get(`/profiles/${profile1.body.profileId}`)
      .expect(200);
    
    // Powinniśmy otrzymać dwa pozostałe profile, bez profilu pierwszego
    expect(response.body.length).toBe(2);
    
    // Sprawdzamy, czy nie ma wśród nich profilu pierwszego
    const profileIds = response.body.map(profile => profile._id.toString());
    expect(profileIds).not.toContain(profile1.body.profileId);
    
    // Sprawdzamy, czy wśród nich są profile drugi i trzeci
    expect(profileIds).toContain(profile2.body.profileId);
    expect(profileIds).toContain(profile3.body.profileId);
  });

  // Test walidacji przy tworzeniu profilu
  test('Powinien zwrócić błąd przy niepełnych danych profilu', async () => {
    const incompleteProfile = {
      name: 'Niepełny Profil'
      // Brak age i gender, które są wymagane
    };
    
    const response = await request(app)
      .post('/profile')
      .send(incompleteProfile)
      .expect(400);
    
    expect(response.body.message).toBe('Imię, wiek i płeć są wymagane.');
  });
}); 